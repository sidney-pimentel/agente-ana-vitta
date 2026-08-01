# Estudo de Mercado — App de Cessação do Tabagismo (Brasil + Global)

> Pesquisa executada em julho/2026. Todas as fontes estão listadas ao final.
> Números de mercado de consultorias privadas devem ser lidos como ordem de grandeza,
> não como precisão contábil — elas divergem entre si e o texto abaixo mostra as divergências.

---

## 1. O problema, em números

### 1.1 Global

| Indicador | Valor | Fonte |
|---|---|---|
| Usuários de tabaco no mundo (2024) | **1,2 bilhão** (era 1,38 bi em 2000) | OMS, 4ª ed. do relatório de tendências (out/2025) |
| Prevalência adulta | **1 em cada 5 adultos** | OMS 2025 |
| Homens usuários | ~1 bilhão (>80% do total) | OMS 2025 |
| Mulheres usuárias | 206 milhões (era 277 mi em 2010) | OMS 2025 |
| Usuários de cigarro eletrônico | **>100 milhões** | OMS 2025 |

Leitura: a queda global é real mas **lenta** (-27% em termos relativos desde 2010), e o vaping
criou um mercado adjacente de +100 milhões de pessoas que hoje **também querem parar** — e para
o qual quase não existe produto dedicado. A Cochrane publicou em 2025 a primeira revisão sobre
"intervenções para parar de vapar", sinal de que o campo está se abrindo agora.

### 1.2 Brasil

| Indicador | Valor | Fonte |
|---|---|---|
| Prevalência adulta (Vigitel 2023) | 9,2% | Vigitel/MS |
| Prevalência adulta (Vigitel 2024) | **11,5%** — alta | Vigitel/MS |
| Prevalência nas capitais (dado mais recente) | **11,6%**, retomando patamar de 2013 | Vigitel/MS |
| População adulta que se declara fumante | ~**19,6 milhões** | Vigitel 2023 (autodeclaração) |
| Custo para o país | O Brasil gasta **~5x mais** com doenças do tabaco do que a indústria lucra | Ministério da Saúde, 2025 |

**Este é o achado mais importante da pesquisa de mercado brasileira:** depois de quase
duas décadas de queda contínua (15,7% em 2006 → 9,0% em 2021), a prevalência **voltou a subir**
em 2024, retomando níveis de 2013. A Sociedade Brasileira de Pneumologia classificou como
"persistência da epidemia da nicotina", e a Revista Brasileira de Cancerologia publicou artigo
com o título explícito de "estagnação epidemiológica e a urgência de novas estratégias de
**comunicação** com o fumante".

Ou seja: **as autoridades brasileiras estão publicamente admitindo que o canal atual de
comunicação/tratamento parou de funcionar.** Isso é, literalmente, a tese de entrada de um
produto digital.

### 1.3 O gap de tratamento no Brasil

O SUS oferece, de graça, pelo Programa Nacional de Controle do Tabagismo (PNCT):
bupropiona 150 mg, goma de nicotina 2 mg e adesivos de 7/14/21 mg, além de grupos de apoio
e acompanhamento psicológico, via UBS. Em 2026 o programa foi ampliado com papel reforçado
do farmacêutico.

**O que o SUS entrega:** o remédio e ~4 sessões de grupo.
**O que o SUS não entrega:** o suporte nas 23 horas restantes do dia, o momento exato da fissura,
o registro do que aconteceu, o reengate depois de um deslize, e a manutenção após o 6º mês.

Esse é exatamente o espaço de um app. E é um espaço **complementar, não competidor** — o que
transforma o SUS de obstáculo em canal de distribuição.

---

## 2. Tamanho de mercado

### 2.1 Mercado total de cessação (inclui farmacêuticos e NRT)

| Fonte | 2025/2026 | Projeção | CAGR |
|---|---|---|---|
| Mordor Intelligence | US$ 37,7 bi (2026) | US$ 64,1 bi (2031) | 11,2% |
| Research&Markets | US$ 32,5 bi (2026) | US$ 50,5 bi (2032) | 7,6% |

Dentro desse bolo, a categoria **"behavioral support and services" é a de crescimento mais rápido
(CAGR 14,8%)** — é para lá que o dinheiro está migrando, e é onde o software vive.

