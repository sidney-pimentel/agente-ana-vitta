# -*- coding: utf-8 -*-
"""Base de PROPRIETÁRIOS DIRETOS (pessoa física anunciando) — Uberlândia.

Fontes (todas via snapshot do Wayback Machine, porque a OLX bloqueia
infraestrutura de datacenter):
1. páginas de ANÚNCIO da OLX (extract_olx_ad.py) — dado completo: vendedor,
   professionalAd, endereço, CEP, texto, telefone se escrito no texto;
2. listagens da OLX (olx_ads.json) — só para anúncios sem página arquivada.

Rotulagem honesta: data_coleta = data do snapshot; a oferta pode ter
expirado; telefone só quando o próprio anunciante escreveu no anúncio.
"""
import glob
import json
import re
import subprocess
import sys

sys.path.insert(0, 'pipeline')
from schema import nova_linha, escrever_csv
from parsers import fmt_decimal_br, br_number

S = '/tmp/claude-0/-home-user-agente-ana-vitta/ca58926e-9d3a-5c43-86c9-7b37b9bef7b0/scratchpad'

# 1. anúncios com página arquivada
out = subprocess.run([sys.executable, 'pipeline/extract_olx_ad.py'], capture_output=True, text=True)
detalhes = {}
for l in out.stdout.splitlines():
    if l.startswith('{'):
        d = json.loads(l)
        if d.get('listId') and not d.get('descartar'):
            k = str(d['listId'])
            cur = detalhes.get(k)
            if cur is None or (d.get('live') and not cur.get('live')) or (bool(d.get('live')) == bool(cur.get('live')) and (d.get('snapshot') or '') > (cur.get('snapshot') or '')):
                detalhes[k] = d
# 2. listagens
lista = {str(a['listId']): a for a in json.load(open(f'{S}/olx_ads.json', encoding='utf-8'))}


def preco(s):
    if not s:
        return None
    v, _ = br_number(re.sub(r'[^\d.,]', '', str(s)))
    return v


def data_de(snap):
    return f"{snap[:4]}-{snap[4:6]}-{snap[6:8]}" if snap else ''


rows, stats = [], {'det': 0, 'lst': 0}
ids = set(detalhes) | set(lista)
for k in ids:
    d, a = detalhes.get(k), lista.get(k)
    src = d or a
    municipio = (src.get('municipio') or '')
    if not municipio.lower().startswith('uberl'):
        continue
    particular = (d['professionalAd'] is False) if d else (a.get('professionalAd') is False)
    if not particular:
        continue
    stats['det' if d else 'lst'] += 1
    snap = src.get('snapshot')
    m2 = src.get('m2')
    tipo = (src.get('tipo') or '').lower()
    live = bool(src.get('live'))
    obs = ["anuncio de PARTICULAR (OLX professionalAd=false" + (", conta nao-profissional" if d and d.get('proAccount') is False else "") + ")",
           (f"coletado AO VIVO na OLX em {data_de(snap)} (Crawl4AI)" if live
            else f"snapshot Wayback de {data_de(snap)} — oferta pode ter expirado; conferir no link"),
           f"tamanho no anuncio: \"{src.get('size')}\"" if src.get('size') else "sem tamanho no anuncio",
           f"preco no anuncio: \"{src.get('price')}\"" if src.get('price') else "sem preco no anuncio"]
    tel = ''
    if d:
        if d.get('telefones_no_texto'):
            tel = ' | '.join(d['telefones_no_texto'])
            obs.append(f"telefone escrito pelo anunciante no texto: \"{d.get('trecho_fone', '')}\"")
        else:
            obs.append("telefone oculto pela OLX (contato pelo chat do anuncio)")
        if d.get('body'):
            obs.append("texto: \"" + re.sub(r'\s+', ' ', d['body'])[:220] + "\"")
    else:
        obs.append("so listagem arquivada (pagina do anuncio nao arquivada)")
    row = nova_linha(
        id=f"olx-{k}", data_coleta=data_de(snap), origem=('olx.com.br' if live else 'olx.com.br (snapshot Wayback)'),
        url_fonte=src.get('url') or '', codigo_anuncio=k, tipo_contato='Proprietario',
        nome_contato=(d or {}).get('sellerName') or '', telefone=tel,
        endereco=(d or {}).get('endereco') or '', bairro=src.get('bairro') or '',
        cep=(d or {}).get('cep') or '',
        latitude=str((d or {}).get('lat') or ''), longitude=str((d or {}).get('lng') or ''),
        area_total_m2=fmt_decimal_br(m2), valor_anunciado=fmt_decimal_br(preco(src.get('price'))),
        data_valor=data_de(snap),
    )
    if not src.get('price'):
        row['situacao_valor'] = 'Sem valor no anuncio'
    if re.search(r's[íi]tio|ch[áa]cara|fazenda|rancho', tipo + ' ' + (src.get('subject') or '').lower()):
        row['status_apuracao'] = 'Excluido'
        row['motivo_exclusao'] = (f'classificado como {tipo or "sitio/chacara"} pelo anunciante/OLX '
                                  f'(escopo exclui rural) — avaliar como lead se estiver no perimetro urbano')
    if re.search(r'rural', (src.get('bairro') or '').lower()) or re.search(r'rodovia|\bkm\b|zona rural', (row['endereco'] or '').lower()):
        row['perimetro_urbano'] = 'Nao'
    txt = ((src.get('subject') or '') + ' ' + ((d or {}).get('body') or '')).lower()
    mrod = re.search(r'(\bbr[\s-]?\d{3}\b|rodovia|\b\d{1,3}\s*km\b|\bkm\s*\d{1,3}\b|estrada)[^.\n]{0,60}', txt)
    if mrod and row['perimetro_urbano'] != 'Nao':
        row['perimetro_urbano'] = 'A verificar'
        obs.append(f"ALERTA: texto do anuncio cita rodovia/km (\"{mrod.group(0).strip()[:70]}\") — bairro informado pode nao corresponder")
    if m2 is not None and m2 < 5000:
        row['status_apuracao'] = 'Excluido'
        row['motivo_exclusao'] = f'area {fmt_decimal_br(m2)} m2 abaixo de 5000 m2'
    elif m2 is None:
        obs.append('sem area no anuncio — decisao humana')
    row['observacoes'] = ' | '.join(obs)
    rows.append(row)


def a_num(r):
    return float(r['area_total_m2'].replace('.', '').replace(',', '.')) if r['area_total_m2'] else 0


rows.sort(key=lambda r: (r['status_apuracao'] != 'A validar', -a_num(r)))
escrever_csv('saida/proprietarios_diretos.csv', rows)
at = [r for r in rows if r['status_apuracao'] == 'A validar']
print(f"proprietarios_diretos.csv: {len(rows)} particulares em Uberlandia "
      f"({stats['det']} com pagina arquivada, {stats['lst']} so listagem) | "
      f"{len(at)} no corte (>=5000 m2 ou sem area) | {len(rows)-len(at)} excluidas com motivo | "
      f"{sum(1 for r in rows if r['telefone'])} com telefone no texto")
for r in [x for x in rows if a_num(x) >= 5000 or not x['area_total_m2']][:25]:
    print(f"  {r['status_apuracao'][:9]:9} | {r['area_total_m2']:>8} | {r['valor_anunciado']:>9} | {r['bairro'][:24]:24} | {r['nome_contato'][:14]:14} | {r['telefone'][:32] or '-':32} | {r['url_fonte'][-48:]}")
