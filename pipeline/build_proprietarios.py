# -*- coding: utf-8 -*-
"""Base de PROPRIETÁRIOS DIRETOS (pessoa física anunciando) — Uberlândia.

Fonte: listagens da OLX capturadas via snapshot do Wayback Machine (a OLX
bloqueia infraestrutura de datacenter). O JSON __NEXT_DATA__ da listagem
traz professionalAd=false para anúncio de particular, bairro, preço,
tamanho e a URL original do anúncio.

Rotulagem honesta: data_coleta = data do snapshot; o anúncio pode ter
expirado; telefone não é exposto pela OLX (contato via chat do anúncio).
"""
import glob
import json
import re
import sys

sys.path.insert(0, 'pipeline')
from schema import nova_linha, escrever_csv
from parsers import fmt_decimal_br, br_number

S = '/tmp/claude-0/-home-user-agente-ana-vitta/ca58926e-9d3a-5c43-86c9-7b37b9bef7b0/scratchpad'
ads = json.load(open(f'{S}/olx_ads.json', encoding='utf-8'))

# detalhes via Wayback (se existirem): descrição para trecho literal/telefone
detalhes = {}
for f in glob.glob('raw/web.archive.org/wb_olx_ad_*.html'):
    m = re.search(r'wb_olx_ad_(\d+)_', f)
    if not m:
        continue
    h = open(f, encoding='utf-8', errors='replace').read()
    nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S)
    d = {}
    if nd:
        try:
            ad = json.loads(nd.group(1))['props']['pageProps'].get('ad', {})
            d = {'body': ad.get('body'), 'phone': (ad.get('phone') or {}).get('phone'),
                 'user': (ad.get('user') or {}).get('name'), 'props': {p['name']: p.get('value') for p in ad.get('properties', [])}}
        except Exception:
            pass
    detalhes[m.group(1)] = d


def preco(s):
    if not s:
        return None
    v, err = br_number(re.sub(r'[^\d.,]', '', s))
    return v


rows = []
for a in ads:
    if not (a.get('municipio') or '').lower().startswith('uberl'):
        continue
    if a.get('professionalAd') is not False:
        continue
    m2 = a.get('m2')
    det = detalhes.get(str(a['listId']), {})
    snap = a['snapshot']
    data = f"{snap[:4]}-{snap[4:6]}-{snap[6:8]}"
    obs = [f"anuncio de PARTICULAR (OLX professionalAd=false)",
           f"snapshot Wayback de {data} — oferta pode ter expirado; verificar no link",
           f"tamanho informado no anuncio: \"{a.get('size')}\"" if a.get('size') else "anuncio sem tamanho informado",
           f"preco no anuncio: \"{a.get('price')}\"" if a.get('price') else "sem preco no anuncio"]
    if det.get('body'):
        obs.append(f"descricao: \"{det['body'][:200].strip()}\"")
    tipo = (a.get('tipo') or '').lower()
    row = nova_linha(
        id=f"olx-{a['listId']}", data_coleta=data, origem='olx.com.br (snapshot Wayback)',
        url_fonte=a['url'], codigo_anuncio=str(a['listId']), tipo_contato='Proprietario',
        nome_contato=det.get('user') or '', empresa='', telefone=det.get('phone') or '',
        bairro=a.get('bairro') or '', area_total_m2=fmt_decimal_br(m2),
        valor_anunciado=fmt_decimal_br(preco(a.get('price'))), data_valor=data,
    )
    if not a.get('price'):
        row['situacao_valor'] = 'Sem valor no anuncio'
    if re.search(r's[íi]tio|ch[áa]cara|fazenda|rancho', tipo + ' ' + (a.get('subject') or '').lower()):
        row['status_apuracao'] = 'Excluido'
        row['motivo_exclusao'] = f'classificado pela OLX/anunciante como {tipo or "sitio/chacara"} (escopo exclui rural) — manter como lead se for perimetro urbano'
    if re.search(r'rural', (a.get('bairro') or '').lower()):
        row['perimetro_urbano'] = 'Nao'
    if m2 is not None and m2 < 5000:
        row['status_apuracao'] = 'Excluido'
        row['motivo_exclusao'] = f'area {fmt_decimal_br(m2)} m2 abaixo de 5000 m2'
    elif m2 is None:
        obs.append('sem area no anuncio — decisao humana')
    row['observacoes'] = ' | '.join(obs)
    rows.append(row)

rows.sort(key=lambda r: (r['status_apuracao'] != 'A validar', -(float(r['area_total_m2'].replace('.', '').replace(',', '.')) if r['area_total_m2'] else 0)))
escrever_csv('saida/proprietarios_diretos.csv', rows)
at = [r for r in rows if r['status_apuracao'] == 'A validar']
print(f"proprietarios_diretos.csv: {len(rows)} linhas | {len(at)} no corte (>=5000 ou sem area) | "
      f"{sum(1 for r in rows if r['status_apuracao']=='Excluido')} excluidas com motivo")
for r in rows[:12]:
    print(f"  {r['status_apuracao'][:9]:9} | {r['area_total_m2']:>8} | {r['valor_anunciado']:>9} | {r['bairro'][:26]:26} | {r['telefone'] or '-':16} | {r['url_fonte'][-55:]}")
