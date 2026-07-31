// SOS — Protocolo de Fissura (5 minutos).
//
// A sequência é ACT (aceitação), não distração. A diferença importa:
// "distraia-se da fissura" ensina que a fissura é perigosa e precisa ser evitada.
// "observe a fissura sem obedecer a ela" ensina que ela passa sozinha — e ensinar isso
// é o mecanismo pelo qual o iCanQuit bateu o app padrão do NCI (28,2% x 21,1% em 12 meses).
//
// Esta tela é gratuita para sempre e funciona offline. Se alguém está em fissura às 2h da
// manhã, uma tela de pagamento é indefensável.

import { h, on, esc } from '../core/ui.js';
import { statsFissuras } from '../core/stats.js';
import { valorPorId } from '../content/values.js';

export function render(ctx) {
  ctx.congelar(); // ver deslize.js — o protocolo não pode ser reiniciado no meio
  const s = ctx.store.get();
  const hist = statsFissuras(s);
  const valorPrincipal = (s.values || [])[0];
  const estado = { passo: 0, inicial: null, final: null, inicio: Date.now(), timer: null };

  const el = h(`<div class="tela sos"><div id="palco"></div></div>`);
  const palco = el.querySelector('#palco');

  const PASSOS = [
    () => nomear(hist),
    () => medir('Quanto está agora?', 'inicial'),
    () => respirar(),
    () => surfar(hist),
    () => ancorar(valorPrincipal),
    () => medir('E agora, quanto está?', 'final'),
    () => fechar(),
  ];

  function desenhar() {
    palco.replaceChildren(h(PASSOS[estado.passo]()));
    ligarPasso();
  }

  function avancar() {
    limparTimer();
    estado.passo = Math.min(estado.passo + 1, PASSOS.length - 1);
    desenhar();
  }

  function limparTimer() {
    if (estado.timer) {
      clearInterval(estado.timer);
      estado.timer = null;
    }
  }

  function ligarPasso() {
    const btn = palco.querySelector('[data-avancar]');
    if (btn) btn.addEventListener('click', avancar);

    const sair = palco.querySelector('[data-sair]');
    if (sair) sair.addEventListener('click', () => ctx.ir('home'));

    on(palco, '[data-nota]', 'click', (e, b) => {
      const campo = b.dataset.campo;
      estado[campo] = Number(b.dataset.nota);
      avancar();
    });

    const cron = palco.querySelector('[data-cronometro]');
    if (cron) {
      let restante = Number(cron.dataset.cronometro);
      const label = palco.querySelector('[data-tempo]');
      const anel = palco.querySelector('[data-anel]');
      const total = restante;
      estado.timer = setInterval(() => {
        restante--;
        if (label) label.textContent = formatar(restante);
        if (anel) anel.style.setProperty('--p', String(1 - restante / total));
        if (restante <= 0) {
          limparTimer();
          const b = palco.querySelector('[data-avancar]');
          if (b) {
            b.disabled = false;
            b.textContent = b.dataset.prontoLabel || 'Continuar';
          }
        }
      }, 1000);
    }

    const salvar = palco.querySelector('[data-salvar]');
    if (salvar) {
      salvar.addEventListener('click', () => {
        const treino = !s.quitDate || new Date(s.quitDate) > new Date();
        ctx.store.push('cravings', {
          inicial: estado.inicial,
          final: estado.final,
          venceu: true,
          duracaoSeg: Math.round((Date.now() - estado.inicio) / 1000),
          treino,
        });
        ctx.ir('home');
      });
    }

    const fumei = palco.querySelector('[data-fumei]');
    if (fumei) {
      fumei.addEventListener('click', () => {
        ctx.store.push('cravings', {
          inicial: estado.inicial,
          final: estado.final,
          venceu: false,
          duracaoSeg: Math.round((Date.now() - estado.inicio) / 1000),
        });
        ctx.ir('deslize');
      });
    }
  }

  desenhar();
  return el;
}

// --- Passos ----------------------------------------------------------------

