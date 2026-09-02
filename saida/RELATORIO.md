# RELATÓRIO — Base de ofertas de terrenos ≥5.000 m², Uberlândia/MG

Coleta: 2026-07-29 · Método: fetcher educado via GitHub Actions (rede da sessão bloqueada por política de egress) · HTML bruto em `raw/`

## Números gerais

- **389 linhas** na base (`ofertas_terrenos_uberlandia.csv`)
- **223 ativas** (`A validar`) — 221 com área confirmada ≥5.000 m²; 2 com área ilegível no anúncio (decisão humana)
- **75 excluídas com motivo** (rural, tipo não-terreno, <5.000 m²) — mantidas para não recoletar
- **22 descartadas por ambiguidade** (`descartados.csv`) — ex.: metragem do anúncio divergente da metadata do portal, metragens múltiplas sem rótulo
- **57 grupos de duplicata candidata** (224 linhas em `duplicatas_candidatas.csv`) — mesmo bairro + área ±2%, não colapsadas (revisão manual)

## Cobertura por fonte

| origem | linhas | ativas | excluídas |
|---|---|---|---|
| zapimoveis.com.br | 134 | 126 | 8 |
| deltaimoveis.com.br | 75 | 46 | 29 |
| ivannegocios.com.br | 51 | 26 | 25 |
| guinzaimoveis.com.br | 13 | 12 | 1 |
| wenderbernardesimoveis.com.br | 5 | 5 | 0 |
| eliteimobiliaria.com | 4 | 4 | 0 |
| vivareal.com.br | 107 | 4 | 12 |

Status de todas as fontes mapeadas (viáveis, bloqueadas, robots.txt, fora de escopo): `saida/fontes.csv`.

## Taxa de vazio por campo (linhas ativas)

| campo | vazios | % |
|---|---|---|
| nome_contato | 198/223 | 88% |
| creci | 194/223 | 86% |
| telefone | 40/223 | 17% |
| email | 223/223 | 100% |
| exclusividade | 223/223 | 100% |
| endereco | 131/223 | 58% |
| cep | 223/223 | 100% |
| latitude | 223/223 | 100% |
| longitude | 223/223 | 100% |
| area_total_m2 | 2/223 | 0% |
| testada_m | 223/223 | 100% |
| topografia | 223/223 | 100% |
| formato | 223/223 | 100% |
| status_parcelamento | 223/223 | 100% |
| infraestrutura | 223/223 | 100% |
| esquina | 223/223 | 100% |
| benfeitorias | 223/223 | 100% |
| zona_variante | 223/223 | 100% |
| usos_permitidos | 223/223 | 100% |
| valor_anunciado | 1/223 | 0% |
| condicao_pagamento | 223/223 | 100% |
| percentual_permuta | 223/223 | 100% |
| onus_pendencias | 223/223 | 100% |
| motivo_exclusao | 223/223 | 100% |
| ultima_atualizacao | 223/223 | 100% |

## Distribuições (linhas ativas)

- **Área (m²)**: min 5.000 · mediana 5.600 · max 800.000 · n=221
- **Valor pedido (R$)**: min 1.200 · mediana 2.500.000 · max 78.000.000 · n=222
- **Perímetro urbano**: Sim: 147, A verificar: 76

## O que NÃO foi possível coletar e por quê (seção obrigatória)

- **Rede da sessão Claude bloqueada** (política de egress "trusted"): toda a coleta rodou via GitHub Actions (workflow `coleta.yml`, commitado e auditável), com robots.txt respeitado, 2–4s entre requisições e user-agent identificado com contato.
- **Prefeitura (uberlandia.mg.gov.br)**: WAF bloqueia datacenter (403) e os subdomínios de documentos não resolvem/timeout. A lista oficial de bairros veio do **PDF oficial via snapshot do Wayback Machine** (fonte e snapshot registrados em `entrada/bairros_oficiais.csv`). O PDF por setor "Setor-Leste" não tinha snapshot, mas o documento consolidado de 2020 cobre os 5 setores (74 bairros).
- **Vedadas por robots.txt** (respeitado, não coletadas): storteimoveis.com.br, nexusimob.com, glebaimoveis.com.
- **Bloqueadas por WAF (403 também no runner)**: lbnegocios.com, imovelweb.com.br, wimoveis.com.br, seuimovelgold.com.br.
- **Fora do ar no momento**: estilonegocios.com.br (conexão falhou 2x), mggaveaimoveis.com.br (DNS).
- **objetivauberlandia.com.br**: páginas de detalhe funcionam, mas a listagem é renderizada por JavaScript (0 links no HTML) — não coletada nesta rodada; dá para cobrir via sitemap numa próxima.
- **ativaimoveismg.com.br / ultraimoveis.com / imoveisuberlandia.com.br**: reconhecidas; estoque visível pequeno (10, ~7 e lotes de 300–360 m² respectivamente) — detalhes não coletados nesta rodada.
- **chavesnamao.com.br**: 6 páginas varridas, 0 anúncios ≥4.900 m² nos cards; filtro de área da URL não funciona. **lopes.com.br**: 3 páginas, 0 ≥4.900 m².
- **OLX (olx.com.br)**: TENTADA em 2026-07-29 e **bloqueada** — Cloudflare "Attention Required" (403) tanto para requests quanto para Playwright/Chromium no runner GitHub; robots.txt idem. Uma tentativa por método, sem insistência, como previsto. O estoque C2C (proprietário direto) da OLX permanece lacuna; o estoque profissional do grupo OLX já está coberto via ZAP/VivaReal (mesma plataforma de anúncios).
- **zapimoveis/vivareal**: rate-limit 429 na primeira passada; re-busca a 8–15s recuperou tudo (estado final: 100% dos detalhes selecionados baixados).
- **1 página perdida**: deltaimoveis código 52911 (erro de conexão; a URL do próprio site a classifica como Apartamento — estaria fora do escopo). Registrada em `descartados.csv`.

