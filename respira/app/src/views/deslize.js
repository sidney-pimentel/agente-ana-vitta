// PROTOCOLO DE DESLIZE — o diferencial do produto.
//
// Base: Shiffman et al. sobre abstinence violation effect. O achado que define esta tela:
// culpa e queda de autoeficácia APÓS O PRIMEIRO deslize não predisseram recaída — mas as
// respostas a cada deslize SEGUINTE predisseram, com quedas de autoeficácia acelerando a
// progressão. Ou seja: o deslize em si é quase inofensivo; o que mata é a espiral depois.
//
// Todo app do mercado responde a um deslize zerando o contador — pegando o único fator que
// comprovadamente prediz recaída e maximizando-o, com animação.
//
// Aqui: nada zera. A ordem dos passos é deliberada — contenção primeiro (a variável que
// separa deslize de recaída é quanto se fuma nas horas seguintes), desarme do AVE com o
// número na mão, e só então a análise.

import { h, on, esc } from '../core/ui.js';
import { taxaDiasLivres, formatarPct } from '../core/stats.js';
import { GATILHOS, gatilhoPorId } from '../content/triggers.js';

export function render(ctx) {
  // Este fluxo grava no store no meio do caminho (o registro do deslize, o plano novo).
  // Sem congelar, o redesenho global reiniciaria o protocolo no passo 1 — no exato
  // momento em que a pessoa está mais frágil.
  ctx.congelar();
  const el = h(`<div class="tela deslize"><div id="palco"></div></div>`);
  const palco = el.querySelector('#palco');
  const resposta = { gatilho: null, contexto: '', sentimento: '', esperava: '', quantidade: 1 };
  let passo = 0;

  const PASSOS = [acolher, conter, desarmar, autopsia, planoNovo, reengate];

  function desenhar() {
    palco.replaceChildren(h(PASSOS[passo](ctx, resposta)));
    ligar();
  }

  function avancar() {
    passo = Math.min(passo + 1, PASSOS.length - 1);
    desenhar();
  }

  function ligar() {
    const b = palco.querySelector('[data-avancar]');
    if (b) b.addEventListener('click', avancar);

    on(palco, '[data-gatilho]', 'click', (e, btn) => {
      resposta.gatilho = btn.dataset.gatilho;
      for (const x of palco.querySelectorAll('[data-gatilho]')) x.classList.toggle('sel', x === btn);
    });

    on(palco, 'input,textarea,select', 'change', (e, campo) => {
      if (campo.name) resposta[campo.name] = campo.value;
    });

    const registrar = palco.querySelector('[data-registrar]');
    if (registrar) {
      registrar.addEventListener('click', () => {
        ctx.store.push('logs', {
          gatilho: resposta.gatilho || 'automatico',
          contexto: resposta.contexto,
          intensidade: 8,
          tipo: 'deslize',
          sentimento: resposta.sentimento,
          esperava: resposta.esperava,
        });
        avancar();
      });
    }

    const salvarPlano = palco.querySelector('[data-salvar-plano]');
    if (salvarPlano) {
      salvarPlano.addEventListener('click', () => {
        const se = palco.querySelector('[name="se"]').value.trim();
        const entao = palco.querySelector('[name="entao"]').value.trim();
        if (se && entao) {
          ctx.store.push('plans', { gatilho: resposta.gatilho, se, entao });
        }
        avancar();
      });
    }

    const fim = palco.querySelector('[data-fim]');
    if (fim) fim.addEventListener('click', () => ctx.ir('home'));

    const sos = palco.querySelector('[data-sos]');
    if (sos) sos.addEventListener('click', () => ctx.ir('sos'));
  }

  desenhar();
  return el;
}