function nomear(hist) {
  return `
    <div class="sos-passo">
      <p class="passo-n">1 de 6 · Nomear</p>
      <h1>Isto é uma fissura.</h1>
      <p class="grande">Não é uma ordem. É uma sensação, e sensações passam.</p>
      ${
        hist.enfrentadas > 0
          ? `<p class="mini">Você já enfrentou <strong>${hist.enfrentadas}</strong> ${hist.enfrentadas === 1 ? 'fissura' : 'fissuras'} antes desta. Venceu ${hist.vencidas}.</p>`
          : `<p class="mini">Toda fissura dura, em média, de 3 a 5 minutos. Você vai ver isso acontecer nos próximos minutos.</p>`
      }
      <button class="btn primario grande" data-avancar>Vamos</button>
      <button class="btn texto" data-sair>Fechar</button>
    </div>`;
}

function medir(pergunta, campo) {
  const botoes = Array.from({ length: 11 }, (_, i) => `<button class="nota" data-nota="${i}" data-campo="${campo}">${i}</button>`).join('');
  return `
    <div class="sos-passo">
      <p class="passo-n">${campo === 'inicial' ? '2 de 6 · Medir' : '6 de 6 · Medir de novo'}</p>
      <h1>${esc(pergunta)}</h1>
      <p class="mini">Medir cria distância. Você deixa de ser a fissura e passa a ser quem observa a fissura.</p>
      <div class="escala">${botoes}</div>
      <p class="escala-legenda"><span>0 — nenhuma</span><span>10 — insuportável</span></p>
    </div>`;
}

function respirar() {
  return `
    <div class="sos-passo respirar">
      <p class="passo-n">3 de 6 · Respirar</p>
      <h1>Respiração 4-7-8</h1>
      <div class="bolha" data-anel>
        <span data-tempo>1:00</span>
      </div>
      <p class="grande">Inspire por 4 · segure por 7 · solte por 8</p>
      <p class="mini">Boa parte do que o cigarro "acalmava" era isto: você respirando fundo.</p>
      <button class="btn primario grande" data-avancar data-cronometro="60" data-pronto-label="Continuar" disabled>Respirando…</button>
    </div>`;
}

function surfar(hist) {
  const dur = hist.duracaoMedia ? Math.round(hist.duracaoMedia / 60) : null;
  return `
    <div class="sos-passo surfar">
      <p class="passo-n">4 de 6 · Surfar a onda</p>
      <h1>Não empurre. Observe.</h1>
      <div class="bolha grande-bolha" data-anel><span data-tempo>3:00</span></div>
      <ul class="guia">
        <li>Onde no corpo você sente essa vontade? Peito? Garganta? Estômago? Mãos?</li>
        <li>Ela é quente ou fria? Aperta ou puxa?</li>
        <li>Agora ela está subindo, parada, ou já começou a descer?</li>
        <li>Você não precisa fazer nada com ela. Só ficar olhando enquanto ela faz o que faz.</li>
      </ul>
      <p class="mini">A fissura é uma onda: sobe, chega no topo, quebra e vai embora. Ela nunca ficou subindo para sempre — nenhuma vez, na sua vida inteira.${dur ? ` As suas duraram em média ${dur} min.` : ''}</p>
      <button class="btn primario grande" data-avancar data-cronometro="180" data-pronto-label="A onda passou" disabled>Surfando…</button>
    </div>`;
}

function ancorar(valor) {
  const v = valor ? valorPorId(valor.id) : null;
  return `
    <div class="sos-passo ancorar">
      <p class="passo-n">5 de 6 · Ancorar</p>
      <h1>Por que você está fazendo isso</h1>
      ${
        valor && valor.frase
          ? `<blockquote class="citacao">${esc(valor.frase)}</blockquote>
             <p class="mini">Escrito por você, com as suas palavras.</p>`
          : v
            ? `<blockquote class="citacao">${esc(v.exemplo)}</blockquote>`
            : `<p class="grande">Você ainda não escreveu os seus valores. Faça isso na fase Razões — é o que vai aparecer aqui da próxima vez.</p>`
      }
      <button class="btn primario grande" data-avancar>Continuar</button>
    </div>`;
}

function fechar() {
  return `
    <div class="sos-passo fechar">
      <h1>Você teve a vontade e não fumou.</h1>
      <p class="grande">Isso é a habilidade. Você acabou de treinar.</p>
      <p class="mini">Cada fissura enfrentada torna a próxima um pouco menor. Não é força de vontade — é aprendizado, e ele se acumula.</p>
      <button class="btn primario grande" data-salvar>Registrar esta vitória</button>
      <button class="btn texto" data-fumei>Na verdade eu fumei</button>
    </div>`;
}

function formatar(seg) {
  const s = Math.max(0, seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
