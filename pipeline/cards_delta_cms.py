# -*- coding: utf-8 -*-
"""Extrator de CARDS de listagem do CMS usado por Delta/Ivan.

Uso: python3 cards_delta_cms.py raw/www.deltaimoveis.com.br/delta_listagem_area_*.html

Saída: JSON por linha com {codigo, url_detalhe, bairro, area_m2_card, preco_card}.
Serve APENAS para pré-selecionar quais páginas de detalhe buscar.
NADA daqui entra na base final — a base sai da página de detalhe.
"""
import glob
import html as htmlmod
import json
import re
import sys

RE_CARD = re.compile(r'onClick="toggleFavorito\((\d+)\)"')


def cards(path):
    h = open(path, encoding='utf-8', errors='replace').read()
    # divide o HTML em blocos por card (âncora: toggleFavorito(ID))
    ids = [(m.start(), m.group(1)) for m in RE_CARD.finditer(h)]
    out = []
    for i, (pos, cod) in enumerate(ids):
        end = ids[i + 1][0] if i + 1 < len(ids) else len(h)
        bloco = h[pos:end]
        m = re.search(r'href="(comprar/[^"]+/' + cod + r')"', bloco)
        url = "https://" + path.split("/")[1] + "/" + m.group(1) if m else None
        mb = re.search(r'card-bairro-cidade-texto">\s*([^<]+?)\s*-\s*Uberl', bloco)
        bairro = htmlmod.unescape(mb.group(1)).strip() if mb else None
        # área no ícone do card: title="1457.00 M..." (formato EN com ponto decimal)
        ma = re.search(r'title="(\d+(?:\.\d+)?) M', bloco)
        area = float(ma.group(1)) if ma else None
        mp = re.search(r'R\$\s*([\d.,]+)', bloco)
        preco = mp.group(0) if mp else None
        out.append({"codigo": cod, "url_detalhe": url, "bairro": bairro,
                    "area_m2_card": area, "preco_card": preco,
                    "arquivo": path})
    return out


if __name__ == "__main__":
    todos = []
    for pat in sys.argv[1:]:
        for f in sorted(glob.glob(pat)):
            todos.extend(cards(f))
    for c in todos:
        print(json.dumps(c, ensure_ascii=False))
    print(f"# total {len(todos)} cards", file=sys.stderr)
