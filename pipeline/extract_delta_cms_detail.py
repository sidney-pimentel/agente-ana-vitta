# -*- coding: utf-8 -*-
"""Extrator de página de DETALHE do CMS usado por deltaimoveis.com.br e
ivannegocios.com.br. Um dict por página; campo ausente = None.

Anatomia verificada (raw/ em 2026-07-29):
- JSON-LD Product: sku, offers.price (EN), offers.url
- Ícones do imóvel PRINCIPAL: <strong class="fw-bold">1203.80 m²</strong>
  seguido do rótulo "A. Terreno" / "A. Total" (cards relacionados usam
  outra classe: imo-dad-compl-item-qntd — não colidem)
- Descrição principal: <p class="descricao-imovel">
- Corretor: bloco após "CORRETOR RESPONSÁVEL" (buscar em HTML decodificado)
- Telefones (só Ivan expõe): rodapé "Matriz (34) ..." e link
  api.whatsapp.com/send?phone=...
"""
import glob
import html as hm
import json
import os
import re
import sys

RE_LD = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)
RE_ICON = re.compile(r'<strong class="fw-bold">([\d.,]+)\s*m²</strong>\s*</div>\s*</div>\s*([^<]{0,40})', re.S)


def num_en(tok):
    """'1203.80' | '40,800.00' -> float; ambíguo -> None."""
    t = tok.strip()
    if re.fullmatch(r'\d{1,3}(,\d{3})+(\.\d+)?', t):
        return float(t.replace(',', ''))
    if re.fullmatch(r'\d+(\.\d+)?', t):
        return float(t)
    return None


def extrai(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    uh = hm.unescape(raw)
    texto = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ',
                   re.sub(r'<script.*?</script>', ' ', uh, flags=re.S)))
    dom = path.split(os.sep)[1].replace('www.', '')
    meta = {}
    mp = path[:-5] + '.meta.json'
    if os.path.exists(mp):
        meta = json.load(open(mp, encoding='utf-8'))

    out = {"arquivo": path, "origem": dom, "erros": [], "descartar": None}

    ld = None
    for b in RE_LD.findall(raw):
        try:
            d = json.loads(b, strict=False)
            if isinstance(d, dict) and d.get("@type") == "Product":
                ld = d
                break
        except Exception:
            continue
    if ld:
        out["codigo_anuncio"] = ld.get("sku")
        off = ld.get("offers") or {}
        out["url_fonte"] = off.get("url") or meta.get("url")
        try:
            out["valor_anunciado"] = float(off.get("price")) if off.get("price") else None
        except (TypeError, ValueError):
            out["valor_anunciado"] = None
            out["erros"].append(f"price ld nao numerico: {off.get('price')!r}")
    else:
        m = re.search(r'og:url"[^>]*content="([^"]+)"', raw)
        out["url_fonte"] = (m.group(1) if m else None) or meta.get("url")
        out["erros"].append("sem JSON-LD Product")

    mt = re.search(r'<title>(.*?)</title>', uh, re.S)
    out["titulo"] = re.sub(r'\s+', ' ', mt.group(1)).strip() if mt else ""
    mb = re.search(r'no bairro (.+?)(?: em Uberl|$)', out["titulo"])
    out["bairro"] = mb.group(1).strip() if mb else None
    if not out["bairro"] and out.get("url_fonte"):
        ms = re.search(r'/comprar/Uberlandia/[^/]+/[^/]+/([^/]+)/\d+', out["url_fonte"])
        if ms:
            out["bairro"] = ms.group(1).replace('-', ' ')

    # ícones do imóvel principal
    areas = []
    for m in RE_ICON.finditer(uh):
        val = num_en(m.group(1))
        rot = m.group(2).strip().lower()
        areas.append((val, rot, m.group(0)[:60]))
        if val is None:
            out["erros"].append(f"area icone ambigua: {m.group(1)!r}")
    out["areas_vistas"] = [(a, r) for a, r, _ in areas]
    terreno = sorted({a for a, r, _ in areas if a is not None and 'terreno' in r})
    total = sorted({a for a, r, _ in areas if a is not None and 'total' in r})
    area = None
    if len(terreno) == 1:
        area = terreno[0]
    elif len(terreno) > 1:
        out["descartar"] = f"duas metragens de terreno distintas: {terreno}"
    elif len(total) == 1:
        area = total[0]
    elif len(total) > 1:
        out["descartar"] = f"metragens 'total' distintas sem rotulo terreno: {total}"
    out["area_total_m2"] = area
    # literal para observacoes: o próprio ícone + trecho da descrição se houver
    lit_icone = f"{areas[0][0]:.2f} m² ({areas[0][1]})" if areas and areas[0][0] else None

    mdesc = re.search(r'class="descricao-imovel">(.*?)</p>', uh, re.S)
    desc = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', mdesc.group(1))).strip() if mdesc else ""
    out["descricao"] = desc[:600]
    mlit = re.search(r'[^.]{0,80}\d[\d.,]*\s*m[²2]\b[^.]{0,60}', desc)
    out["trecho_area"] = (mlit.group(0).strip() if mlit else None) or lit_icone
    # literal do valor: precisa corresponder ao price do JSON-LD
    out["trecho_valor"] = None
    v = out.get("valor_anunciado")
    if v is not None:
        br = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        for cand in (f"R$ {br}", f"R${br}", f"R$ {br[:-3]}" if br.endswith(",00") else None):
            if cand and (cand in texto or cand in uh):
                out["trecho_valor"] = cand
                break
        if out["trecho_valor"] is None:
            out["erros"].append(f"valor {v} (JSON-LD) sem literal R$ correspondente no texto")
    out["area_aproximada"] = bool(re.search(r'aproximad|cerca de|em torno de', desc, re.I))

    # corretor
    mc = re.search(r'CORRETOR RESPONS[ÁA]VEL(.{0,600})', uh, re.S)
    if mc:
        linhas = [l.strip() for l in re.sub(r'<[^>]+>', '\n', mc.group(1)).splitlines() if l.strip()]
        out["nome_contato"] = next((l for l in linhas
                                    if not l.lower().startswith(('creci', 'fale', 'ver', 'corretor'))), None)
        mcr = re.search(r'CRECI\s*[:\s]*([\d.]+)', mc.group(1), re.I)
        out["creci"] = mcr.group(1) if mcr else None

    fones = []
    mfx = re.search(r'Matriz\s*\((\d{2})\)\s*(\d{4,5})[\s.\-]?(\d{4})', texto)
    if mfx:
        fones.append(f"({mfx.group(1)}) {mfx.group(2)}-{mfx.group(3)}")
    mwa = re.search(r'api\.whatsapp\.com/send\?phone=55\(?(\d{2})\)?(9?\d{4})[\-\s.]?(\d{4})', raw)
    if mwa:
        wa = f"({mwa.group(1)}) {mwa.group(2)}-{mwa.group(3)}"
        if wa not in fones:
            fones.append(wa)
    out["telefone"] = " | ".join(fones) if fones else None

    escopo = (out["titulo"] + " " + desc).lower()
    if re.search(r'ch[áa]cara|s[íi]tio|fazenda|rancho|zona rural|[áa]rea rural', escopo):
        out["alerta_rural"] = True

    out["data_coleta"] = (meta.get("fetched_at") or "")[:10]
    return out


if __name__ == "__main__":
    for pat in sys.argv[1:]:
        for f in sorted(glob.glob(pat)):
            print(json.dumps(extrai(f), ensure_ascii=False))
