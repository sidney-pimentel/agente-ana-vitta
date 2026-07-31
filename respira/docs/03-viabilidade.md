# Análise de Viabilidade — RESPIRA

> Veredito antecipado: **viável, com ressalvas duras.** O negócio se sustenta, mas não pelo
> caminho óbvio (app de consumo com tráfego pago). A viabilidade depende de três decisões
> estruturais que estão detalhadas na seção 6. Se qualquer uma das três for ignorada, o modelo
> não fecha.

---

## 1. Mercado endereçável (Brasil primeiro)

| Camada | Cálculo | Volume |
|---|---|---|
| **TAM** — fumantes adultos no Brasil | Vigitel (autodeclaração) | **19,6 milhões** |
| ↳ com smartphone e acesso a pagamento digital | ~85% | 16,7 milhões |
| **SAM** — quem declara querer parar | ~60% dos fumantes (padrão internacional consistente) | **10,0 milhões** |
| ↳ que tentam parar em um ano qualquer | ~40% do SAM | 4,0 milhões/ano |
| **SOM realista (5 anos)** | 0,5% dos que tentam, por ano | **~20 mil assinantes/ano** |

Com R$ 199/ano de ticket, 20 mil assinantes = **~R$ 4 milhões/ano de receita bruta no Brasil**.
Esse é o teto realista do mercado consumidor brasileiro isolado. É um bom negócio para um time
pequeno; não é um negócio de capital de risco sozinho.

**Global:** 1,2 bilhão de usuários de tabaco. Um único ponto percentual do mercado de apps de
cessação (US$ 1,5 bi projetado para 2033) = US$ 15 milhões/ano. É para lá que o produto escala,
mas depois de provado em português.

> ⚠️ **Premissas a validar:** os percentuais de "quer parar" (60%) e "tenta no ano" (40%) vêm
> de padrões internacionais, não de dado brasileiro primário. A conversão de 0,5% é uma estimativa
> conservadora minha, não um benchmark. Estes três números são os que mais movem o modelo —
> devem ser substituídos por dado real assim que o produto tiver 1.000 usuários.

---

## 2. Precificação

O enquadramento de preço é o ativo comercial mais forte deste produto, e vem de um número
que o próprio usuário conhece:

| Consumo | Gasto mensal com cigarro (maço a ~R$ 12) |
|---|---|
| 10 cigarros/dia | ~R$ 180/mês |
| 20 cigarros/dia | ~R$ 360/mês |
| 30 cigarros/dia | ~R$ 540/mês |

Contra isso:

| Plano | Preço | Equivalente |
|---|---|---|
| **Anual (principal)** | **R$ 199/ano** (R$ 16,58/mês) | ~1,4 maços. Menos de 5% do que a pessoa já gasta fumando |
| Mensal | R$ 39,90/mês | Existe para dar opção, precificado para empurrar ao anual |
| Manutenção (pós-12 meses) | R$ 79/ano | Preço de quem já parou |
| Semanal | **não existe** | Decisão deliberada — ver `01-pesquisa-de-mercado.md` §4 |
| Trial | 7 dias grátis | Obrigatório: assinantes vindos de trial retêm 1,4–1,7x melhor |

O anual é 2,5x mais barato que 12 meses do mensal. Isso não é generosidade — é o mecanismo
central de defesa contra churn: assinantes anuais retêm 19,9% em D380 contra 14,2% dos mensais,
e 14% de churn em D30 contra 42%.

**Gratuito para sempre:** o botão SOS, o contador e o Placar de Saúde. O SOS **nunca** entra no
paywall. Se alguém está em fissura às 2h da manhã, uma tela de pagamento é indefensável — e é,
na prática, o melhor marketing que o produto tem.

---

## 3. Unit economics

### 3.1 O funil, com benchmarks reais de 2026

```
1.000 instalações
   ├─ 10,9% install→trial ....................... 109 trials
   └─ 35,0% trial→pago (Saúde & Fitness) .......... 38 assinantes
                                        conversão total: 3,8%
```

Esse 3,8% é a realidade do mercado, não pessimismo. Todo modelo que assume mais que isso
sem dado próprio está errado.

