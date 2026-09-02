# -*- coding: utf-8 -*-
"""Extrator de página de ANÚNCIO da OLX (snapshot do Wayback Machine).

Anatomia verificada (raw/web.archive.org/wb_olx_ad_*.html, 2026-09-02):
<script id="initial-data" data-json="{...}"> com ad.{subject, price,
professionalAd, user.name, user.configs.proAccount, phone (oculto), body,
location{address, neighbourhood, municipality, zipcode, mapLati, mapLong},
properties[{name:'size', value}], listTime}.
Telefones: a OLX oculta o campo; quando o anunciante escreve o número no
texto do anúncio, ele é extraído do body (trecho literal guardado).
"""
import glob
import html as hm
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parsers import parse_phones, br_number


def m2_de(size):
    if not size:
        return None
    m = re.search(r'([\d.,]+)', str(size).replace(' ', ''))
    if not m:
        return None
    v, _ = br_number(m.group(1))
    return v


def extrai(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    meta = json.load(open(path[:-5] + '.meta.json', encoding='utf-8'))
    out = {"arquivo": path, "erros": [], "descartar": None}
    snap = re.search(r'/web/(\d{14})/', meta.get('final_url') or meta.get('url') or '')
    out["snapshot"] = snap.group(1) if snap else None
    m = re.search(r'<script[^>]*id="initial-data"[^>]*data-json="([^"]*)"', raw)
    if not m:
        out["descartar"] = "pagina sem initial-data (snapshot incompleto)"
        return out
    try:
        ad = json.loads(hm.unescape(m.group(1))).get('ad') or {}
    except Exception as e:
        out["descartar"] = f"initial-data ilegivel: {e}"
        return out
    loc = ad.get('location') or {}
    props = {p.get('name'): p.get('value') for p in (ad.get('properties') or []) if isinstance(p, dict)}
    user = ad.get('user') or {}
    body = re.sub(r'<br\s*/?>', '\n', ad.get('body') or ad.get('description') or '')
    body = re.sub(r'<[^>]+>', ' ', body)
    out.update({
        "listId": ad.get('listId'),
        "url": re.sub(r'^https://web\.archive\.org/web/\d+/', '', ad.get('friendlyUrl') or meta.get('url', '')),
        "subject": ad.get('subject'),
        "price": ad.get('price') or ad.get('priceValue'),
        "professionalAd": ad.get('professionalAd'),
        "proAccount": (user.get('configs') or {}).get('proAccount'),
        "sellerName": user.get('name') or ad.get('sellerName'),
        "municipio": loc.get('municipality'),
        "bairro": loc.get('neighbourhood'),
        "endereco": loc.get('address'),
        "cep": loc.get('zipcode'),
        "lat": loc.get('mapLati') or None,
        "lng": loc.get('mapLong') or None,
        "tipo": props.get('real_estate_type'),
        "size": props.get('size'),
        "m2": m2_de(props.get('size')),
        "body": body.strip(),
        "listTime": ad.get('listTime') or ad.get('origListTime'),
        "phone_hidden": (ad.get('phone') or {}).get('phoneHidden'),
    })
    fones = parse_phones(body)
    # só aceita DDD 34 ou celular com 9 dígitos de outros DDDs explícitos no texto
    out["telefones_no_texto"] = fones
    if fones:
        i = body.find(re.sub(r'\D', '', fones[0])[2:6])
        out["trecho_fone"] = re.sub(r'\s+', ' ', body[max(0, i - 40): i + 60]).strip()
    return out


if __name__ == "__main__":
    for f in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else 'raw/web.archive.org/wb_olx_ad_*.html')):
        try:
            if json.load(open(f[:-5] + '.meta.json'))['http_status'] != 200:
                continue
        except Exception:
            continue
        print(json.dumps(extrai(f), ensure_ascii=False))
