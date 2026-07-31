import { h, on, esc } from '../core/ui.js';
import { FASES } from '../content/method.js';
import { faseAtual, progressoDaFase, tarefaConcluida } from '../core/program.js';
import { cabecalho } from '../core/ui.js';

export function render(ctx) {
  const s = ctx.store.get();
  const atual = faseAtual(s);

  const el = h(`
    <div class="tela programa">
      ${cabecalho('Método RESPIRA', '7 fases, do dia -21 ao dia 365')}

      <div class="trilha">
        ${FASES.map((f) => {
          const p = progressoDaFase(s, f);
          const eAtual = f.id === atual.id;
          return `<button class="trilha-item ${p.completa ? 'ok' : ''} ${eAtual ? 'atual' : ''}" data-fase="${esc(f.id)}">
                    <span class="letra">${esc(f.letra)}</span>
                    <span class="nome">${esc(f.nome)}</span>
                  </button>`;
        }).join('')}
      </div>

      <div id="detalhe"></div>
    </div>
  `);

  const detalhe = el.querySelector('#detalhe');

  function mostrar(faseId) {
    const f = FASES.find((x) => x.id === faseId);
    const p = progressoDaFase(s, f);
    detalhe.replaceChildren(
      h(`
      <section class="card fase-detalhe">
        <div class="fase-topo">
          <span class="letra grande">${esc(f.letra)}</span>
          <div>
            <h2>${esc(f.nome)}</h2>
            <p class="sub">${esc(f.subtitulo)}</p>
            <p class="mini">Dia ${f.dia[0]} a ${f.dia[1]} · ${p.feitas}/${p.total} passos</p>
          </div>
        </div>

        <p class="objetivo">${esc(f.objetivo)}</p>

        <ol class="tarefas">
          ${f.tarefas
            .map((t) => {
              const feita = tarefaConcluida(s, f.id, t);
              const auto = !!t.auto;
              return `
              <li class="tarefa ${feita ? 'feita' : ''}">
                <button class="marcador" data-toggle="${esc(f.id)}:${esc(t.id)}" ${auto && feita ? 'disabled' : ''} aria-label="Marcar">
                  ${feita ? '✓' : ''}
                </button>
                <div class="corpo">
                  <h3>${esc(t.titulo)}${t.critica ? '<span class="tag">essencial</span>' : ''}</h3>
                  ${t.desc ? `<p>${esc(t.desc)}</p>` : ''}
                  ${t.acao ? `<button class="btn secundario pequeno" data-rota="${esc(t.acao.view)}">${esc(t.acao.label)}</button>` : ''}
                  ${auto && feita ? '<p class="mini auto">Concluído automaticamente — você fez de verdade.</p>' : ''}
                </div>
              </li>`;
            })
            .join('')}
        </ol>
      </section>`)
    );
  }

  mostrar(atual.id);

  on(el, '[data-fase]', 'click', (e, b) => {
    for (const x of el.querySelectorAll('.trilha-item')) x.classList.toggle('aberta', x === b);
    mostrar(b.dataset.fase);
  });

  on(el, '[data-rota]', 'click', (e, b) => ctx.ir(b.dataset.rota));

  on(el, '[data-toggle]', 'click', (e, b) => {
    const [faseId, tarefaId] = b.dataset.toggle.split(':');
    ctx.store.update((st) => {
      st.phases[faseId] = st.phases[faseId] || { tarefas: {} };
      st.phases[faseId].tarefas = st.phases[faseId].tarefas || {};
      st.phases[faseId].tarefas[tarefaId] = !st.phases[faseId].tarefas[tarefaId];
      return st;
    });
  });

  return el;
}
