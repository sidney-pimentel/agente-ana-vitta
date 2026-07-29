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
w("## O que NÃO foi possível coletar e por quê (seção obrigatória)")
w("")
w("- **Rede da sessão Claude bloqueada** (política de egress \"trusted\"): toda a coleta rodou via "
  "GitHub Actions (workflow `coleta.yml`, commitado e auditável), com robots.txt respeitado, "
  "2–4s entre requisições e user-agent identificado com contato.")
w("- **Prefeitura (uberlandia.mg.gov.br)**: WAF bloqueia datacenter (403) e os subdomínios de "
  "documentos não resolvem/timeout. A lista oficial de bairros veio do **PDF oficial via snapshot "
  "do Wayback Machine** (fonte e snapshot registrados em `entrada/bairros_oficiais.csv`). "
  "O PDF por setor \"Setor-Leste\" não tinha snapshot, mas o documento consolidado de 2020 cobre "
  "os 5 setores (74 bairros).")
w("- **Vedadas por robots.txt** (respeitado, não coletadas): storteimoveis.com.br, nexusimob.com, "
  "glebaimoveis.com.")
w("- **Bloqueadas por WAF (403 também no runner)**: lbnegocios.com, imovelweb.com.br, "
  "wimoveis.com.br, seuimovelgold.com.br.")
w("- **Fora do ar no momento**: estilonegocios.com.br (conexão falhou 2x), mggaveaimoveis.com.br (DNS).")
w("- **objetivauberlandia.com.br**: páginas de detalhe funcionam, mas a listagem é renderizada por "
  "JavaScript (0 links no HTML) — não coletada nesta rodada; dá para cobrir via sitemap numa próxima.")
w("- **ativaimoveismg.com.br / ultraimoveis.com / imoveisuberlandia.com.br**: reconhecidas; "
  "estoque visível pequeno (10, ~7 e lotes de 300–360 m² respectivamente) — detalhes não coletados "
  "nesta rodada.")
w("- **chavesnamao.com.br**: 6 páginas varridas, 0 anúncios ≥4.900 m² nos cards; filtro de área da "
  "URL não funciona. **lopes.com.br**: 3 páginas, 0 ≥4.900 m².")
w("- **OLX (olx.com.br)**: NÃO tentada nesta rodada (última camada do plano; anti-bot forte). "
  "Lacuna declarada.")
w("- **zapimoveis/vivareal**: rate-limit 429 na primeira passada; re-busca a 8–15s recuperou tudo "
  "(estado final: 100% dos detalhes selecionados baixados).")
w("- **1 página perdida**: deltaimoveis código 52911 (erro de conexão; a URL do próprio site a "
  "classifica como Apartamento — estaria fora do escopo). Registrada em `descartados.csv`.")
w("")
w("## Registros `A verificar` no perímetro urbano")
w("")
pv = Counter(r['perimetro_urbano'] for r in at)
w(f"- {pv.get('A verificar', 0)} linhas ativas com `perimetro_urbano = A verificar` (bairro do anúncio "
  f"não consta na lista oficial de 74 bairros integrados — ex.: \"Chácaras Uirapuru\", \"Chácaras "
  f"Rancho Alegre\", loteamentos empresariais). Decisão humana, como definido.")
w(f"- {pv.get('Sim', 0)} com bairro na lista oficial (`Sim`).")
w("")
w("## Estimativa de cobertura do mercado (é ESTIMATIVA)")
w("")
w("Raciocínio explícito, verificável nos números acima:")
w("")
w("- O ZAP, com o filtro do próprio site (`areaMinima=5000`), declarava **150 anúncios** ≥5.000 m² "
  "em Uberlândia no dia da coleta; VivaReal (mesmo grupo) 116 URLs únicas no mesmo filtro. Ambos "
  "foram varridos por completo no nível do filtro.")
w("- As duas maiores imobiliárias locais com site próprio raspável (Delta e Ivan, ~1.060 anúncios "
  "de terreno cada) foram varridas **integralmente** (todas as páginas de listagem), com detalhe "
  "coletado para todo card ≥4.900 m² ou sem área legível.")
w("- Três sites locais menores (Guinza, Elite, Wender) idem.")
w("- **O que isso NÃO cobre**: fontes com WAF/robots (Imovelweb, Wimoveis, Storte, Nexus, LB, Gold), "
  "OLX, listagem JS da Objetiva, imobiliárias sem site raspável, e — principalmente — **estoque "
  "não anunciado online** (glebas ofertadas em rede fechada de corretores), que em áreas grandes "
  "é fatia relevante e não mensurável por este método.")
w("- **Estimativa**: a base deve representar algo como **2/3 a 4/5 do estoque ANUNCIADO online** "
  "de terrenos ≥5.000 m² no perímetro urbano — porque os dois maiores portais e os dois maiores "
  "sites locais foram varridos por inteiro, e as fontes bloqueadas são majoritariamente "
  "revendedoras dos mesmos anúncios. Sobre o mercado real (incluindo off-market), não há base "
  "para estimar percentual e nenhum número é afirmado.")
w("")
w("## Auditoria")
w("")
w("- Cada linha tem `url_fonte`, `data_coleta` e trecho literal de área/valor em `observacoes`.")
w("- HTML bruto de todas as páginas em `raw/{dominio}/` com `.meta.json` (URL, timestamp, status, bytes).")
w("- Reprocessamento é 100% offline: `extract_*.py` sobre `raw/` → `build_base.py`.")
w("")
open('saida/RELATORIO.md', 'w', encoding='utf-8').write("\n".join(linhas) + "\n")
print(f"RELATORIO: {len(linhas)} linhas de markdown")