### 2.2 Mercado digital (o mercado de fato endereçável)

| Segmento | Base | Projeção | CAGR |
|---|---|---|---|
| Digital therapeutics — cessação do tabagismo | US$ 2,4 bi (2024) | US$ 11,6 bi (2033) | 18,2% |
| **Apps de consumo para parar de fumar** | — | **US$ 1,5 bi (2033)** | **18,5%** |
| Digital therapeutics (geral) | US$ 12,45 bi (2026) | US$ 67,6 bi (2034) | 23,6% |

**A distinção entre as duas primeiras linhas é a decisão estratégica central deste negócio:**

- **US$ 11,6 bi** é o mercado de *DTx reembolsado* — vendido para empregadores, planos de saúde
  e sistemas públicos. Exige evidência clínica, ensaios randomizados, ciclo de venda longo.
- **US$ 1,5 bi** é o mercado de *app de consumo por assinatura* — App Store, Google Play, cartão
  de crédito do usuário. Entrada rápida, sem gatekeeper.

São ~7,7x de diferença de tamanho. A conclusão não é "escolher um", é **entrar pelo consumo
e usar os dados gerados para atravessar para o DTx** (ver `03-viabilidade.md`).

---

## 3. Concorrência

### 3.1 Mapa competitivo

| Produto | Origem | Método | Modelo | Posição |
|---|---|---|---|---|
| **Smoke Free** | UK | Tracking + estatísticas de saúde detalhadas, missões | Freemium, assinatura | Referência em *dados*; fraco em coaching |
| **Kwit** | França | Gamificação + TCC, cards e exercícios; validado pela OMS | Freemium + **parcerias corporativas**; 4,5M+ usuários | Melhor design; o mais próximo de "player global sério" |
| **QuitSure** | Índia | Programa de 6 dias, forte viés psicológico/reframing | Assinatura agressiva com descontos (US$ 99,98 → US$ 39,99). Receita estimada ~US$ 25k/mês | Marketing forte, base pequena |
| **QuitNow!** | ES | Contador + comunidade + indicadores OMS | Freemium | O mais citado em listas brasileiras |
| **Quit Genius / Pelago** | EUA | TCC estruturada + clínicos + farmacoterapia | **B2B2C puro** (empregador/plano) | Já atravessou para DTx; levantou capital de risco relevante |
| **I Am Sober** | EUA | Promessa diária + contador de dinheiro | Freemium | Genérico (vícios em geral) |
| **iCanQuit** | EUA (Fred Hutch) | ACT, base do maior RCT do setor | Acadêmico/gratuito | **Não é um negócio** — é a evidência |

### 3.2 Onde está o buraco

Cruzando os produtos acima, cinco lacunas se repetem:

1. **Ninguém opera o "depois do deslize".** Todos os apps têm um botão de "resetar contador".
   Resetar o contador é, do ponto de vista comportamental, a coisa **exatamente errada** a fazer
   (seção 2 de `02-metodo-respira.md`). É o app amplificando o *abstinence violation effect*.
2. **Ninguém liga o comportamental ao farmacológico.** Os apps ignoram o remédio; os programas
   de saúde ignoram o app. A evidência diz que os dois juntos rendem mais do que cada um
   isolado — e no Brasil o remédio é **gratuito**.
3. **Ninguém é brasileiro.** Os líderes são UK/FR/US/IN. Nenhum conhece UBS, PNCT, nem o preço
   real do maço no Brasil, nem fala como brasileiro fala.
4. **A base científica mais forte do setor está num app gratuito e acadêmico** (iCanQuit, ACT).
   Nenhum produto comercial construiu em cima dela de forma completa.
5. **Ninguém trata vaping seriamente** — 100M+ de pessoas, categoria com revisão Cochrane
   publicada apenas em 2025.

### 3.3 Preços praticados

| Produto | Preço observado |
|---|---|
| QuitSure | US$ 39,99/mês pós-desconto; ~R$ 73 no Brasil |
| Kwit | Freemium; premium por assinatura + licença corporativa |
| Apps genéricos BR | R$ 3,88 a R$ 20 (compras avulsas, sem programa) |

O mercado brasileiro de apps de cessação hoje é **precificado como utilitário barato**
(R$ 4–20) ou **importado a preço de dólar** (R$ 73+). Não existe nada no meio,
posicionado como *programa de saúde* a um preço brasileiro. Esse é o espaço de preço.

