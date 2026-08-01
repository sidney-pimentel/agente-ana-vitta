# Plano do Projeto — RESPIRA

## 1. Definição do produto

**Freesmoke** é um programa de 365 dias para parar de fumar, entregue como aplicativo, baseado no
**Método RESPIRA** (`02-metodo-respira.md`).

**Posicionamento:** não é um contador de dias. É um programa com fases, tarefas, critérios de
conclusão e um sistema que **não quebra quando a pessoa tem uma recaída**.

**Uma frase:** *o único programa para parar de fumar que continua funcionando depois que você
fuma um cigarro.*

**Classificação regulatória alvo (v1):** software de bem-estar e apoio comportamental —
fora do escopo de SaMD da RDC 657/2022. Não diagnostica, não prescreve, não ajusta dose.

---

## 2. Escopo

### v1 — MVP (o que está construído neste repositório)

| Módulo | Entrega |
|---|---|
| Onboarding | Perfil de consumo, preço do maço, cálculo de custo real |
| Fase R | Seleção de valores, frases em 1ª pessoa, Carta do Eu Comprometido |
| Fase E | Teste de Fagerström com escore e interpretação; registro de cigarros com gatilho e intensidade; Mapa de Gatilhos gerado |
| Fase S | Trilha de farmacoterapia com roteiro para a UBS; rede de apoio; checklist de ambiente; marcação da Data Zero |
| Fase P | Treino de urge surfing; planos SE-ENTÃO; kit SOS; ensaio do Dia Zero |
| Fase I | Modo crise das 72h com marcos horários |
| Fase R2 | Reengenharia semanal de gatilhos |
| Fase A | Marcos de identidade e manutenção |
| **SOS** | Protocolo de fissura de 5 passos, offline, gratuito, sempre acessível |
| **Protocolo de Deslize** | Fluxo completo de contenção + desarme do AVE + autópsia + reengate |
| **Radar** | Check-in de 3 toques e Índice de Risco |
| **Cofre** | Economia em tempo real com objetivo pré-comprometido |
| **Placar de Saúde** | Marcos fisiológicos com fonte citada |
| Dados | 100% local (localStorage), exportação e importação em JSON |
| PWA | Instalável, funciona offline |

### v2 — Comercial (M4–M9)
Contas e sincronização opcional · Pagamento (Pix + cartão) e trial de 7 dias · Notificações push
adaptativas pelo Índice de Risco · Áudios guiados de urge surfing · Rede de apoio com convite real ·
Publicação nas lojas via wrapper

### v3 — Escala (M10–M18)
Inglês e espanhol · Módulo de vaping (Cochrane 2025) · Programa "Devolver" (padrinho/apadrinhado) ·
Painel B2B2C para empresas · Coleta de desfecho para estudo · Integração formal com UBS/PNCT

### Fora de escopo — permanentemente
Prescrição ou ajuste de dose · Venda de medicamento ou de nicotina · Diagnóstico ·
Qualquer alegação de cura ou garantia de resultado

---

## 3. Arquitetura

### Princípios

1. **Local-first.** O dado de saúde nasce e vive no dispositivo. Dado de saúde é sensível pela
   LGPD; o que não sai do aparelho não vaza. Sync é opt-in explícito.
2. **Offline obrigatório.** A fissura não espera 4G. SOS, registro e check-in funcionam sem rede.
   Isso é requisito clínico, não conveniência.
3. **Sem build step na v1.** ES modules nativos, sem bundler, sem framework. Zero dependências de
   runtime = zero superfície de vulnerabilidade transitiva, zero quebra de build, e um produto
   que ainda roda daqui a cinco anos sem manutenção de toolchain. Um programa de 365 dias não
   pode depender de um `npm install` que apodrece.
4. **O conteúdo é dado, não código.** Todo o método vive em `app/src/content/`, em estruturas
   declarativas. Revisar o método não exige mexer em lógica.

### Stack