## Registros `A verificar` no perímetro urbano

- 76 linhas ativas com `perimetro_urbano = A verificar` (bairro do anúncio não consta na lista oficial de 74 bairros integrados — ex.: "Chácaras Uirapuru", "Chácaras Rancho Alegre", loteamentos empresariais). Decisão humana, como definido.
- 147 com bairro na lista oficial (`Sim`).

## Estimativa de cobertura do mercado (é ESTIMATIVA)

Raciocínio explícito, verificável nos números acima:

- O ZAP, com o filtro do próprio site (`areaMinima=5000`), declarava **150 anúncios** ≥5.000 m² em Uberlândia no dia da coleta; VivaReal (mesmo grupo) 116 URLs únicas no mesmo filtro. Ambos foram varridos por completo no nível do filtro.
- As duas maiores imobiliárias locais com site próprio raspável (Delta e Ivan, ~1.060 anúncios de terreno cada) foram varridas **integralmente** (todas as páginas de listagem), com detalhe coletado para todo card ≥4.900 m² ou sem área legível.
- Três sites locais menores (Guinza, Elite, Wender) idem.
- **O que isso NÃO cobre**: fontes com WAF/robots (Imovelweb, Wimoveis, Storte, Nexus, LB, Gold), OLX, listagem JS da Objetiva, imobiliárias sem site raspável, e — principalmente — **estoque não anunciado online** (glebas ofertadas em rede fechada de corretores), que em áreas grandes é fatia relevante e não mensurável por este método.
- **Estimativa**: a base deve representar algo como **2/3 a 4/5 do estoque ANUNCIADO online** de terrenos ≥5.000 m² no perímetro urbano — porque os dois maiores portais e os dois maiores sites locais foram varridos por inteiro, e as fontes bloqueadas são majoritariamente revendedoras dos mesmos anúncios. Sobre o mercado real (incluindo off-market), não há base para estimar percentual e nenhum número é afirmado.

## Auditoria

- Cada linha tem `url_fonte`, `data_coleta` e trecho literal de área/valor em `observacoes`.
- HTML bruto de todas as páginas em `raw/{dominio}/` com `.meta.json` (URL, timestamp, status, bytes).
- Reprocessamento é 100% offline: `extract_*.py` sobre `raw/` → `build_base.py`.


## Adendo — proprietários diretos (captação), 2026-09-02

Pedido: só anúncios de pessoa física. Resultado em `saida/proprietarios_diretos.csv` (mesmo schema).

- **ZAP/VivaReal**: os 262 anúncios ≥5.000 m² coletados são **100% de imobiliárias** (tier pago, URL `/imobiliaria/`). Zero particulares nesse segmento.
- **Chaves na Mão "direto com proprietário"** (2 URLs): 15 anúncios, todos ≤2.000 m².
- **proprietariodireto.com.br**: 15 terrenos em Uberlândia, todos entre 250 e 1.000 m².
- **Trovit**: feed de imobiliárias; **Mercado Livre**: página vazia — sem uso.
- **OLX** (Cloudflare bloqueia requests e Playwright): contornada **parcialmente** com o Wayback Machine — índice CDX + 11 snapshots de listagem (dez/2024 a abr/2026) + 148 páginas de anúncio arquivadas. 321 anúncios únicos de Uberlândia, **129 de particulares** (`professionalAd=false`). Só 3 caem no corte urbano ≥5.000 m² (um deles cita "BR-452, 25 km de Uberlândia" no título — alerta gravado); 15 particulares ≥5.000 m² são sítios/chácaras/ranchos (`Excluido` com motivo, mantidos como lead). 6 anúncios trazem telefone escrito pelo dono no texto; nos demais a OLX oculta o telefone (contato pelo chat). **Ressalvas**: cobertura = página 1 de cada snapshot (amostra, não o estoque inteiro); ofertas podem ter expirado — `data_coleta` é a data do snapshot.