// --- Passo 1: acolher, em menos de 20 segundos -----------------------------
function acolher() {
  return `
    <div class="dz-passo">
      <h1>Ok. Você fumou um cigarro.</h1>
      <p class="grande">Isso é um <strong>deslize</strong>, não é uma recaída, e não é o fim do programa.</p>
      <p>A pesquisa sobre isso é bem específica: quem escorrega uma vez e retoma no mesmo dia tem uma trajetória muito diferente de quem escorrega e desiste. A diferença não está no cigarro. Está no que acontece nos próximos vinte minutos.</p>
      <p class="mini">Vamos fazer três coisas rápidas. Nenhuma delas é você se explicar.</p>
      <button class="btn primario grande" data-avancar>Vamos</button>
    </div>`;
}

// --- Passo 2: contenção (o passo mais importante) --------------------------
function conter() {
  return `
    <div class="dz-passo urgente">
      <p class="passo-n">Primeiro — e é agora</p>
      <h1>Onde está o resto do maço?</h1>
      <p class="grande">Jogue fora. Agora, antes de continuar lendo.</p>
      <p>O que separa um deslize de uma recaída não é o cigarro que você já fumou. É quantos você vai fumar nas próximas horas. É por isso que este passo vem antes de qualquer conversa.</p>
      <ul class="checklist-rapida">
        <li>O maço, no lixo.</li>
        <li>O isqueiro também.</li>
        <li>Se foi de alguém, avise essa pessoa que não vai aceitar outro.</li>
        <li>Saia do lugar onde você fumou.</li>
      </ul>
      <button class="btn primario grande" data-avancar>Feito</button>
    </div>`;
}

// --- Passo 3: desarme do AVE, com o número na mão --------------------------
function desarmar(ctx) {
  const s = ctx.store.get();
  const t = taxaDiasLivres(s, new Date());
  const fissuras = (s.cravings || []).filter((c) => c.venceu !== false).length;

  if (!t) {
    return `
      <div class="dz-passo">
        <h1>Você ainda nem chegou na sua Data Zero.</h1>
        <p class="grande">Então isso não foi nem deslize — você ainda está na preparação, e nesta fase você fuma normalmente.</p>
        <p>Registre mesmo assim: cada cigarro registrado deixa o seu Mapa de Gatilhos mais preciso, e é o mapa que vai te sustentar depois.</p>
        <button class="btn primario grande" data-avancar>Continuar</button>
      </div>`;
  }

  // A taxa hipotética SEM este deslize, para mostrar o quanto ele de fato move a métrica.
  const antes = t.diasTotais > 0 ? (t.diasLivres + (t.diasComDeslize > 0 ? 1 : 0)) / t.diasTotais : 1;

  return `
    <div class="dz-passo">
      <p class="passo-n">Segundo — o número</p>
      <h1>Nada foi zerado.</h1>
      <div class="comparativo">
        <div><span class="rot">Antes</span><span class="num">${esc(formatarPct(Math.min(1, antes)))}</span></div>
        <div class="seta">→</div>
        <div><span class="rot">Agora</span><span class="num destaque">${esc(formatarPct(t.taxa))}</span></div>
      </div>
      <p class="grande">Você está no dia ${t.diasTotais} do programa, com ${t.diasLivres} dias livres. Um cigarro não apagou ${t.diasLivres} dias.</p>
      <p>Nenhum contador reiniciou nesta tela. Não existe botão de zerar neste app, e isso não é gentileza — é desenho. A métrica que o Respira usa desde o primeiro dia é a <strong>porcentagem de dias livres</strong>, justamente porque ela quase não se move com um deslize. O que derruba a maioria das pessoas não é o cigarro: é a conta mental de que "estragou tudo". A conta real está aí em cima.</p>
      ${fissuras > 0 ? `<p class="mini">E mais: você já enfrentou ${fissuras} ${fissuras === 1 ? 'fissura' : 'fissuras'} sem fumar. Esta foi uma. Aquelas foram ${fissuras}.</p>` : ''}
      <button class="btn primario grande" data-avancar>Continuar</button>
    </div>`;
}