| Camada | v1 | v2+ |
|---|---|---|
| UI | HTML + CSS + ES modules | idem |
| Estado | módulo `store.js` + localStorage | + sync incremental |
| Conteúdo | JS declarativo em `content/` | + CMS interno |
| Servidor | Express estático | + API de contas e billing |
| Backend | — | Postgres, criptografia em repouso |
| Pagamento | — | Pix + cartão (gateway BR) |
| Testes | `node:test` | + Playwright |

### Estrutura

```
freesmoke/
├── docs/          pesquisa, método, viabilidade, plano
├── app/
│   ├── index.html
│   ├── styles.css
│   ├── manifest.webmanifest
│   ├── sw.js                    service worker (offline)
│   ├── src/
│   │   ├── main.js              bootstrap e roteamento
│   │   ├── core/
│   │   │   ├── store.js         estado, persistência, migração de schema
│   │   │   ├── program.js       motor de fases, progresso, critérios
│   │   │   ├── risk.js          Índice de Risco (Radar)
│   │   │   └── stats.js         dias livres, %, cofre, saúde
│   │   ├── content/
│   │   │   ├── method.js        as 7 fases e suas tarefas
│   │   │   ├── fagerstrom.js    FTND
│   │   │   ├── health.js        marcos fisiológicos com fonte
│   │   │   ├── values.js        valores ACT
│   │   │   └── triggers.js      taxonomia de gatilhos
│   │   └── views/               uma view por tela
│   └── tests/                   node:test sobre core/
└── server.js
```

---

## 4. Modelo de dados

```js
{
  schemaVersion: 1,
  profile:   { criadoEm, cigarrosPorDia, precoMaco, cigarrosPorMaco, anosFumando },
  values:    [{ id, rotulo, fraseiPessoal }],
  letter:    { texto, criadaEm },
  fagerstrom:{ respostas: {}, escore, nivel, respondidoEm },
  logs:      [{ id, ts, gatilho, contexto, intensidade, tipo: 'cigarro'|'deslize' }],
  cravings:  [{ id, ts, intensidadeInicial, intensidadeFinal, venceu, duracaoSeg }],
  checkins:  [{ id, data, fissura, humor, fumou }],
  plans:     [{ id, gatilho, se, entao, criadoEm }],
  quitDate:  ISO,                        // Data Zero
  support:   [{ nome, contato, avisado }],
  vault:     { objetivo, valorAlvo, imagem },
  phases:    { [faseId]: { concluidaEm, tarefas: { [tarefaId]: true } } },
  settings:  { notificacoes, tema }
}
```

**Métrica principal:** `taxaDiasLivres = diasLivres / diasDesdeDataZero`.
Deliberadamente **não** é "dias seguidos". Um deslize move 97,9% para 97,8%.
Isso é o Método na estrutura de dados, não só no texto.

---

## 5. Roadmap

| Fase | Prazo | Entrega | Critério de saída |
|---|---|---|---|
| **0 — Pesquisa** | ✅ concluída | Mercado, método, viabilidade | Documentado |
| **1 — MVP** | ✅ esta entrega | App funcional, local-first, PWA | Programa completo utilizável |
| **2 — Uso real** | M1–M2 | Fundador executa o programa inteiro | Data Zero cumprida; lista de correções do uso real |
| **3 — Beta fechado** | M2–M4 | 30–50 usuários recrutados | Retenção D30 ≥ 40%; ≥10 chegam ao Dia Zero |
| **4 — Comercial** | M4–M6 | Contas, pagamento, trial, landing | 100 assinantes pagantes |
| **5 — Escala BR** | M6–M12 | Lojas, conteúdo/SEO, parceria UBS | 2.000 assinantes; **kill criteria revistos no M6 e M9** |
| **6 — Evidência** | M12–M18 | Coleta de desfecho, publicação | Taxa de abstinência 7/30 dias medida |
| **7 — B2B2C + global** | M18+ | EN/ES, painel corporativo | Primeiros contratos |

