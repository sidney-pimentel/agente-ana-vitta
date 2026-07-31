# Respira

Programa de 365 dias para parar de fumar, baseado em evidências.

> **O único programa para parar de fumar que continua funcionando depois que você fuma um cigarro.**

---

## Rodar

```bash
cd respira
npm start          # http://localhost:3000
npm test           # 52 testes, sem dependências
```

Zero dependências de runtime. Node 20+. Não há build step.

No celular, abra o endereço e use "Adicionar à tela de início" — é uma PWA instalável
que funciona offline.

---

## Publicar

O app é estático puro — não há build. Qualquer hospedagem de arquivos serve, desde que sirva
por **HTTPS** (sem isso o service worker não registra e a PWA não instala no celular).

### Netlify, por Git (recomendado)

O projeto `respira-programa` já existe. Em https://app.netlify.com/projects/respira-programa,
vá em **Project configuration → Build & deploy → Link repository** e aponte para
`sidney-pimentel/agente-ana-vitta`, com:

| Campo | Valor |
|---|---|
| Branch | `claude/smoking-cessation-app-ea0v8g` |
| Base directory | `respira` |
| Build command | *(vazio)* |
| Publish directory | `app` |

O `netlify.toml` deste diretório já define o resto: redirecionamento para o roteamento por
hash, CSP restritiva e `sw.js` fora do cache do CDN. A partir daí, todo push publica sozinho.

### Netlify, por linha de comando

De uma máquina com acesso à internet, dentro de `respira/`:

```bash
npx netlify-cli deploy --prod --dir=app
```

### No celular

Abra o endereço no navegador e use **"Adicionar à tela de início"** (Safari) ou
**"Instalar aplicativo"** (Chrome). Depois disso ele abre em tela cheia e funciona offline,
inclusive o SOS.

---

## O que é

| | |
|---|---|
| **Método** | RESPIRA — 7 fases, do dia -21 ao dia 365 |
| **Motor psicológico** | ACT (Terapia de Aceitação e Compromisso) |
| **Parada** | Abrupta, com Data Zero marcada — não gradual |
| **Farmacoterapia** | Ativada como tarefa do programa, com roteiro para a UBS/SUS |
| **Dados** | 100% no aparelho. Nenhum servidor. |
| **Preço do SOS** | Gratuito para sempre |

### As 7 fases

```
  R      E        S         P          I         R            A
Razões Exame  Segurança Preparação Impacto Reengenharia Ancoragem
 D-21   D-21    D-14       D-7       D0-D3    D4-D30      D31-D365
```

### Os 5 sistemas transversais

- **Radar** — check-in de 3 toques e Índice de Risco adaptativo (JITAI)
- **SOS** — protocolo de fissura de 5 minutos, offline, com *urge surfing*
- **Protocolo de Deslize** — contenção, desarme do AVE, autópsia e reengate
- **Cofre** — economia real com objetivo pré-comprometido
- **Placar de Saúde** — marcos fisiológicos, cada um com fonte citada

---

## A decisão que define o produto

Todo app de cessação do mercado tem um botão que **zera o contador** quando você fuma.

A evidência sobre recaída (Shiffman et al., *abstinence violation effect*) mostra que culpa e
queda de autoeficácia após o **primeiro** deslize não predisseram recaída — mas as respostas a
**cada deslize seguinte** predisseram, com quedas de autoeficácia acelerando a progressão.
Ou seja: o deslize em si é quase inofensivo. O que mata é a espiral de "já estraguei tudo".

Zerar o contador pega exatamente esse fator e o maximiza, com uma animação.

Aqui **nada zera**. A métrica principal é a **porcentagem de dias livres**, que um deslize move
em frações de ponto — e o app mostra o antes e o depois lado a lado no momento exato em que a
pessoa está convencida de que perdeu tudo.

Isso não é um detalhe de copy. Está no modelo de dados (`core/stats.js`), tem teste dedicado
(`tests/stats.test.js`) e é o passo 3 do Protocolo de Deslize.

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/01-pesquisa-de-mercado.md`](docs/01-pesquisa-de-mercado.md) | Mercado nacional e global, concorrência, benchmarks de assinatura, regulação |
| [`docs/02-metodo-respira.md`](docs/02-metodo-respira.md) | O método completo, com a evidência por trás de cada decisão |
| [`docs/03-viabilidade.md`](docs/03-viabilidade.md) | TAM/SAM/SOM, precificação, unit economics, cenários, riscos, veredito |
| [`docs/04-plano-do-projeto.md`](docs/04-plano-do-projeto.md) | Escopo, arquitetura, roadmap, métricas, plano de qualidade e manutenção |

---

## Estrutura

```
app/
├── index.html · styles.css · manifest.webmanifest · sw.js
├── src/
│   ├── main.js              roteamento e shell
│   ├── core/                store · stats · program · risk · ui
│   ├── content/             method · fagerstrom · health · values · triggers
│   └── views/               uma view por tela
└── tests/                   node:test sobre core/ e content/
server.js                    servidor estático, sem dependências
```

**O conteúdo é dado, não código.** Revisar o método é editar `src/content/`, sem tocar em lógica.

---

## Limites do produto — explícitos e permanentes

O Respira é um **programa de apoio comportamental**, classificado como software de bem-estar
(fora do escopo de SaMD da RDC 657/2022 da ANVISA).

**Não faz, e não vai fazer:**
- Diagnóstico
- Prescrição ou ajuste de dose de qualquer medicamento
- Venda de medicamento ou de nicotina
- Qualquer promessa de cura, garantia ou taxa de sucesso

Para a parte farmacológica, o app **encaminha** para a UBS ou para o médico. No Brasil, o SUS
oferece o tratamento de graça pelo Programa Nacional de Controle do Tabagismo.

Há um teste automatizado que falha se qualquer texto do app usar as palavras "cura",
"garantido" ou equivalentes.

**Em sofrimento psíquico grave: 188 (CVV), 24 horas, gratuito.**

---

## Privacidade

Dado de saúde é dado pessoal sensível pela LGPD (art. 5º, II). A forma mais segura de proteger
um dado é não coletá-lo.

- Tudo vive no `localStorage` do aparelho
- Não há backend, não há conta, não há analytics
- Exportação em JSON sempre disponível — o usuário é dono do dado, e essa é também a rota de backup
- "Apagar tudo" apaga mesmo
