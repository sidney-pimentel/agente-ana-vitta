# -*- coding: utf-8 -*-
"""Extrator de detalhe da plataforma Praedium (guinzaimoveis.com.br,
eliteimobiliaria.com, wenderbernardesimoveis.com.br).

Anatomia verificada (raw/, 2026-07-29):
- JSON-LD ["Product","Place"]: offers.price (numérico), offers.url,
  description, address.streetAddress ("Bairro, Uberlândia-MG")
- Ícone principal: "4.000,00 m² área total" (formato BR)
- RealEstateAgent JSON-LD: telephone institucional; link wa.me no corpo
- Código: id-N no fim da URL
"""
import glob
import html as hm
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parsers import br_number

RE_LD = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)


def extrai(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    uh = hm.unescape(raw)
    dom = path.split(os.sep)[1].replace('www.', '')
    meta = {}
    mp = path[:-5] + '.meta.json'
    if os.path.exists(mp):
        meta = json.load(open(mp, encoding='utf-8'))
    out = {"arquivo": path, "origem": dom, "erros": [], "descartar": None}

    prod, agente = None, None
    for b in RE_LD.findall(raw):
        try:
            d = json.loads(b, strict=False)
        except Exception:
            continue
        if isinstance(d, dict):
            t = d.get('@type')
            if t and 'Product' in t:
                prod = d
            elif t == 'RealEstateAgent':
                agente = d

    if not prod:
        out["descartar"] = "sem JSON-LD Product na pagina"
        out["url_fonte"] = meta.get("url")
        return out

    off = prod.get('offers') or {}
    out["url_fonte"] = off.get('url') or meta.get('url')
    p = off.get('price')
    out["valor_anunciado"] = float(p) if isinstance(p, (int, float)) else None
    if out["valor_anunciado"] is None and p:
        try:
            out["valor_anunciado"] = float(str(p).replace(',', ''))
        except ValueError:
            out["erros"].append(f"price nao numerico: {p!r}")
    out["titulo"] = prod.get('name') or ''
    mc = re.search(r'id-(\d+)/?$', out["url_fonte"] or '')
    out["codigo_anuncio"] = mc.group(1) if mc else None

    end = (prod.get('address') or {}).get('streetAddress') or ''
    out["bairro"] = re.sub(r',?\s*Uberl[âa]ndia.*$', '', end).strip() or None

    # área: ícone "N.NNN,NN m² área total"
    vals = []
    for m in re.finditer(r'([\d.,]+)\s*m²\s*(área total|terreno|área útil|área construída|área privativa)', uh, re.I):
        v, err = br_number(m.group(1))
        vals.append((v, m.group(2).lower(), m.group(0)))
        if err:
            out["erros"].append(err)
    total = sorted({v for v, r, _ in vals if v is not None and r in ('área total', 'terreno')})
    out["areas_vistas"] = [(v, r) for v, r, _ in vals]
    if len(total) == 1:
        out["area_total_m2"] = total[0]
        out["trecho_area"] = next(l for v, r, l in vals if v == total[0])
    elif len(total) > 1:
        out["area_total_m2"] = None
        out["descartar"] = f"metragens de area total distintas: {total}"
    else:
        out["area_total_m2"] = None

    desc = (prod.get('description') or '')[:800]
    out["descricao"] = desc
    out["area_aproximada"] = bool(re.search(r'aproximad|cerca de|em torno de', desc, re.I))

    # valor literal visível (título do anúncio traz "por R$ N.NNN.NNN")
    if out["valor_anunciado"] is not None:
        v = out["valor_anunciado"]
        br_full = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        br_short = br_full[:-3] if br_full.endswith(",00") else br_full
        out["trecho_valor"] = None
        for cand in (f"R$ {br_full}", f"R$ {br_short}"):
            if cand in uh:
                out["trecho_valor"] = cand
                break
        if not out["trecho_valor"]:
            out["erros"].append(f"valor {v} sem literal R$ na pagina")

    fones = []
    tel = ((agente or {}).get('address') or {}).get('telephone') or (agente or {}).get('telephone')
    if tel:
        d = re.sub(r'\D', '', tel)
        if len(d) in (10, 11):
            fones.append(f"({d[:2]}) {d[2:-4]}-{d[-4:]}")
    for m in re.finditer(r'wa\.me/55(\d{2})(\d{4,5})(\d{4})', raw):
        f2 = f"({m.group(1)}) {m.group(2)}-{m.group(3)}"
        if f2 not in fones:
            fones.append(f2)
    out["telefone"] = " | ".join(fones) if fones else None

    mcr = re.search(r'CRECI[\s\-:]*J?[\s\-:]*([\d.]{4,10})', uh, re.I)
    out["creci"] = mcr.group(1) if mcr else None

    slug = (out["url_fonte"] or '').lower()
    out["tipo_anuncio"] = ('área' if '/imovel/area-' in slug
                           else 'terreno' if 'terreno' in slug else None)
    escopo = (out["titulo"] + ' ' + desc + ' ' + (out["bairro"] or '')).lower()
    if re.search(r'zona rural|[áa]rea rural|\bch[áa]cara\b|\bs[íi]tio\b|\bfazenda\b|\brancho\b', escopo):
        # chácara/sítio/fazenda aqui é o TEXTO do anúncio (não nome de bairro
        # oficial); marca para exclusão de escopo
        if re.search(r'zona rural|[áa]rea rural', escopo):
            out["alerta_rural"] = True
        if re.search(r'\bch[áa]cara\b|\bs[íi]tio\b|\bfazenda\b|\brancho\b', (out["titulo"] or '').lower()):
            out["tipo_anuncio"] = 'chacara'

    out["data_coleta"] = (meta.get("fetched_at") or "")[:10]
    return out


if __name__ == "__main__":
    for pat in sys.argv[1:]:
        for f in sorted(glob.glob(pat)):
            print(json.dumps(extrai(f), ensure_ascii=False))