---

## 4. Economia de assinatura — benchmarks (2026)

Dados do *State of Subscription Apps 2026* (RevenueCat) e *State of In-App Subscriptions 2026* (Adapty):

| Métrica | Benchmark | Implicação para nós |
|---|---|---|
| Install → trial (global) | 10,9% | Funil de topo precisa de volume |
| Trial → pago (Saúde & Fitness) | **35%** (variando 25,6% global até 40–55% em algumas fontes) | Trial gratuito é obrigatório |
| Retenção na 1ª renovação — Saúde & Fitness | **30,3% — a PIOR de todas as categorias** | ⚠️ risco nº 1 do negócio |
| Churn mensal acumulado (plano mensal) | 42% em D30, 79% em D365 | Plano mensal sozinho não sustenta |
| Churn (plano anual) | 14% em D30, 48% em D365 | **Anual é ~3x melhor em D30** |
| Retenção D380 | anual 19,9% / mensal 14,2% / semanal 5,5% | Anual é o produto |
| Assinantes vindos de trial | retêm **1,4–1,7x melhor** que compra direta | Nunca vender sem trial |
| Planos semanais | já são 55,5% da receita de apps (era 43,3% em 2023) | Tentador, mas ver nota abaixo |

**Nota crítica sobre o plano semanal:** ele domina a receita do mercado de apps porque maximiza
extração de curto prazo — e tem a pior retenção (5,5% em D380). Para um produto de saúde cujo
resultado clínico leva 3–12 meses, plano semanal é **contraindicado**: cobra caro de quem vai
desistir e desalinha o incentivo do negócio com o resultado do usuário. Decisão registrada:
**não vamos vender plano semanal.**

**O dado mais importante desta tabela:** Saúde & Fitness tem a pior retenção de primeira
renovação de todas as categorias (30,3%). Qualquer modelo financeiro deste negócio que assuma
retenção "normal" está errado. Ver `03-viabilidade.md`.

---

## 5. Regulação

### 5.1 Brasil — ANVISA

A RDC 657/2022 é o marco de Software como Dispositivo Médico (SaMD), alinhado ao IMDRF.
O critério é a **finalidade pretendida** do software:

- Software de **bem-estar** → **excluído** do escopo, não exige registro.
- Software que **apoia diagnóstico, tratamento ou decisão clínica** → exige regularização.

**Decisão de posicionamento:** a v1 do produto será deliberadamente classificada como
**bem-estar e apoio comportamental**, com linguagem que:
- não faz diagnóstico,
- não prescreve nem ajusta dose de medicamento,
- **encaminha** para UBS/médico/farmacêutico para a parte farmacológica.

Isso permite lançar sem registro ANVISA. A trilha para SaMD Classe I/II fica no roadmap
(fase B2B2C), quando houver evidência para justificar o custo regulatório.

### 5.2 Brasil — LGPD

Dado de saúde é **dado pessoal sensível** (art. 5º, II). Exige base legal específica,
controle de acesso e segurança proporcional. Multa até 2% do faturamento, limitada a
R$ 50 milhões por infração.

Consequência arquitetural direta, e não negociável: **o app é local-first.** O registro de cada
cigarro, cada fissura e cada deslize vive **no dispositivo do usuário** por padrão. A nuvem só
recebe o que o usuário explicitamente sincronizar, e nunca recebe dado bruto identificável para
fins de analytics.

### 5.3 Lojas de aplicativo

App Store e Google Play restringem alegações de saúde. Regra editorial interna: nunca afirmar
"cura" ou "garante". Sempre "programa baseado em evidências", com as fontes citadas dentro do app.

---

## 6. Conclusões da pesquisa

1. **O mercado é grande e cresce ~18% a.a. no recorte digital**, e o segmento comportamental é
   o de crescimento mais rápido dentro do mercado total de cessação.
2. **O Brasil regrediu** — prevalência voltou ao patamar de 2013 — e as próprias autoridades
   apontam falha de *comunicação* com o fumante. Janela aberta.
3. **A concorrência é fraca no que importa:** ninguém trata deslize corretamente, ninguém
   integra farmacoterapia, ninguém é brasileiro, e a melhor evidência do setor está num app
   acadêmico gratuito que ninguém comercializou.