### 3.2 Duas rotas de distribuição — a diferença é decisiva

| | Via lojas (App Store / Play) | Via web (PWA + Pix/cartão) |
|---|---|---|
| Taxa da plataforma | 30% ano 1, 15% depois | ~4,5% (gateway BR) |
| Receita líquida do anual R$ 199 | R$ 139 | **R$ 190** |
| CAC | igual | igual |
| Atrito de instalação | menor | maior |

### 3.3 LTV e CAC

Premissas: renovação de 52% ao fim do ano 1 (retenção D365 de assinante anual, benchmark
RevenueCat 2026), estável nos anos seguintes.

| | Via lojas | Via web |
|---|---|---|
| Receita líquida ano 1 | R$ 139 | R$ 190 |
| Receita líquida anos seguintes | R$ 169 | R$ 190 |
| **LTV líquido** | **R$ 322** | **R$ 396** |

CAC, com CPI de R$ 5,00 (faixa Brasil para saúde/bem-estar) e conversão de 3,8%:

**CAC = R$ 5,00 ÷ 3,8% = R$ 132 por assinante pagante.**

| | Via lojas | Via web |
|---|---|---|
| LTV / CAC | **2,4** | **3,0** |
| Payback | ~11 meses | ~8 meses |

**Leitura honesta:** LTV/CAC de 2,4 é *fraco*. O padrão de referência para negócio saudável é ≥3.
Só tráfego pago via loja **não fecha bem**. A conta só melhora com (a) rota web e (b) mistura
com canais de custo marginal baixo. Com 50% de aquisição orgânica, o CAC misto cai para ~R$ 66
e o LTV/CAC vai a ~6 — aí sim é um bom negócio.

**Conclusão de unit economics: o negócio é viável, mas o motor não pode ser tráfego pago.**
Tem que ser conteúdo, comunidade, SUS e boca a boca, com tráfego pago só como acelerador
sobre um funil já provado.

---

## 4. Cenários financeiros — 36 meses (Brasil)

Custos assumidos: operação enxuta (fundador + IA para desenvolvimento), infraestrutura
R$ 500–3.000/mês conforme escala, mais marketing variável. Não inclui salário do fundador
no ano 1.

### Cenário Conservador
| | M12 | M24 | M36 |
|---|---|---|---|
| Assinantes ativos | 800 | 2.800 | 6.500 |
| Receita bruta anualizada | R$ 159 k | R$ 557 k | R$ 1,29 M |
| Receita líquida | R$ 132 k | R$ 462 k | R$ 1,07 M |
| Custo total | R$ 145 k | R$ 380 k | R$ 720 k |
| **Resultado** | **–R$ 13 k** | **+R$ 82 k** | **+R$ 350 k** |

### Cenário Base
| | M12 | M24 | M36 |
|---|---|---|---|
| Assinantes ativos | 2.000 | 7.500 | 18.000 |
| Contratos B2B2C | 0 | 2 | 8 |
| Receita bruta anualizada | R$ 398 k | R$ 1,79 M | R$ 5,18 M |
| Receita líquida | R$ 330 k | R$ 1,49 M | R$ 4,30 M |
| Custo total | R$ 240 k | R$ 780 k | R$ 2,10 M |
| **Resultado** | **+R$ 90 k** | **+R$ 710 k** | **+R$ 2,20 M** |

### Cenário Otimista (com tração internacional a partir do M18)
| | M12 | M24 | M36 |
|---|---|---|---|
| Assinantes ativos | 4.500 | 22.000 | 70.000 |
| Contratos B2B2C | 1 | 6 | 25 |
| Receita bruta anualizada | R$ 940 k | R$ 5,4 M | R$ 19,6 M |
| **Resultado** | **+R$ 310 k** | **+R$ 2,6 M** | **+R$ 9,8 M** |

O ponto de equilíbrio operacional aparece entre **1.200 e 1.500 assinantes ativos** —
alcançável no ano 1 em qualquer dos três cenários. Esse é o número que importa.

---

