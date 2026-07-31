import { h, on, esc, cabecalho } from '../core/ui.js';
import {
  taxaDiasLivres,
  cofre,
  formatarBRL,
  formatarPct,
  minutosLivre,
  statsFissuras,
  mapaDeGatilhos,
  gastoAnual,
  gastoDiario,
} from '../core/stats.js';
import { MARCOS_SAUDE } from '../content/health.js';
import { gatilhoPorId } from '../content/triggers.js';

export function render(ctx) {
  const s = ctx.store.get();
  const agora = new Date();
  const t = taxaDiasLivres(s, agora);
  const c = cofre(s, agora);
  const f = statsFissuras(s);
  const mapa = mapaDeGatilhos(s);
  const min = minutosLivre(s, agora);

  const el = h(`
    <div class="tela numeros">
      ${cabecalho('Meus números', 'Tudo o que o programa mediu até aqui')}

      ${
        t
          ? `<section class="card">
               <p class="rotulo">Métrica principal</p>
               <div class="destaque-num">${esc(formatarPct(t.taxa))}</div>
               <p>${t.diasLivres} dias livres de ${t.diasTotais} dias de programa.</p>
               <p class="mini">Esta é a métrica que o Respira usa — não "dias seguidos". Um deslize move este número em frações de ponto, que é o tamanho real que ele tem.</p>
             </section>`
          : `<section class="card">
               <p class="rotulo">Custo atual do cigarro</p>
               <div class="destaque-num">${esc(formatarBRL(gastoAnual(s.profile)))}</div>
               <p class="mini">por ano · ${esc(formatarBRL(gastoDiario(s.profile)))} por dia · ${esc(formatarBRL(gastoAnual(s.profile) * 10))} em dez anos</p>
             </section>`
      }

      ${
        t
          ? `<section class="card">
               <h2>Cofre</h2>
               <div class="destaque-num verde">${esc(formatarBRL(c.economizado))}</div>
               <p class="mini">${c.cigarrosNaoFumados} cigarros não fumados. O cálculo já desconta os deslizes — nada aqui é inflado.</p>
               <button class="btn secundario" data-rota="cofre">${s.vault?.objetivo ? 'Mudar meu objetivo' : 'Definir um objetivo'}</button>
             </section>`
          : ''
      }

      <section class="card">
        <h2>Fissuras</h2>
        <div class="grade-num">
          <div><span class="n">${f.enfrentadas}</span><span class="l">enfrentadas</span></div>
          <div><span class="n verde">${f.vencidas}</span><span class="l">vencidas</span></div>
          <div><span class="n">${f.duracaoMedia ? Math.round(f.duracaoMedia / 60) + ' min' : '—'}</span><span class="l">duração média</span></div>
        </div>
        ${
          f.enfrentadas > 0
            ? `<p class="mini">Você venceu ${esc(formatarPct(f.taxa, 0))} das vontades que enfrentou. Guarde esse número: ele é a prova, com os seus próprios dados, de que a vontade passa sem você fazer nada com ela.</p>`
            : `<p class="mini">Você ainda não usou o SOS. Ele é o botão vermelho, sempre no canto da tela.</p>`
        }
      </section>

      ${
        mapa.total > 0
          ? `<section class="card">
               <h2>Mapa de gatilhos</h2>
               <p class="mini">${mapa.total} cigarros registrados.</p>
               <ul class="ranking">
                 ${mapa.ranking
                   .slice(0, 6)
                   .map((r) => {
                     const g = gatilhoPorId(r.gatilho);
                     return `<li>
                       <span class="rot">${esc(g ? g.rotulo : r.gatilho)}</span>
                       <span class="barra fina"><i style="width:${Math.round(r.pct * 100)}%"></i></span>
                       <span class="val">${r.n}</span>
                     </li>`;
                   })
                   .join('')}
               </ul>
               ${
                 mapa.horasCriticas.length
                   ? `<p class="mini">Horários críticos: ${mapa.horasCriticas.map((x) => `${x.hora}h`).join(', ')}.</p>`
                   : ''
               }
               ${
                 mapa.pctAutomaticos > 0
                   ? `<p class="mini destaque-texto">${esc(formatarPct(mapa.pctAutomaticos, 0))} dos seus cigarros foram automáticos — sem vontade real por trás. Esses são os mais fáceis de eliminar: eles não estavam resolvendo nada.</p>`
                   : ''
               }
               <button class="btn secundario" data-rota="mapa">Ver o mapa completo</button>
             </section>`
          : ''
      }

      <section class="card">
        <h2>Placar de saúde</h2>
        <p class="mini">Cada marco abaixo tem fonte citada. Nenhum número aqui é exagerado — credibilidade é o que este app tem de mais valioso.</p>
        <ul class="marcos">
          ${MARCOS_SAUDE.map((m) => {
            const ok = t && min >= m.minutos;
            return `<li class="${ok ? 'ok' : ''}">
              <span class="check">${ok ? '✓' : '○'}</span>
              <div>
                <h3>${esc(m.titulo)}</h3>
                <p>${esc(m.texto)}</p>
                <p class="fonte">Fonte: ${esc(m.fonte)}</p>
              </div>
            </li>`;
          }).join('')}
        </ul>
      </section>

      <section class="card">
        <h2>Seus dados</h2>
        <p class="mini">Tudo o que está aqui vive só neste aparelho. Exporte de vez em quando — este é o seu backup, e um programa de 365 dias não pode ser perdido numa troca de celular.</p>
        <button class="btn secundario" data-exportar>Exportar backup (.json)</button>
      </section>
    </div>
  `);

  on(el, '[data-rota]', 'click', (e, b) => ctx.ir(b.dataset.rota));

  const exp = el.querySelector('[data-exportar]');
  exp.addEventListener('click', () => {
    const blob = new Blob([ctx.store.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respira-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return el;
}
