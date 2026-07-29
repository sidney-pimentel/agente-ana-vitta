# -*- coding: utf-8 -*-
"""Gera entrada/bairros_oficiais.csv a partir do PDF oficial da Prefeitura
"Bairros integrados com seus respectivos loteamentos e reloteamentos do
distrito sede" (obtido via snapshot do Wayback Machine — cópia fiel do
documento em docs.uberlandia.mg.gov.br).

Layout: tabela com nº | bairro | loteamentos... | leis/datas | setor.
Linhas de continuação trazem loteamentos adicionais do mesmo bairro.
"""
import csv
import glob
import io
import json
import re
import sys

import pdfplumber

SETORES = {'Norte', 'Sul', 'Leste', 'Oeste', 'Central'}


def celulas(row):
    return [re.sub(r'\s+', ' ', c).strip() for c in row if c and c.strip()]


def main():
    f = glob.glob('raw/web.archive.org/wb_pdf_bairros_loteamentos_2020_*.html')[0]
    meta = json.load(open(f.replace('.html', '.meta.json'), encoding='utf-8'))
    bairros = []  # [nome, setor, [loteamentos]]
    atual = None
    with pdfplumber.open(f) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cs = celulas(row)
                    if not cs:
                        continue
                    setor = next((c for c in cs if c in SETORES), None)
                    # nova entrada de bairro: primeira célula é um número
                    if re.fullmatch(r'\d{1,3}', cs[0]):
                        nome = None
                        for c in cs[1:]:
                            if re.fullmatch(r'[\d./\-]+', c) or c in SETORES:
                                continue
                            nome = re.sub(r'\s*\(continua[çc][ãa]o\)', '', c)
                            break
                        lotes = [c for c in cs[2:]
                                 if c != nome and c not in SETORES
                                 and not re.fullmatch(r'[\d./\-]+|\d{2}/\d{2}/\d{4}', c)]
                        atual = {'n': int(cs[0]), 'bairro': nome, 'setor': setor,
                                 'lotes': lotes}
                        bairros.append(atual)
                    elif atual is not None:
                        if setor and not atual['setor']:
                            atual['setor'] = setor
                        for c in cs:
                            if c in SETORES or re.fullmatch(r'[\d./\-]+|\d{2}/\d{2}/\d{4}', c):
                                continue
                            if re.sub(r'\s*\(continua[çc][ãa]o\)', '', c) == atual['bairro']:
                                continue
                            atual['lotes'].append(c)

    # merge por número da entrada (continuações repetem o número; nomes
    # podem vir fragmentados entre linhas físicas do PDF)
    def limpa_nome(s):
        if not s:
            return s
        s = re.sub(r'\s*\(continua[çc][ãa]o\)', '', s)
        s = re.sub(r'[\d¹²³⁴⁵⁶⁷⁸⁹⁰]+$', '', s).strip()
        return s

    porn = {}
    for b in bairros:
        b['bairro'] = limpa_nome(b['bairro'])
        if b['n'] in porn:
            p = porn[b['n']]
            # nome: fica o fragmento mais longo
            if b['bairro'] and len(b['bairro'] or '') > len(p['bairro'] or ''):
                # o nome anterior pode ser prefixo fragmentado ("Luizote de")
                p['bairro'] = b['bairro']
            p['setor'] = p['setor'] or b['setor']
            p['lotes'].extend(b['lotes'])
        else:
            porn[b['n']] = b
    final = sorted(porn.values(), key=lambda x: x['n'])
    # fragmento de nome que sobrou dentro dos loteamentos da própria entrada
    for b in final:
        b['lotes'] = [l for l in b['lotes'] if limpa_nome(l) != b['bairro']]
        # nome quebrado em 2 linhas físicas no PDF (verificado no texto:
        # "35 Luizote de Luizote de Freitas I - 1ª Etapa ..." / "Freitas ...")
        if b['bairro'] == 'Luizote de':
            b['bairro'] = 'Luizote de Freitas'

    with io.open('entrada/bairros_oficiais.csv', 'w', encoding='utf-8-sig', newline='') as fo:
        w = csv.writer(fo, delimiter=';')
        w.writerow(['bairro', 'setor_territorial', 'loteamentos', 'fonte', 'snapshot'])
        for b in final:
            lotes = ' | '.join(dict.fromkeys(l for l in b['lotes'] if len(l) > 2))
            w.writerow([b['bairro'], b['setor'] or '', lotes,
                        meta.get('url', ''), meta.get('final_url', '')])
    print(f"{len(final)} bairros; sem setor: {sum(1 for b in final if not b['setor'])}")
    for b in final[:8]:
        print(b['n'], b['bairro'], '|', b['setor'], '|', len(b['lotes']), 'loteamentos')


if __name__ == '__main__':
    sys.exit(main())
