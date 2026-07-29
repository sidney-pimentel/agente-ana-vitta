# -*- coding: utf-8 -*-
"""Gera saida/RELATORIO.md a partir dos CSVs de saída + fetch_log."""
import csv
import io
import statistics
from collections import Counter

def carrega(path):
    return list(csv.DictReader(io.open(path, encoding='utf-8-sig'), delimiter=';'))

def num(s):
    if not s:
        return None
    return float(s.replace('.', '').replace(',', '.')) if ',' in s else float(s)

rows = carrega('saida/ofertas_terrenos_uberlandia.csv')
fontes = carrega('saida/fontes.csv')
desc = carrega('saida/descartados.csv')
dups = carrega('saida/duplicatas_candidatas.csv')
at = [r for r in rows if r['status_apuracao'] == 'A validar']
ex = [r for r in rows if r['status_apuracao'] == 'Excluido']

areas = sorted(a for a in (num(r['area_total_m2']) for r in at) if a)
vals = sorted(v for v in (num(r['valor_anunciado']) for r in at) if v)

def dist(xs, fmt=lambda x: f"{x:,.0f}".replace(',', '.')):
    if not xs:
        return "—"
    return (f"min {fmt(xs[0])} · mediana {fmt(statistics.median(xs))} · "
            f"max {fmt(xs[-1])} · n={len(xs)}")

linhas = []
w = linhas.append
w("# RELATÓRIO — Base de ofertas de terrenos ≥5.000 m², Uberlândia/MG")
w("")
w(f"Coleta: 2026-07-29 · Método: fetcher educado via GitHub Actions (rede da sessão bloqueada por política de egress) · HTML bruto em `raw/`")
w("")
w("## Números gerais")
w("")
w(f"- **{len(rows)} linhas** na base (`ofertas_terrenos_uberlandia.csv`)")
w(f"- **{len(at)} ativas** (`A validar`) — {len(areas)} com área confirmada ≥5.000 m²; "
  f"{len(at)-len(areas)} com área ilegível no anúncio (decisão humana)")
w(f"- **{len(ex)} excluídas com motivo** (rural, tipo não-terreno, <5.000 m²) — mantidas para não recoletar")
w(f"- **{len(desc)} descartadas por ambiguidade** (`descartados.csv`) — ex.: metragem do anúncio "
  f"divergente da metadata do portal, metragens múltiplas sem rótulo")
w(f"- **{len(set(d['grupo'] for d in dups))} grupos de duplicata candidata** ({len(dups)} linhas em "
  f"`duplicatas_candidatas.csv`) — mesmo bairro + área ±2%, não colapsadas (revisão manual)")
w("")
w("## Cobertura por fonte")
w("")
w("| origem | linhas | ativas | excluídas |")
w("|---|---|---|---|")
o_tot = Counter(r['origem'] for r in rows)
o_at = Counter(r['origem'] for r in at)
o_ex = Counter(r['origem'] for r in ex)
for o in sorted(o_tot, key=lambda x: -o_at[x]):
    w(f"| {o} | {o_tot[o]} | {o_at[o]} | {o_ex[o]} |")
w("")
w("Status de todas as fontes mapeadas (viáveis, bloqueadas, robots.txt, fora de escopo): `saida/fontes.csv`.")
w("")
w("## Taxa de vazio por campo (linhas ativas)")
w("")
w("| campo | vazios | % |")
w("|---|---|---|")
for c in rows[0].keys():
    v = sum(1 for r in at if not r[c])
    if v:
        w(f"| {c} | {v}/{len(at)} | {100*v//len(at)}% |")
w("")
w("## Distribuições (linhas ativas)")
w("")
w(f"- **Área (m²)**: {dist(areas)}")
w(f"- **Valor pedido (R$)**: {dist(vals)}")
w(f"- **Perímetro urbano**: " + ", ".join(f"{k}: {v}" for k, v in
  Counter(r['perimetro_urbano'] for r in at).most_common()))
w("")
open('saida/RELATORIO.md', 'w', encoding='utf-8').write("\n".join(linhas) + "\n")
print(f"RELATORIO parcial: {len(linhas)} linhas de markdown")
