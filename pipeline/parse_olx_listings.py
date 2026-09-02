# -*- coding: utf-8 -*-
"""Lê todas as listagens da OLX em cache (snapshots Wayback em
raw/web.archive.org/wb_olx*.html e páginas AO VIVO via Crawl4AI em
raw/www.olx.com.br/c4ai_olx_*.html), extrai o __NEXT_DATA__.props.pageProps.ads
e grava scratchpad/olx_ads.json. Anúncio visto em mais de uma fonte fica com
a captura mais recente; 'ao vivo' sempre vence snapshot."""
import glob
import json
import os
import re
import sys

S = '/tmp/claude-0/-home-user-agente-ana-vitta/ca58926e-9d3a-5c43-86c9-7b37b9bef7b0/scratchpad'


def size_m2(s):
    if not s:
        return None
    m = re.search(r'([\d.,]+)', str(s).replace(' ', ''))
    if not m:
        return None
    t = m.group(1)
    try:
        return float(t.replace('.', '').replace(',', '.')) if ',' in t else float(t.replace('.', ''))
    except ValueError:
        return None


def ler_next_f(h):
    """Next.js App Router: dados em self.__next_f.push([1,"<string JS>"]).
    Desescapa cada chunk como literal JSON e procura o array "ads":[...]."""
    chunks = []
    for m in re.finditer(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', h, re.S):
        try:
            chunks.append(json.loads('"' + m.group(1) + '"'))
        except Exception:
            continue
    txt = "".join(chunks)
    ads, total = [], None
    dec = json.JSONDecoder()
    for m in re.finditer(r'"ads":\s*(?=\[)', txt):
        try:
            arr, _ = dec.raw_decode(txt, m.end())
        except Exception:
            continue
        if isinstance(arr, list) and arr and isinstance(arr[0], dict) and 'listId' in arr[0]:
            ads = arr
            break
    mt = re.search(r'"totalOfAds":\s*(\d+)', txt) or re.search(r'"totalAds":\s*(\d+)', txt)
    if mt:
        total = int(mt.group(1))
    return ads, {'totalOfAds': total}


def ler(path):
    h = open(path, encoding='utf-8', errors='replace').read()
    nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S)
    if not nd:
        if 'self.__next_f.push' in h:
            return ler_next_f(h)
        return None, None
    try:
        d = json.loads(nd.group(1))
    except Exception:
        return None, None
    pp = d.get('props', {}).get('pageProps', {})
    return pp.get('ads') or [], pp


def main():
    ads_all = {}
    fontes = []
    files = glob.glob('raw/web.archive.org/wb_olx*.html') + glob.glob('raw/www.olx.com.br/c4ai_olx_*.html')
    for f in sorted(files):
        if '/wb_olx_ad_' in f:
            continue
        meta = json.load(open(f[:-5] + '.meta.json', encoding='utf-8'))
        live = '/c4ai_' in f
        if live:
            if not meta.get('ok'):
                continue
            capt = meta['fetched_at'].replace('-', '').replace(':', '').replace('T', '')[:14]
        else:
            if meta.get('http_status') != 200:
                continue
            m = re.search(r'/web/(\d{14})/', meta.get('final_url', '') or meta.get('url', ''))
            capt = m.group(1) if m else '00000000000000'
        ads, pp = ler(f)
        if ads is None:
            continue
        fontes.append((os.path.basename(f)[:40], 'ao vivo' if live else 'wayback', capt[:8], len(ads),
                       (pp or {}).get('totalOfAds') or (pp or {}).get('totalAds')))
        for a in ads:
            props = {p['name']: p.get('value') for p in (a.get('properties') or []) if isinstance(p, dict)}
            url = re.sub(r'^https://web\.archive\.org/web/\d+/', '', a.get('url') or a.get('friendlyUrl') or '')
            rec = {'listId': a.get('listId'), 'subject': a.get('subject'), 'price': a.get('price'),
                   'professionalAd': a.get('professionalAd'),
                   'municipio': (a.get('locationDetails') or {}).get('municipality'),
                   'bairro': (a.get('locationDetails') or {}).get('neighbourhood'), 'url': url,
                   'snapshot': capt, 'live': live, 'tipo': props.get('real_estate_type'),
                   'size': props.get('size'), 'm2': size_m2(props.get('size')), 'date': a.get('date')}
            k = a.get('listId')
            cur = ads_all.get(k)
            if cur is None or (live and not cur['live']) or (live == cur['live'] and capt > cur['snapshot']):
                ads_all[k] = rec
    json.dump(list(ads_all.values()), open(f'{S}/olx_ads.json', 'w'), ensure_ascii=False, indent=1)
    for fo in fontes:
        print('  %-40s %-8s %s ads=%s total=%s' % fo)
    udi = [r for r in ads_all.values() if (r['municipio'] or '').lower().startswith('uberl')]
    part = [r for r in udi if r['professionalAd'] is False]
    live_udi = [r for r in udi if r['live']]
    print(f"ads unicos: {len(ads_all)} | Uberlandia: {len(udi)} (ao vivo: {len(live_udi)}) | particulares Uberlandia: {len(part)} "
          f"(ao vivo: {sum(1 for r in part if r['live'])}) | particulares >=4900 m2: {sum(1 for r in part if r['m2'] and r['m2']>=4900)}")
    # fila de detalhes (Crawl4AI) para particulares de Uberlandia sem pagina ao vivo
    if '--fila' in sys.argv:
        lines = ["# Crawl4AI — detalhes de anuncios de PARTICULARES (Uberlandia) ao vivo"]
        for r in sorted(part, key=lambda x: -(x['m2'] or 0)):
            if r['url']:
                lines.append(f"{r['url']}\tc4ai_olx_ad_{r['listId']}")
        open('pipeline/crawl4ai_queue.txt', 'w', encoding='utf-8').write("\n".join(lines) + "\n")
        print(len(lines) - 1, 'detalhes na fila')


if __name__ == '__main__':
    main()