---

## 6. Métricas

### Clínicas (as que importam de verdade)
- **Taxa de abstinência em 7 e 30 dias** — desfecho primário, medido desde a v1
- % de dias livres (média da base)
- % de usuários que chegam à Data Zero
- % de deslizes que **não** viram recaída — a métrica-assinatura do produto
- Autoeficácia ao longo do tempo (série do Radar)

### Produto
- Conclusão de cada fase · Uso do SOS e taxa de fissura vencida · Adesão ao check-in ·
  Retenção D1/D7/D30/D90/D365

### Negócio
- Install→trial, trial→pago · Retenção na 1ª renovação (alvo >60%, benchmark 30,3%) ·
  CAC por canal · LTV/CAC (alvo ≥3) · Receita recorrente

**Regra de instrumentação (LGPD):** analytics nunca recebe conteúdo. Nunca a Carta, nunca os
gatilhos escritos, nunca o texto dos planos. Só eventos e contagens, sem identificador pessoal.

---

## 7. Qualidade e manutenção

### 7.1 Qualidade do conteúdo — a mais importante

O ativo do produto é a credibilidade científica. Ela se perde uma vez só.

- **Toda afirmação de saúde no app tem fonte citada, visível ao usuário.** Sem exceção.
- **Revisão de evidência a cada 6 meses**: verificar novas revisões Cochrane do Tobacco
  Addiction Group e atualizar `content/` conforme necessário. Entrada fixa no calendário.
- **Revisão clínica externa** por pneumologista ou psicólogo especializado antes do lançamento
  comercial (fase 4).
- **Política editorial:** proibido "cura", "garantido", "sem esforço", "fácil"; proibido
  terrorismo com imagem; proibido prometer taxa de sucesso.

### 7.2 Qualidade técnica

- Testes automatizados sobre `core/` — o motor de programa, o cálculo de risco e as estatísticas.
  A regra de "deslize não zera nada" tem teste dedicado: é a regra que, se quebrar em silêncio,
  faz o app machucar o usuário.
- Migração de schema versionada (`schemaVersion`) — o dado do usuário é de 365 dias e é
  insubstituível. Nunca pode ser perdido em atualização.
- Exportação em JSON sempre disponível: o usuário é dono do dado dele, e isso é também o backup.
- CI a partir da fase 3.

### 7.3 Manutenção contínua

| Ritmo | Atividade |
|---|---|
| Semanal | Triagem de feedback; revisão de erros |
| Mensal | Revisão de métricas clínicas e de negócio; 1 melhoria de conteúdo |
| Trimestral | Revisão de retenção e preço; revisão de segurança/dependências |
| Semestral | **Revisão de evidência científica**; auditoria LGPD; revisão de conformidade das lojas |
| Anual | Revisão do método completo com revisor clínico externo |

### 7.4 Dívida técnica aceita conscientemente na v1

| Decisão | Motivo | Quando revisitar |
|---|---|---|
| Sem framework | Zero manutenção de toolchain; produto de 365 dias | Se o app passar de ~15 telas |
| localStorage em vez de IndexedDB | Volume pequeno e API síncrona simples | Se armazenar áudio/imagem |
| Sem contas | Não coletar dado de saúde em servidor sem necessidade | Fase 4 |
| Sem push | PWA sem backend | Fase 4 |

---

## 8. Riscos de execução

| Risco | Mitigação |
|---|---|
| Fundador para de fumar e perde o interesse no produto | O programa tem 365 dias — a fase de Ancoragem mantém o uso; e o beta fechado traz usuários externos no M2 |
| Fundador recai e associa o fracasso ao produto | O próprio método trata isso: deslize é dado, não veredito. Vale para o produto também |
| Escopo inflando | O MVP está fechado e entregue. v2 só depois do uso real |
| Construir sem usuário | Fase 2 é o fundador usando de verdade, antes de qualquer linha de v2 |
