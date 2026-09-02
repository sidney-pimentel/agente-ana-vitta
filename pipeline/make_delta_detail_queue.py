# -*- coding: utf-8 -*-
"""Gera a fila de páginas de DETALHE do piloto Delta.

Critério de pré-seleção (só decide O QUE BUSCAR, nunca o que entra na base):
- card com area >= 4900 m² (5000 - 2% de tolerância), OU
- card sem área legível (precisa do detalhe para decidir).
Dedup por código.
"""
import json
import subprocess
import sys

LIMIAR = 4900.0

out = subprocess.run(
    [sys.executable, 'pipeline/cards_delta_cms.py',
     'raw/www.deltaimoveis.com.br/delta_listagem_*.html',
     'raw/www.deltaimoveis.com.br/delta_busca_*.html'],
    capture_output=True, text=True)
vistos = {}
for line in out.stdout.splitlines():
    if not line.startswith('{'):
        continue
    c = json.loads(line)
    if c['codigo'] not in vistos:
        vistos[c['codigo']] = c

sel = [c for c in vistos.values()
       if c['area_m2_card'] is None or c['area_m2_card'] >= LIMIAR]
com_area = sum(1 for c in sel if c['area_m2_card'] is not None)
print(f"# cards unicos: {len(vistos)}; selecionados: {len(sel)} "
      f"({com_area} com area>= {LIMIAR}, {len(sel)-com_area} sem area no card)",
      file=sys.stderr)

linhas = ["# Lote 4 — FASE 2 piloto Delta: paginas de detalhe pre-selecionadas"]
for c in sorted(sel, key=lambda x: -(x['area_m2_card'] or 0)):
    if c['url_detalhe']:
        linhas.append(f"{c['url_detalhe']}\tdelta_det_{c['codigo']}")
print("\n".join(linhas))
