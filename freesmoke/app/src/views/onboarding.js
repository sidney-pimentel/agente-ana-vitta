import { h, on, esc } from '../core/ui.js';
import { gastoAnual, formatarBRL } from '../core/stats.js';

export function render(ctx) {
  const el = h(`
    <div class="tela onboarding">
      <div class="marca">
        <span class="logo">Freesmoke</span>
        <p class="tagline">O programa que continua funcionando depois que você fuma um cigarro.</p>
      </div>

      <div class="card intro">
        <p>Este não é um contador de dias. É um programa de <strong>365 dias</strong>, em 7 fases, montado a partir do que a ciência mostrou que funciona — e desenhado para <strong>não quebrar</strong> se você tiver uma recaída.</p>
        <p class="mini">Três coisas que você precisa saber antes de começar:</p>
        <ul class="lista-regras">
          <li><strong>Você não vai reduzir aos poucos.</strong> Parar de uma vez, numa data marcada, tem resultado melhor — 22% contra 16% de abstinência em 6 meses num ensaio com 697 pessoas.</li>
          <li><strong>Você vai continuar fumando por enquanto.</strong> As primeiras semanas são de preparação e treino. Sem isso, a chance cai.</li>
          <li><strong>Um deslize não zera nada aqui.</strong> Nenhum contador reinicia. Nenhum. Você vai entender por quê.</li>
        </ul>
      </div>

      <form class="card" id="form-perfil">
        <h2>Seus números</h2>
        <label>Quantos cigarros você fuma por dia?
          <input type="number" name="cigarrosPorDia" min="1" max="120" required inputmode="numeric" placeholder="20">
        </label>
        <label>Quanto custa o seu maço? (R$)
          <input type="number" name="precoMaco" min="1" max="200" step="0.01" required inputmode="decimal" placeholder="12,00">
        </label>
        <label>Quantos cigarros vêm no maço?
          <input type="number" name="cigarrosPorMaco" min="1" max="40" value="20" required inputmode="numeric">
        </label>
        <label>Há quantos anos você fuma?
          <input type="number" name="anosFumando" min="0" max="80" inputmode="numeric" placeholder="15">
        </label>

        <div class="previa" id="previa" hidden></div>

        <button class="btn primario" type="submit">Começar o programa</button>
        <p class="mini legal">Seus dados ficam <strong>só neste aparelho</strong>. Nada é enviado para servidor nenhum.</p>
      </form>

      <details class="card">
        <summary>Já tenho um backup do Freesmoke</summary>
        <p class="mini">Cole o conteúdo do arquivo <code>.json</code> exportado antes:</p>
        <textarea id="import" rows="4" placeholder='{"schemaVersion":1, ...}'></textarea>
        <button class="btn secundario" id="btn-import" type="button">Restaurar backup</button>
      </details>
    </div>
  `);

  const form = el.querySelector('#form-perfil');
  const previa = el.querySelector('#previa');

  function atualizarPrevia() {
    const d = dados(form);
    if (!d.cigarrosPorDia || !d.precoMaco || !d.cigarrosPorMaco) {
      previa.hidden = true;
      return;
    }
    const anual = gastoAnual(d);
    const horas = Math.round((d.cigarrosPorDia * 11 * 365) / 60); // ~11 min de vida por cigarro (estimativa clássica)
    previa.hidden = false;
    previa.innerHTML = `
      <div class="destaque-num">${esc(formatarBRL(anual))}</div>
      <p>é o que o cigarro te custa <strong>por ano</strong>.</p>
      <p class="mini">${esc(formatarBRL(anual * 10))} em dez anos. E cerca de ${horas} horas por ano só acendendo, fumando e apagando.</p>
    `;
  }

  on(form, 'input', 'input', atualizarPrevia);
  form.addEventListener('input', atualizarPrevia);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = dados(form);
    if (!d.cigarrosPorDia || !d.precoMaco || !d.cigarrosPorMaco) return;
    ctx.store.set({ profile: d });
    ctx.ir('home', { substituir: true });
  });

  el.querySelector('#btn-import').addEventListener('click', () => {
    const r = ctx.store.importar(el.querySelector('#import').value);
    if (!r.ok) alert(r.erro);
    else ctx.ir('home', { substituir: true });
  });

  return el;
}

function dados(form) {
  const f = new FormData(form);
  return {
    cigarrosPorDia: num(f.get('cigarrosPorDia')),
    precoMaco: num(f.get('precoMaco')),
    cigarrosPorMaco: num(f.get('cigarrosPorMaco')),
    anosFumando: num(f.get('anosFumando')),
  };
}

function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