4. **A ameaça real não é o concorrente, é o churn.** Saúde & Fitness tem a pior retenção do
   mercado de assinaturas. O produto tem que ser desenhado *contra* isso desde o primeiro dia —
   e a resposta é plano anual + resultado clínico real, não mais notificações.
5. **Há dois mercados**: consumo (US$ 1,5 bi) e DTx reembolsado (US$ 11,6 bi). A estratégia é
   entrar pelo primeiro e atravessar para o segundo com a evidência gerada no caminho.

---

## Fontes

- [OMS — 1 em 5 adultos ainda usa tabaco (out/2025)](https://www.who.int/news/item/06-10-2025-who-tobacco-trends-report-1-in-5-adults-still-addicted-to-tobacco)
- [OMS — Global report on trends in prevalence of tobacco use 2000-2025, 4ª ed.](https://www.who.int/publications/i/item/9789240039322)
- [INCA — Prevalência do tabagismo](https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/observatorio-da-politica-nacional-de-controle-do-tabaco/dados-e-numeros-do-tabagismo/prevalencia-do-tabagismo)
- [SBPT — Dados do Vigitel reforçam alerta sobre a persistência da epidemia da nicotina](https://sbpt.org.br/portal/dados-do-vigitel-reforcam-alerta-sobre-a-persistencia-da-epidemia-da-nicotina-no-brasil/)
- [Revista Brasileira de Cancerologia — Estagnação Epidemiológica do Tabagismo e a Urgência de Novas Estratégias de Comunicação](https://rbc.inca.gov.br/index.php/revista/article/view/5566)
- [O Joio e o Trigo — Número de fumantes nas capitais volta a crescer](https://ojoioeotrigo.com.br/2025/05/em-retrocesso-historico-numero-de-fumantes-nas-capitais-brasileiras-volta-a-crescer-e-retoma-indices-de-2013/)
- [Ministério da Saúde — Dia Mundial Sem Tabaco 2025 (custo 5x o lucro da indústria)](https://www.gov.br/saude/pt-br/assuntos/noticias/2025/maio/dia-mundial-sem-tabaco-2025)
- [INCA — Tratamento do tabagismo (PNCT)](https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/programa-nacional-de-controle-do-tabagismo/tratamento)
- [CFF — SUS amplia oferta de tratamento para quem deseja parar de fumar (jun/2026)](https://site.cff.org.br/noticia/Noticias-gerais/08/06/2026/sus-amplia-oferta-de-tratamento-para-quem-deseja-parar-de-fumar-e-fortalece-papel-dos-farmaceuticos)
- [Mordor Intelligence — Smoking Cessation Aids Market](https://www.mordorintelligence.com/industry-reports/smoking-cessation-aids-market)
- [Smoking Cessation & Nicotine De-Addiction Products Market Forecast 2026-2032](https://finance.yahoo.com/news/smoking-cessation-nicotine-addiction-products-153200901.html)
- [Dataintelo — Digital Therapeutics Smoking Cessation Market](https://dataintelo.com/report/digital-therapeutics-smoking-cessation-market)
- [Dataintelo — Quit Smoking Apps Market](https://dataintelo.com/report/quit-smoking-apps-market)
- [Fortune Business Insights — Digital Therapeutics Market](https://www.fortunebusinessinsights.com/digital-therapeutics-market-103501)
- [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- [Adapty — Health & Fitness app subscription benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- [Business of Apps — App Subscription Trial Benchmarks 2026](https://www.businessofapps.com/data/app-subscription-trial-benchmarks/)
- [Kwit — blog / posicionamento](https://kwit.app/en/blog/posts/best-quit-smoking-app-ios-2026-kwit)
- [QuitSure — Google Play](https://play.google.com/store/apps/details?id=org.instaquit.app&hl=en_US)
- [ANVISA — RDC 657/2022, Perguntas e Respostas](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas/perguntas-respostas-rdc-657-de-2022-v1-01-09-2022.pdf)
- [Migalhas — Tratamento de dados em saúde: bases legais, limites e boas práticas](https://www.migalhas.com.br/depeso/449916/tratamento-de-dados-em-saude-bases-legais-limites-e-boas-praticas)