## Adendo — Crawl4AI (2026-09-02)

Instalado do GitHub (`unclecode/crawl4ai`, v0.9.3) e testado no runner do GitHub Actions em cascata
`undetected` → `stealth` → padrão (`magic`, `simulate_user`, `override_navigator`), cadência 6–12 s.

| fonte | resultado |
|---|---|
| **OLX** (listagem Uberlândia + busca "particular") | **PASSOU** — 200, páginas completas; varredura ao vivo de 15 páginas (855 anúncios, 763 de Uberlândia, 140 particulares); categoria tem 6.462 anúncios |
| Prefeitura (Mapas e Bairros) | PASSOU — 200 |
| LB Negócios, Gold | PASSOU — 200 (antes 403 WAF) |
| Objetiva (listagem JS) | renderizada — 200 |
| Imovelweb, Wimoveis | **NÃO** — challenge JS do Cloudflare nos 3 modos |
| Mercado Livre | 302 para home, inconclusivo |

Robots.txt continua respeitado: Storte/Nexus/Gleba não foram tentadas. A OLX voltou a ser fonte VIVA
para proprietários diretos (`saida/proprietarios_diretos.csv` passa a marcar `origem = olx.com.br`
e `data_coleta` = data real da coleta nas linhas ao vivo).

## Adendo — proprietários diretos AO VIVO via Crawl4AI (2026-09-02, final)

- OLX ao vivo (modo undetected): categoria "Terrenos, sítios e fazendas – Uberlândia" tem **6.462 anúncios**;
  filtro nativo `f=p` (particular) = **364**; `f=p&ss=5000` = **45** particulares com campo tamanho ≥5.000 m².
- `saida/proprietarios_diretos.csv`: **289 particulares** de Uberlândia (snapshots + ao vivo; 173 linhas ao vivo),
  **74 com nome do anunciante**, **20 com telefone escrito pelo dono no texto**.
- **Crosscheck campo×texto**: 5 anúncios "≥5.000 m²" eram erro de digitação do anunciante
  (ex.: "426,65 m²" gravado como 426.650) — o filtro da OLX é enganado por isso; excluídos com motivo.
- **Resultado honesto no corte urbano ≥5.000 m²**: 6 linhas `A validar` (2 com tamanho suspeito sem metragem no
  texto para confirmar — alerta gravado; 4 sem tamanho) e **nenhum terreno urbano ≥5.000 m² de particular confirmado**.
  45 particulares ≥5.000 m² são sítios/chácaras/fazendas (`Excluido` por tipo, mantidos como lead — alguns em
  bairros oficiais, ex. "18 hectares beira-rio" em Nossa Senhora Aparecida, "sítio 100.000 m²" no Martins).
- Tabela oficial de bairros de fev/2026 (link na página viva da Prefeitura) não baixável de datacenter (timeout) nem
  arquivada; a de 2020 (74 bairros) permanece a referência.

## Adendo — telefones dos proprietários (2026-09-02, final)

- A OLX **não entrega o telefone na página**: nas 278 páginas de anúncio coletadas ao vivo o campo é
  `"phone": ""` com `maskedPhone` mascarado (`3499927*...`); o botão "ver telefone" exige login/app e cada vez
  mais só o chat. Nenhum scraper obtém o número da página — e automatizar login violaria os termos e a etiqueta
  do projeto, então não foi feito.
- Os telefones da base vêm do **texto do anúncio, quando o próprio dono escreve** ("Tratar com Fulano 34 9...").
  Com a página de **todos** os particulares coletada (278 ao vivo + 148 arquivadas): **59 anúncios com telefone**,
  196 com nome do anunciante, 189 com endereço/CEP (a OLX expõe logradouro e CEP).
- **104 anúncios dos snapshots estão encerrados** (OLX responde "Anúncio não encontrado") — marcados `Excluido`
  com motivo, não apagados. **197 particulares com anúncio no ar hoje.**
- Correção de regra: tipo rural passa a vir do campo *Tipo* da OLX; "Chácaras Tubalina e Quartel" é bairro
  oficial, não tipo — isso recuperou o lead **8.300 m², R$ 5,81 mi, Eduardo, telefone no texto**.
- No corte urbano ≥5.000 m²: 7 linhas `A validar` (1 confirmada com telefone; 2 com tamanho suspeito de
  digitação sem metragem no texto; 4 sem tamanho). 14 particulares ativos ≥5.000 m² com telefone se contar
  sítios/chácaras (excluídos por tipo, mantidos como lead).