## 5. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| **Churn de Saúde & Fitness (30,3% de retenção na 1ª renovação — a pior do mercado)** | Alta | Crítico | Plano anual como padrão; método de 365 dias com valor na fase de Ancoragem; plano de manutenção barato em vez de renovação cheia |
| **CAC insustentável em tráfego pago** | Alta | Alto | Conteúdo/SEO como canal primário; parceria SUS/UBS; programa "Devolver" para indicação |
| Usuário para de fumar e cancela (sucesso = churn) | Certa | Médio | Plano de manutenção a R$ 79/ano; o produto não briga contra o próprio resultado |
| Concorrente global lança em PT-BR | Média | Médio | Vantagem local (SUS/UBS/preço) não é replicável por importação |
| Reclassificação como SaMD pela ANVISA | Baixa | Alto | Linguagem de bem-estar auditada; nunca prescrever nem dosar; trilha regulatória já mapeada |
| Incidente com dado de saúde (LGPD) | Baixa | Crítico | Arquitetura local-first; nuvem só com sync explícito; sem dado bruto identificável em analytics |
| Rejeição em loja por alegação de saúde | Média | Médio | Política editorial: nunca "cura"/"garante"; fontes citadas dentro do app |
| Eficácia real abaixo do prometido | Média | Alto | Nunca prometer taxa de sucesso; medir e publicar o número real |

---

## 6. Veredito

**O negócio é viável.** Três condições, e nenhuma é opcional:

### Condição 1 — Web-first, loja depois
Publicar primeiro como PWA com pagamento direto (Pix + cartão). Isso preserva 25 pontos
percentuais de margem no ano 1 e leva LTV/CAC de 2,4 para 3,0. As lojas entram na fase 2,
quando o funil já estiver provado e a margem extra puder pagar a taxa.

### Condição 2 — Aquisição orgânica, não tráfego pago
Tráfego pago sozinho entrega LTV/CAC de 2,4, que não sustenta o negócio. O canal primário é
conteúdo (o próprio método publicado, com fontes), a parceria com UBS/PNCT — que é um canal de
distribuição público, gratuito e com credibilidade que dinheiro nenhum compra — e a indicação
via programa "Devolver". Pago só entra depois de o orgânico provar o funil.

### Condição 3 — B2B2C é o destino, não o começo
O mercado de DTx reembolsado é ~7,7x o mercado de app de consumo. Mas ele exige evidência.
O caminho é: consumo gera dados → dados geram estudo → estudo abre empregadores e operadoras.
Um contrato B2B2C tem CAC próximo de zero por vida coberta e é onde a margem de verdade mora.
Planejar para isso desde já significa **instrumentar desfecho clínico desde o dia 1** —
por isso o app mede taxa de abstinência de 7 e 30 dias desde a primeira versão.

### O que mudaria o veredito para "não vá"
- Se a retenção em D30 do assinante anual ficar abaixo de 60% (benchmark: 86%).
- Se a conversão trial→pago ficar abaixo de 15% (benchmark: 35%).
- Se o CAC orgânico não conseguir ficar abaixo de R$ 80 até o M9.

Estes três são os *kill criteria*. Devem ser medidos e revisados no M6 e no M9, e o resultado
respeitado.

### Investimento inicial

| Item | Valor |
|---|---|
| Desenvolvimento (fundador + IA) | R$ 0 em caixa |
| Infra ano 1 | R$ 6 k |
| Jurídico (termos, LGPD, contratos) | R$ 8 k |
| Marca, domínio, identidade | R$ 5 k |
| Conteúdo e SEO ano 1 | R$ 24 k |
| Reserva de marketing para teste de canal | R$ 30 k |
| **Total ano 1** | **~R$ 73 k** |

Risco de capital baixo, ponto de equilíbrio alcançável no ano 1, teto de mercado brasileiro de
~R$ 4 M/ano e teto global na casa das dezenas de milhões de dólares.

**Recomendação: seguir.** E o primeiro usuário é você — o que resolve, de graça, o problema
mais caro de qualquer produto de saúde digital: descobrir o que realmente falta quando a
fissura chega às 3h da manhã.
