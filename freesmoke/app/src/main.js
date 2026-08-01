import { criarStore } from './core/store.js';
import { emModoCrise } from './core/program.js';
import { h, on } from './core/ui.js';

import * as onboarding from './views/onboarding.js';
import * as home from './views/home.js';
import * as programa from './views/programa.js';
import * as sos from './views/sos.js';
import * as deslize from './views/deslize.js';
import * as numeros from './views/numeros.js';
import { TOOLS } from './views/tools.js';

const store = criarStore();

const ROTAS = {
  home: home.render,
  programa: programa.render,
  sos: sos.render,
  deslize: deslize.render,
  numeros: numeros.render,
  ...TOOLS,
};

const raiz = document.getElementById('app');
const pilha = [];

const ctx = {
  store,
  ir(rota, opts = {}) {
    if (!opts.substituir) pilha.push(location.hash.slice(2) || 'home');
    location.hash = `#/${rota}`;
  },
  voltar() {
    const anterior = pilha.pop();
    location.hash = `#/${anterior || 'home'}`;
  },
  recarregar() {
    desenhar();
  },
  /**
   * Telas em vários passos (SOS, Protocolo de Deslize) gravam no store no meio do
   * fluxo. Sem isso, a gravação dispararia o redesenho global e jogaria o usuário
   * de volta ao passo 1 — justamente nas duas telas em que isso seria mais grave.
   * O congelamento é sempre reavaliado a cada navegação (ver desenhar()).
   */
  congelar() {
    congelado = true;
  },
};

let congelado = false;

function rotaAtual() {
  const r = location.hash.replace(/^#\//, '').trim();
  return r || 'home';
}

function desenhar() {
  const estado = store.get();
  congelado = false; // cada view decide de novo se precisa congelar

  // Onboarding é obrigatório: sem perfil não há números, e sem números não há método.
  if (!estado.profile && rotaAtual() !== 'sos') {
    raiz.replaceChildren(onboarding.render(ctx));
    atualizarShell('onboarding');
    return;
  }

  const nome = rotaAtual();
  const render = ROTAS[nome] || home.render;
  const el = render(ctx);
  raiz.replaceChildren(el);
  raiz.scrollTop = 0;
  window.scrollTo(0, 0);
  atualizarShell(nome);
}

function atualizarShell(nome) {
  const estado = store.get();
  const crise = emModoCrise(estado);
  document.body.classList.toggle('modo-crise', crise);
  document.body.classList.toggle('sem-nav', nome === 'onboarding' || nome === 'sos');

  for (const b of document.querySelectorAll('.nav-item')) {
    b.classList.toggle('ativo', b.dataset.rota === nome);
  }
}

// --- Ligações globais ------------------------------------------------------

window.addEventListener('hashchange', desenhar);

on(document, '[data-voltar]', 'click', (e) => {
  e.preventDefault();
  ctx.voltar();
});

on(document, '.nav-item', 'click', (e, el) => {
  e.preventDefault();
  pilha.length = 0;
  location.hash = `#/${el.dataset.rota}`;
});

document.getElementById('botao-sos').addEventListener('click', () => {
  ctx.ir('sos');
});

// Redesenho agendado, nunca síncrono dentro do handler que gravou.
// Trocar o conteúdo de #app enquanto um campo de texto está focado dispara blur no
// meio da própria substituição e reentra em desenhar(). Agendar resolve isso e ainda
// agrupa várias gravações seguidas num único redesenho.
let agendado = false;
function agendarDesenho() {
  if (agendado) return;
  agendado = true;
  const quando = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : queueMicrotask;
  quando(() => {
    agendado = false;
    if (!congelado) desenhar();
  });
}

store.inscrever(agendarDesenho);

// Registro do service worker — offline é requisito clínico, não conveniência:
// a fissura não espera 4G.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

if (!location.hash) location.hash = '#/home';
desenhar();

// Exposto só para depuração manual no console do próprio usuário.
window.__freesmoke = { store, ctx, h };
