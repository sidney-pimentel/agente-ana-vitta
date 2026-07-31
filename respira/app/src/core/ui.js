// Helpers mínimos de DOM. Sem framework, de propósito:
// um programa de 365 dias não pode depender de um `npm install` que apodrece.

/** Cria elementos a partir de uma string de HTML. */
export function h(htmlString) {
  const t = document.createElement('template');
  t.innerHTML = htmlString.trim();
  return t.content.firstElementChild;
}

/** Escapa texto do usuário antes de interpolar em HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function on(root, seletor, evento, fn) {
  root.addEventListener(evento, (e) => {
    const alvo = e.target.closest(seletor);
    if (alvo && root.contains(alvo)) fn(e, alvo);
  });
}

export function cabecalho(titulo, subtitulo) {
  return `
    <header class="tela-head">
      <button class="voltar" data-voltar aria-label="Voltar">←</button>
      <div>
        <h1>${esc(titulo)}</h1>
        ${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}
      </div>
    </header>`;
}

export function toast(mensagem) {
  const el = h(`<div class="toast" role="status">${esc(mensagem)}</div>`);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

export function confirmar(mensagem) {
  return window.confirm(mensagem);
}

export function dataBR(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function pluralizar(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}
