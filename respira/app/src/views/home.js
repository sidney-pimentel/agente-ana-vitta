import { h, on, esc, dataBR } from '../core/ui.js';
import { faseAtual, proximoPasso, progressoDaFase, diasAteDataZero, emModoCrise, tarefaConcluida } from '../core/program.js';
import { taxaDiasLivres, cofre, formatarBRL, formatarPct, minutosLivre, diaISO, statsFissuras } from '../core/stats.js';
import { indiceDeRisco, ORIENTACAO_POR_NIVEL } from '../core/risk.js';
import { proximoMarco, marcosAtingidos, mensagem72h } from '../content/health.js';

export function render(ctx) {
  const s = ctx.store.get();
  const agora = new Date();

  if (emModoCrise(s, agora)) return telaCrise(ctx, s, agora);

  const fase = faseAtual(s, agora);
  const passo = proximoPasso(s, agora);
  const prog = progressoDaFase(s, fase);
  const risco = indiceDeRisco(s, agora);
  const orient = ORIENTACAO_POR_NIVEL[risco.nivel];
  const taxa = taxaDiasLivres(s, agora);
  const dz = diasAteDataZero(s, agora);
  const c = cofre(s, agora);
  const fez = jaFezCheckin(s, agora);

  const el = h(`
    <div class="tela home">
      <header class="home-head">
        <span class="logo pequeno">Respira</span>
        <button class="icone" data-rota-direta="ajustes" aria-label="Ajustes">⚙</button>
      </header>

      ${taxa ? blocoLivre(s, taxa, agora) : blocoContagem(dz, s)}

      ${
        !fez
          ? `<section class="card radar-cta">
               <h2>Check-in de hoje</h2>
               <p class="mini">3 toques. Menos de 15 segundos. É o que faz o app saber como falar com você hoje.</p>
               <button class="btn primario" data-rota="checkin">Fazer o check-in</button>
             </section>`
          : `<section class="card risco nivel-${risco.nivel}">
               <div class="risco-topo">
                 <h2>${esc(orient.titulo)}</h2>
                 <span class="risco-num">${risco.valor}</span>
               </div>
               <p>${esc(orient.texto)}</p>
               ${risco.fatores.length ? `<ul class="mini fatores">${risco.fatores.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
             </section>`
      }

      <section class="card fase">
        <div class="fase-topo">
          <span class="letra">${esc(fase.letra)}</span>
          <div>
            <h2>Fase ${esc(fase.nome)}</h2>
            <p class="sub">${esc(fase.subtitulo)}</p>
          </div>
        </div>
        <div class="barra"><i style="width:${Math.round(prog.pct * 100)}%"></i></div>
        <p class="mini">${prog.feitas} de ${prog.total} passos</p>
        ${
          passo && passo.tarefa
            ? `<div class="proximo">
                 <p class="rotulo">Seu próximo passo</p>
                 <h3>${esc(passo.tarefa.titulo)}</h3>
                 <p class="mini">${esc(passo.tarefa.desc || '')}</p>
                 ${
                   passo.tarefa.acao
                     ? `<button class="btn primario" data-rota="${esc(passo.tarefa.acao.view)}">${esc(passo.tarefa.acao.label)}</button>`
                     : `<button class="btn primario" data-concluir="${esc(fase.id)}:${esc(passo.tarefa.id)}">Marcar como feito</button>`
                 }
               </div>`
            : `<p class="ok">Fase em dia. Continue firme.</p>`
        }
        <button class="btn texto" data-rota="programa">Ver o programa completo →</button>
      </section>

      ${
        s.quitDate && taxa
          ? `<section class="card cofre">
               <h2>Cofre</h2>
               <div class="destaque-num verde">${esc(formatarBRL(c.economizado))}</div>
               <p class="mini">${c.cigarrosNaoFumados} cigarros que você não fumou.</p>
               ${
                 s.vault?.objetivo
                   ? `<div class="objetivo">
                        <p>${esc(s.vault.objetivo)}</p>
                        <div class="barra"><i style="width:${Math.min(100, Math.round((c.economizado / (s.vault.valorAlvo || 1)) * 100))}%"></i></div>
                        <p class="mini">${esc(formatarBRL(c.economizado))} de ${esc(formatarBRL(s.vault.valorAlvo))}</p>
                      </div>`
                   : `<button class="btn secundario" data-rota="cofre">Definir o que esse dinheiro vai comprar</button>`
               }
             </section>`
          : ''
      }

      <section class="acoes-rapidas">
        <button class="btn secundario" data-rota="registro">Registrar cigarro</button>
        <button class="btn secundario" data-rota="numeros">Meus números</button>
        <button class="btn secundario" data-rota="planos">Meus planos</button>
        <button class="btn secundario" data-rota="carta">Minha carta</button>
      </section>

      ${s.quitDate && taxa ? blocoDeslize() : ''}
    </div>
  `);

  ligar(el, ctx);
  return el;
}

function blocoLivre(s, taxa, agora) {
  const min = minutosLivre(s, agora);
  const prox = proximoMarco(min);
  const atingidos = marcosAtingidos(min);
  const ultimo = atingidos[atingidos.length - 1];
  return `
    <section class="card principal">
      <p class="rotulo">Dias livres desde a sua Data Zero</p>
      <div class="metrica-principal">
        <span class="numero">${taxa.diasLivres}</span>
        <span class="de">de ${taxa.diasTotais}</span>
      </div>
      <div class="taxa">${esc(formatarPct(taxa.taxa))} do caminho livre de cigarro</div>
      ${
        taxa.diasComDeslize > 0
          ? `<p class="mini nota-deslize">Você teve ${taxa.diasComDeslize} ${taxa.diasComDeslize === 1 ? 'dia' : 'dias'} com deslize. O programa continua — nada foi zerado.</p>`
          : ''
      }
      ${ultimo ? `<p class="marco">✓ ${esc(ultimo.titulo)} — ${esc(ultimo.texto)}</p>` : ''}
      ${prox ? `<p class="mini">Próximo marco: ${esc(prox.titulo)}</p>` : ''}
    </section>`;
}

function blocoContagem(dz, s) {
  if (!s.quitDate) {
    return `
      <section class="card principal preparo">
        <p class="rotulo">Você está na preparação</p>
        <h2>A Data Zero ainda não foi marcada</h2>
        <p class="mini">Isso é proposital. Preparação é a variável que mais separa quem para de quem apenas tenta. Continue nas fases — a data vem na fase Segurança.</p>
      </section>`;
  }
  return `
    <section class="card principal preparo">
      <p class="rotulo">Sua Data Zero</p>
      <div class="metrica-principal"><span class="numero">${dz}</span><span class="de">${dz === 1 ? 'dia' : 'dias'}</span></div>
      <p>${esc(dataBR(s.quitDate))}</p>
      <p class="mini">Até lá você continua fumando normalmente. Não reduza — treine.</p>
    </section>`;
}

function blocoDeslize() {
  return `
    <section class="card sutil">
      <p class="mini">Fumou? Registre. Não é confissão, é dado — e o app sabe exatamente o que fazer com ele.</p>
      <button class="btn contorno" data-rota="deslize">Registrar um deslize</button>
    </section>`;
}

function telaCrise(ctx, s, agora) {
  const horas = Math.floor((agora - new Date(s.quitDate)) / 36e5);
  const msg = mensagem72h(horas);
  const f = statsFissuras(s);
  const el = h(`
    <div class="tela crise">
      <div class="crise-head">
        <p class="rotulo">Fase Impacto — as 72 horas</p>
        <div class="crise-relogio"><span>${horas}</span><small>horas</small></div>
        <div class="barra grossa"><i style="width:${Math.min(100, Math.round((horas / 72) * 100))}%"></i></div>
      </div>

      <div class="card crise-msg">
        <p>${esc(msg.texto)}</p>
      </div>

      <div class="card crise-regra">
        <h2>Sua única meta hoje</h2>
        <p class="grande">Não fumar.</p>
        <p class="mini">Não é ser produtivo. Não é ser agradável. Não é estar bem. É só não fumar.</p>
      </div>

      ${
        f.enfrentadas > 0
          ? `<div class="card"><p class="mini">Você já enfrentou <strong>${f.enfrentadas}</strong> ${f.enfrentadas === 1 ? 'fissura' : 'fissuras'} e venceu <strong>${f.vencidas}</strong>. A média delas durou ${Math.round(f.duracaoMedia / 60)} minutos.</p></div>`
          : ''
      }

      <div class="acoes-rapidas">
        <button class="btn secundario" data-rota="carta">Ler minha carta</button>
        <button class="btn secundario" data-rota="apoio">Minha rede de apoio</button>
        <button class="btn secundario" data-rota="checkin">Check-in</button>
        <button class="btn contorno" data-rota="deslize">Eu fumei</button>
      </div>

      <p class="mini centro">O resto do app volta quando as 72 horas passarem. Agora não tem nada mais importante.</p>
    </div>
  `);
  ligar(el, ctx);
  return el;
}

function jaFezCheckin(s, agora) {
  const hoje = diaISO(agora);
  return (s.checkins || []).some((c) => c.data === hoje);
}

function ligar(el, ctx) {
  on(el, '[data-rota]', 'click', (e, b) => ctx.ir(b.dataset.rota));
  on(el, '[data-rota-direta]', 'click', (e, b) => ctx.ir(b.dataset.rotaDireta));
  on(el, '[data-concluir]', 'click', (e, b) => {
    const [faseId, tarefaId] = b.dataset.concluir.split(':');
    ctx.store.update((s) => {
      s.phases[faseId] = s.phases[faseId] || { tarefas: {} };
      s.phases[faseId].tarefas = s.phases[faseId].tarefas || {};
      s.phases[faseId].tarefas[tarefaId] = true;
      return s;
    });
  });
}
