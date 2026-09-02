# -*- coding: utf-8 -*-
"""Extrator de detalhe dos portais do grupo OLX (zapimoveis.com.br,
vivareal.com.br).

Anatomia verificada (raw/, 2026-07-29, ZAP):
- JSON-LD Product: sku, offers.price (numérico), offers.url, description
  (contém a metragem, ex. "432m²"), name "Imóvel em {Bairro}, Uberlândia - MG"
- JSON-LD BreadcrumbList: penúltimo = bairro, último pode ser a rua
- JSON-LD Organization: description "... Entre em contato com {Anunciante}!"
- Estado embutido (escapado): "phoneNumbers":["3432395000"] do anunciante
- Slug da URL: ...-{bairro}-...-{NNNN}m2-id-{sku}: metragem declarada
Regra: área vem da descrição (parse_area, excluindo construída/privativa);
crosscheck com a metragem do slug; conflito -> descarte.
"""
import glob
import html as hm
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parsers import parse_area

RE_LD = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)


def extrai(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    dom = path.split(os.sep)[1].replace('www.', '')
    meta = {}
    mp = path[:-5] + '.meta.json'
    if os.path.exists(mp):
        meta = json.load(open(mp, encoding='utf-8'))
    out = {"arquivo": path, "origem": dom, "erros": [], "descartar": None}

    prod, org, crumbs = None, None, []
    for b in RE_LD.findall(raw):
        try:
            d = json.loads(b, strict=False)
        except Exception:
            continue
        if isinstance(d, dict):
            t = d.get('@type')
            if t == 'Product':
                prod = d
            elif t == 'Organization':
                org = d
            elif t == 'BreadcrumbList':
                crumbs = [i.get('item', {}).get('name') for i in d.get('itemListElement', [])]

    if not prod:
        out["descartar"] = "sem JSON-LD Product na pagina"
        out["url_fonte"] = meta.get("url")
        return out

    off = prod.get('offers') or {}
    out["url_fonte"] = off.get('url') or (meta.get('url') or '').split('?')[0]
    p = off.get('price')
    try:
        out["valor_anunciado"] = float(p) if p not in (None, '') else None
    except (TypeError, ValueError):
        out["valor_anunciado"] = None
        out["erros"].append(f"price nao numerico: {p!r}")
    out["codigo_anuncio"] = prod.get('sku')
    out["titulo"] = prod.get('name') or ''
    desc = prod.get('description') or ''
    out["descricao"] = desc[:800]

    # bairro: name "Imóvel em {Bairro}, Uberlândia - MG"; fallback breadcrumb
    mb = re.search(r'em (.+?), Uberl[âa]ndia', out["titulo"])
    out["bairro"] = mb.group(1).strip() if mb else None
    if not out["bairro"] and len(crumbs) >= 5:
        out["bairro"] = crumbs[4]
    # rua (se o breadcrumb tiver nível 6)
    if len(crumbs) >= 6 and crumbs[5] and not crumbs[5].startswith('Terrenos'):
        out["endereco"] = crumbs[5]

    # área: descrição (excluindo construída/privativa/útil) + crosscheck slug
    slug_m2 = None
    ms = re.search(r'-(\d+)m2-id-', (out["url_fonte"] or '') + path)
    if ms:
        slug_m2 = float(ms.group(1))
    cands = []
    for a in parse_area(desc):
        if a.get('m2') is None:
            continue
        i = desc.find(a['literal'])
        ctx = desc[max(0, i - 60): i + len(a['literal']) + 60].lower()
        if re.search(r'constru[íi]d|privativ|[úu]til', ctx):
            continue
        cands.append(a)
    vals = sorted({c['m2'] for c in cands})
    if len(vals) == 1:
        out["area_total_m2"] = vals[0]
        out["trecho_area"] = cands[0]['literal']
        if slug_m2 and abs(vals[0] - slug_m2) > 0.02 * max(vals[0], slug_m2):
            out["descartar"] = (f"area da descricao ({vals[0]}) diverge da declarada "
                                f"no titulo/URL ({slug_m2})")
        if cands[0].get('aproximado'):
            out["area_aproximada"] = True
        if cands[0].get('conversao'):
            out["erros"].append(f"conversao: {cands[0]['conversao']}")
    elif len(vals) > 1:
        # se uma delas bate com o slug, é a declarada pelo anunciante
        casadas = [v for v in vals if slug_m2 and abs(v - slug_m2) <= 0.02 * max(v, slug_m2)]
        if len(casadas) == 1:
            out["area_total_m2"] = casadas[0]
            out["trecho_area"] = next(c['literal'] for c in cands if c['m2'] == casadas[0])
            out["erros"].append(f"descricao com varias metragens {vals}; usada a que bate com o titulo/URL do anuncio")
        else:
            out["descartar"] = f"metragens multiplas na descricao sem ancora: {vals}"
    elif slug_m2:
        out["area_total_m2"] = slug_m2
        out["trecho_area"] = f"{ms.group(1)}m2 (titulo/URL do anuncio)"
        out["erros"].append("area extraida do titulo/URL do anuncio (descricao sem metragem)")
    else:
        out["area_total_m2"] = None

    # valor literal visível
    if out["valor_anunciado"] is not None:
        v = out["valor_anunciado"]
        br_full = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        br_short = br_full[:-3] if br_full.endswith(",00") else br_full
        out["trecho_valor"] = next((c for c in (f"R$ {br_full}", f"R$ {br_short}")
                                    if c in hm.unescape(raw)), None)
        if not out["trecho_valor"]:
            out["erros"].append(f"valor {v} sem literal R$ na pagina")

    # anunciante: Organization LD "Entre em contato com X!"
    modesc = (org or {}).get('description') or ''
    ma = re.search(r'[Cc]ontato com (.+?)!', modesc)
    if ma:
        out["empresa"] = ma.group(1).strip()
    # telefone do anunciante no estado embutido
    mf = re.search(r'phoneNumbers\\?":\s*\[\\?"(\d{10,11})', raw)
    if mf:
        d = mf.group(1)
        out["telefone"] = f"({d[:2]}) {d[2:-4]}-{d[-4:]}"
        out["obs_extra"] = "telefone exibido no anuncio via botao 'ver telefone'"

    slug = (out["url_fonte"] or '').lower()
    out["tipo_anuncio"] = 'terreno' if 'terreno' in slug else None
    escopo = (out["titulo"] + ' ' + desc + ' ' + (out["bairro"] or '')).lower()
    if re.search(r'zona rural|[áa]rea rural', escopo):
        out["alerta_rural"] = True
    if re.search(r'\bch[áa]cara\b|\bs[íi]tio\b|\bfazenda\b|\brancho\b',
                 (out["titulo"] or '').lower()):
        out["tipo_anuncio"] = 'chacara'

    out["data_coleta"] = (meta.get("fetched_at") or "")[:10]
    return out


if __name__ == "__main__":
    for pat in sys.argv[1:]:
        for f in sorted(glob.glob(pat)):
            print(json.dumps(extrai(f), ensure_ascii=False))