// --- Passo 4: autópsia (factual, sem julgamento) ---------------------------
function autopsia() {
  const chips = GATILHOS.map((g) => `<button type="button" class="chip" data-gatilho="${esc(g.id)}">${esc(g.rotulo)}</button>`).join('');
  return `
    <div class="dz-passo">
      <p class="passo-n">Terceiro — a autópsia</p>
      <h1>O que aconteceu, exatamente?</h1>
      <p class="mini">Sem julgamento. Isso é coleta de dado — o mesmo tipo de dado que vai deixar o seu plano mais forte amanhã do que era ontem.</p>

      <label>Qual foi o gatilho?</label>
      <div class="chips">${chips}</div>

      <label>Onde você estava e com quem?
        <input type="text" name="contexto" placeholder="Ex.: na sacada do escritório, com o pessoal do trabalho">
      </label>

      <label>O que você estava sentindo nos minutos antes?
        <input type="text" name="sentimento" placeholder="Ex.: irritado depois de uma reunião ruim">
      </label>

      <label>O que você esperava conseguir com esse cigarro?
        <input type="text" name="esperava" placeholder="Ex.: uma pausa; parar de pensar; me acalmar">
      </label>

      <button class="btn primario grande" data-registrar>Registrar</button>
    </div>`;
}

// --- Passo 5: o mapa fica mais forte ---------------------------------------
function planoNovo(ctx, resposta) {
  const g = gatilhoPorId(resposta.gatilho);
  const sugestoes = g ? g.sugestoes : [];
  return `
    <div class="dz-passo">
      <h1>Seu plano acabou de ficar mais forte.</h1>
      <p>${g ? `O gatilho <strong>${esc(g.rotulo)}</strong> entrou no seu mapa.` : 'Esse gatilho entrou no seu mapa.'} Ele estava te pegando de surpresa. A partir de agora, não está mais.</p>
      ${g ? `<p class="mini">O que o cigarro fazia ali: <em>${esc(g.funcao)}</em>. O substituto precisa cumprir essa mesma função — senão não substitui nada.</p>` : ''}
      ${sugestoes.length ? `<ul class="guia">${sugestoes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}

      <div class="plano-form">
        <p class="rotulo">Escreva o plano para a próxima vez</p>
        <label>SE<input type="text" name="se" placeholder="${g ? esc('eu estiver na situação: ' + g.rotulo.toLowerCase()) : 'acontecer isso'}"></label>
        <label>ENTÃO<input type="text" name="entao" placeholder="eu faço isto, imediatamente"></label>
        <p class="mini">A decisão é tomada agora, com a cabeça fria. Na hora da fissura você não decide — você executa o que já estava decidido.</p>
      </div>

      <button class="btn primario grande" data-salvar-plano>Salvar o plano</button>
    </div>`;
}

// --- Passo 6: reengate em 60 segundos --------------------------------------
function reengate(ctx) {
  const s = ctx.store.get();
  const t = taxaDiasLivres(s, new Date());
  return `
    <div class="dz-passo fim">
      <h1>O programa continua.</h1>
      <p class="grande">Ele não recomeçou. Não foi pausado. Não foi resetado. Continuou — com um dado a mais.</p>
      ${t ? `<p>Você está no dia ${t.diasTotais}, com ${esc(formatarPct(t.taxa))} de dias livres.</p>` : ''}
      <div class="card sutil">
        <p class="rotulo">Agora, nos próximos 60 segundos</p>
        <ul class="checklist-rapida">
          <li>Beba um copo de água.</li>
          <li>Saia do lugar onde você fumou, se ainda estiver nele.</li>
          <li>Mande uma mensagem para alguém da sua rede de apoio dizendo o que aconteceu. Não para se justificar — para não carregar sozinho.</li>
        </ul>
      </div>
      <button class="btn primario grande" data-fim>Voltar ao programa</button>
      <button class="btn texto" data-sos>Ainda estou com vontade — abrir o SOS</button>
    </div>`;
}
