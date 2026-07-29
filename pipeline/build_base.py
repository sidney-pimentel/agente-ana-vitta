# -*- coding: utf-8 -*-
"""Monta a base a partir dos dicts extraídos (JSON por linha no stdin).

- Aplica escopo: area < 5000 -> status_apuracao=Excluido (mantém na base);
  alerta_rural -> perimetro_urbano=Nao + Excluido.
- Perímetro urbano: bairro na lista oficial -> Sim; senão A verificar.
- Sem area E sem valor E sem contato util -> descartados.csv? Não:
  descarte só por regra do contrato (ambiguidade). Sem área vai para a
  base com campo vazio e status A validar apenas se área >= 5000 não puder
  ser afirmada — nesses casos o registro é Excluido? Não: sem área não dá
  para afirmar escopo; fica com status_apuracao='A validar' e motivo
  em observacoes (decisão humana).
- Dedup candidata: mesma area (2%) + mesmo bairro -> duplicatas_candidatas.csv.
"""
import csv
import io
import json
import sys
import unicodedata

sys.path.insert(0, 'pipeline')
from schema import COLUNAS, nova_linha, escrever_csv
from parsers import fmt_decimal_br

ARQ_BASE = 'saida/ofertas_terrenos_uberlandia.csv'
ARQ_DESC = 'saida/descartados.csv'
ARQ_DUP = 'saida/duplicatas_candidatas.csv'
ARQ_BAIRROS = 'entrada/bairros_oficiais.csv'


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').strip()


def carrega_bairros():
    try:
        with io.open(ARQ_BAIRROS, encoding='utf-8-sig') as f:
            return {norm(r['bairro']) for r in csv.DictReader(f, delimiter=';')}
    except FileNotFoundError:
        return set()


def main():
    bairros_ok = carrega_bairros()
    linhas, descartados = [], []
    seq = 0
    for l in sys.stdin:
        l = l.strip()
        if not l or not l.startswith('{'):
            continue
        d = json.loads(l)
        if d.get('descartar'):
            descartados.append({'url': d.get('url_fonte') or d.get('arquivo'),
                                'motivo': d['descartar']})
            continue

        seq += 1
        obs = []
        if d.get('trecho_area'):
            obs.append(f"area: \"{d['trecho_area']}\"")
        if d.get('trecho_valor'):
            obs.append(f"valor: \"{d['trecho_valor']}\"")
        if d.get('area_aproximada'):
            obs.append("area citada como aproximada no anuncio")
        for e in d.get('erros', []):
            obs.append(f"aviso: {e}")

        area = d.get('area_total_m2')
        row = nova_linha(
            id=f"{d['origem'].split('.')[0][:5]}-{d.get('codigo_anuncio') or seq}",
            data_coleta=d.get('data_coleta', ''),
            origem=d['origem'],
            url_fonte=d.get('url_fonte', ''),
            codigo_anuncio=d.get('codigo_anuncio', ''),
            tipo_contato='Imobiliaria',
            nome_contato=d.get('nome_contato', ''),
            empresa=d.get('empresa', ''),
            creci=d.get('creci', ''),
            telefone=d.get('telefone', ''),
            bairro=d.get('bairro', ''),
            area_total_m2=fmt_decimal_br(area),
            valor_anunciado=fmt_decimal_br(d.get('valor_anunciado')),
            data_valor=d.get('data_coleta', ''),
        )
        if d.get('valor_anunciado') is None:
            row['situacao_valor'] = 'Sem valor no anuncio'
        if bairros_ok and norm(d.get('bairro')) in bairros_ok:
            row['perimetro_urbano'] = 'Sim'
        if d.get('alerta_rural'):
            row['perimetro_urbano'] = 'Nao'
            row['status_apuracao'] = 'Excluido'
            row['motivo_exclusao'] = 'anuncio classificado como rural/chacara/sitio/fazenda'
        elif area is not None and area < 5000:
            row['status_apuracao'] = 'Excluido'
            row['motivo_exclusao'] = f'area_total {fmt_decimal_br(area)} m2 abaixo de 5000 m2'
        elif area is None:
            obs.append('sem area legivel no anuncio; escopo nao confirmado - decisao humana')
        row['observacoes'] = ' | '.join(obs)
        linhas.append(row)

    # duplicatas candidatas: mesma area (2%) + mesmo bairro, entre ativos
    ativos = [r for r in linhas if r['status_apuracao'] != 'Excluido' and r['area_total_m2']]
    def a(r):
        return float(r['area_total_m2'].replace('.', '').replace(',', '.')) if ',' in r['area_total_m2'] else float(r['area_total_m2'])
    grupos, usados = [], set()
    for i, r in enumerate(ativos):
        if r['id'] in usados:
            continue
        g = [r]
        for s in ativos[i + 1:]:
            if s['id'] in usados:
                continue
            if norm(s['bairro']) == norm(r['bairro']) and r['bairro'] and abs(a(s) - a(r)) <= 0.02 * max(a(s), a(r)):
                g.append(s)
        if len(g) > 1:
            grupos.append(g)
            usados.update(x['id'] for x in g)

    escrever_csv(ARQ_BASE, linhas)
    with io.open(ARQ_DESC, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['url', 'motivo'])
        for dd in descartados:
            w.writerow([dd['url'], dd['motivo']])
    with io.open(ARQ_DUP, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['grupo', 'id', 'url_fonte', 'bairro', 'area_total_m2', 'valor_anunciado'])
        for gi, g in enumerate(grupos, 1):
            for r in g:
                w.writerow([gi, r['id'], r['url_fonte'], r['bairro'],
                            r['area_total_m2'], r['valor_anunciado']])
    print(f"base: {len(linhas)} linhas ({len(ativos)} ativas no escopo); "
          f"descartados: {len(descartados)}; grupos duplicata: {len(grupos)}")


if __name__ == '__main__':
    main()
