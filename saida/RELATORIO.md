# RELATÓRIO — Base de terrenos Uberlândia/MG

> **Status: FASE 1 interrompida por bloqueio de rede do ambiente. Nenhum dado de imóvel foi coletado.**
> Data: 2026-07-29 · Sessão: Claude Code (ambiente remoto gerenciado)

## O que aconteceu

A política de egress do ambiente remoto onde esta sessão roda **bloqueia todo o
tráfego HTTPS de saída** para os domínios-alvo — não é bloqueio dos sites, é da
infraestrutura da sessão. Evidência:

- `curl` via proxy do ambiente: `CONNECT` recusado com 403 para
  `uberlandia.mg.gov.br`, `ivannegocios.com.br`, `deltaimoveis.com.br` e até
  `example.com` e `google.com` (teste de controle).
- Ferramenta `WebFetch` (fetch server-side): mesmo resultado, 403 para todos os
  destinos, inclusive `example.com`.
- O status do proxy registra: *"gateway answered 403 to CONNECT (policy denial)"*.
- A documentação do ambiente instrui a **não contornar** negativas de política e
  reportá-las.

A única via que funcionou foi a **busca web** (WebSearch, roda na infraestrutura
da Anthropic). Busca retorna títulos, URLs e trechos (snippets) — **não** o
conteúdo das páginas. Isso não atende o contrato de veracidade (sem página, não
há pareamento área↔preço↔telefone, não há HTML bruto em `raw/`, não há trecho
literal auditável), então **nenhum registro de imóvel foi criado**.

## Estado dos entregáveis

| Entregável | Estado |
|---|---|
| `entrada/bairros_oficiais.csv` | **Não gerado.** Prefeitura inacessível. Regra do prompt: não montar de memória nem de fonte alternativa sem aviso — cumprida. |
| `saida/fontes.csv` | Gerado como **lista de candidatas não verificadas** (23 domínios), origem: resultados de busca. Colunas `filtro_metragem`, `campos_disponiveis` e `estoque_estimado` vazias — exigiriam baixar páginas. |
| `saida/ofertas_terrenos_uberlandia.csv` | Não gerado (nenhuma coleta). |
| `saida/descartados.csv`, `saida/duplicatas_candidatas.csv`, `raw/` | Não gerados (nenhuma coleta). |

## O que a busca indicou (tudo snippet, nada verificado)

- `deltaimoveis.com.br` tem categoria "Área" separada (~164 anúncios no total,
  sem recorte de metragem) e `ivannegocios.com.br` ~1.032 em "Terreno" — números
  de snippet, que contam qualquer metragem, não estoque >5.000 m².
- Candidatas locais além das sementes: Guinza Imóveis, Storte, Nexus, Elite,
  Wender Bernardes, LB Negócios, MG Gávea, Ativa, Ultra, Arantes, Praxis (cidade
  não confirmada), Gleba Imóveis (cidade não confirmada).
- Portais: Chaves na Mão, Lopes, ZAP, VivaReal, Imovelweb, Wimoveis, Nestoria.

## Como desbloquear

Opções, por ordem de simplicidade:

1. **Ajustar a política de rede deste ambiente** em claude.ai/code
   (configuração do environment → network policy) para liberar acesso à
   internet, e reabrir a sessão. O plano das FASES 1–3 executa como escrito.
2. Rodar o mesmo prompt no **Claude Code CLI local** (a rede da máquina local
   não passa por esse egress).
3. Manter política restrita e **liberar domínio a domínio** — funciona para as
   sementes e a prefeitura, mas quebra a FASE 1B (descoberta de 15–30 fontes
   novas exige acesso amplo).
