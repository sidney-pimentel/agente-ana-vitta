// Telas menores do programa, agrupadas por proximidade de propósito.

import { h, on, esc, cabecalho, toast, dataBR } from '../core/ui.js';
import { VALORES } from '../content/values.js';
import { GATILHOS, gatilhoPorId } from '../content/triggers.js';
import { PERGUNTAS_FTND, calcularFTND } from '../content/fagerstrom.js';
import { mapaDeGatilhos, diasComRegistro, diaISO, formatarBRL, formatarPct, gastoDiario } from '../core/stats.js';
import { dataZeroMinima } from '../core/program.js';

const rotear = (el, ctx) => on(el, '[data-rota]', 'click', (e, b) => ctx.ir(b.dataset.rota));

// --- R — Valores -----------------------------------------------------------
function valores(ctx) {
  const s = ctx.store.get();
  const sel = new Map((s.values || []).map((v) => [v.id, v]));

  const el = h(`
    <div class="tela">
      ${cabecalho('Seus valores', 'Fase R — Razões')}
      <div class="card">
        <p>Escolha <strong>3</strong>. Não são metas — são direções de vida que o cigarro está atrapalhando.</p>
        <p class="mini">Por que não usamos medo de câncer: motivação por medo é emprestada e decai rápido. Valor é escolha sua, e por isso não expira às 3h da manhã do sétimo dia.</p>
      </div>
      <div class="lista-valores">
        ${VALORES.map((v) => {
          const escolhido = sel.has(v.id);
          return `<div class="card valor ${escolhido ? 'sel' : ''}" data-valor="${esc(v.id)}">
            <div class="valor-topo">
              <h3>${esc(v.rotulo)}</h3>
              <button class="marcador" data-toggle-valor="${esc(v.id)}">${escolhido ? '✓' : ''}</button>
            </div>
            ${
              escolhido
                ? `<label class="mini">Escreva com as suas palavras — a cena, não o conceito:
                     <textarea data-frase="${esc(v.id)}" rows="2" placeholder="${esc(v.exemplo)}">${esc(sel.get(v.id).frase || '')}</textarea>
                   </label>`
                : `<p class="mini exemplo">Ex.: ${esc(v.exemplo)}</p>`
            }
          </div>`;
        }).join('')}
      </div>
    </div>`);

  on(el, '[data-toggle-valor]', 'click', (e, b) => {
    const id = b.dataset.toggleValor;
    ctx.store.update((st) => {
      const atual = st.values || [];
      const existe = atual.find((v) => v.id === id);
      if (existe) st.values = atual.filter((v) => v.id !== id);
      else if (atual.length >= 3) toast('Escolha só 3. Desmarque um antes.');
      else st.values = [...atual, { id, rotulo: VALORES.find((v) => v.id === id).rotulo, frase: '' }];
      return st;
    });
  });

  on(el, '[data-frase]', 'change', (e, ta) => {
    const id = ta.dataset.frase;
    ctx.store.update((st) => {
      st.values = (st.values || []).map((v) => (v.id === id ? { ...v, frase: ta.value } : v));
      return st;
    });
    toast('Salvo.');
  });

  return el;
}

// --- R — Carta -------------------------------------------------------------
function carta(ctx) {
  const s = ctx.store.get();
  const texto = s.letter?.texto || '';
  const el = h(`
    <div class="tela">
      ${cabecalho('Carta do Eu Comprometido', 'Fase R — Razões')}
      <div class="card">
        <p>Uma mensagem de você — hoje, lúcido e decidido — para você no pior momento.</p>
        <p class="mini">O app vai devolver esta carta no primeiro dia, no terceiro, nos picos de risco e sempre que você abrir o SOS. Escreva para aquela pessoa, não para a plateia.</p>
        <details><summary>Não sei o que escrever</summary>
          <ul class="guia mini">
            <li>Por que você decidiu parar, com as palavras que você usaria com alguém de confiança.</li>
            <li>O que você quer que ele lembre quando estiver querendo desistir.</li>
            <li>O que você vai perder se voltar — e não é só saúde.</li>
            <li>Uma frase que só você entenderia.</li>
          </ul>
        </details>
        <textarea id="carta" rows="14" placeholder="Escreva aqui...">${esc(texto)}</textarea>
        <button class="btn primario" id="salvar">Salvar carta</button>
      </div>
    </div>`);

  el.querySelector('#salvar').addEventListener('click', () => {
    const t = el.querySelector('#carta').value.trim();
    if (t.length < 40) return toast('Escreva um pouco mais — isso vai te segurar num dia difícil.');
    ctx.store.set({ letter: { texto: t, criadaEm: new Date().toISOString() } });
    toast('Carta guardada.');
  });

  return el;
}

// --- E — Fagerström --------------------------------------------------------
function fagerstrom(ctx) {
  const s = ctx.store.get();
  const respostas = { ...(s.fagerstrom?.respostas || {}) };

  const el = h(`
    <div class="tela">
      ${cabecalho('Teste de Fagerström', 'Fase E — Exame')}
      <div class="card">
        <p>Seis perguntas. Mede a sua dependência <strong>física</strong> de nicotina.</p>
        <p class="mini">Este é o instrumento padrão usado pelo SUS e pela literatura internacional. O resultado é o número que você leva para a consulta na UBS.</p>
      </div>
      ${PERGUNTAS_FTND.map(
        (p) => `
        <div class="card pergunta" data-q="${esc(p.id)}">
          <h3>${esc(p.texto)}</h3>
          <div class="opcoes">
            ${p.opcoes.map((o, i) => `<button class="opcao ${respostas[p.id] === i ? 'sel' : ''}" data-resp="${esc(p.id)}:${i}">${esc(o.rotulo)}</button>`).join('')}
          </div>
        </div>`
      ).join('')}
      <div class="card" id="resultado"></div>
    </div>`);

  function mostrarResultado() {
    const completo = PERGUNTAS_FTND.every((p) => typeof respostas[p.id] === 'number');
    const box = el.querySelector('#resultado');
    if (!completo) {
      box.innerHTML = `<p class="mini">Responda todas as perguntas para ver o resultado.</p>`;
      return;
    }
    const r = calcularFTND(respostas);
    box.innerHTML = `
      <p class="rotulo">Seu escore</p>
      <div class="destaque-num">${r.escore}<small>/10</small></div>
      <h3>Dependência ${esc(r.nivel.toLowerCase())}</h3>
      <p>${esc(r.texto)}</p>
      <button class="btn primario" id="salvar-ftnd">Salvar resultado</button>`;
    box.querySelector('#salvar-ftnd').addEventListener('click', () => {
      ctx.store.set({ fagerstrom: { respostas, ...r, respondidoEm: new Date().toISOString() } });
      toast('Resultado salvo.');
      ctx.ir('farmaco');
    });
  }

  on(el, '[data-resp]', 'click', (e, b) => {
    const [q, i] = b.dataset.resp.split(':');
    respostas[q] = Number(i);
    for (const x of el.querySelectorAll(`[data-q="${q}"] .opcao`)) x.classList.remove('sel');
    b.classList.add('sel');
    mostrarResultado();
  });

  mostrarResultado();
  return el;
}

// --- E — Registro de cigarro ----------------------------------------------
function registro(ctx) {
  const s = ctx.store.get();
  const dias = diasComRegistro(s);
  const total = (s.logs || []).length;
  const posZero = s.quitDate && new Date() >= new Date(s.quitDate);

  const el = h(`
    <div class="tela">
      ${cabecalho('Registrar cigarro', posZero ? 'Isso vai abrir o Protocolo de Deslize' : 'Fase E — Semana de Registro')}
      ${
        posZero
          ? `<div class="card"><p>Você já passou pela Data Zero. Registrar um cigarro agora abre o <strong>Protocolo de Deslize</strong> — que é onde o app faz o trabalho que importa.</p>
             <button class="btn primario" data-rota="deslize">Abrir o protocolo</button></div>`
          : `
      <div class="card">
        <p class="mini">Você <strong>continua fumando</strong> nesta fase. Não reduza — registrar já quebra o piloto automático sozinho, e reduzir aos poucos antes de parar tem resultado pior do que parar de uma vez.</p>
        <p class="mini">${total} cigarros registrados em ${dias} ${dias === 1 ? 'dia' : 'dias'}. Meta: 5 dias e pelo menos 15 registros.</p>
      </div>

      <div class="card">
        <label>Qual foi o gatilho?</label>
        <div class="chips">
          ${GATILHOS.map((g) => `<button class="chip" data-gatilho="${esc(g.id)}">${esc(g.rotulo)}</button>`).join('')}
        </div>

        <label>Quanta vontade você tinha? <span class="mini">(0 = nenhuma, foi automático · 10 = insuportável)</span></label>
        <div class="escala compacta">
          ${Array.from({ length: 11 }, (_, i) => `<button class="nota" data-int="${i}">${i}</button>`).join('')}
        </div>

        <label>Onde / com quem? <span class="mini">(opcional)</span>
          <input type="text" id="contexto" placeholder="Ex.: cozinha, sozinho, depois do café">
        </label>

        <button class="btn primario" id="salvar" disabled>Registrar</button>
      </div>

      ${total >= 10 ? `<div class="card"><button class="btn secundario" data-rota="mapa">Ver meu Mapa de Gatilhos</button></div>` : ''}
      `
      }
    </div>`);

  let gatilho = null;
  let intensidade = null;
  const salvar = el.querySelector('#salvar');

  function checar() {
    if (salvar) salvar.disabled = !(gatilho && intensidade !== null);
  }

  on(el, '[data-gatilho]', 'click', (e, b) => {
    gatilho = b.dataset.gatilho;
    for (const x of el.querySelectorAll('[data-gatilho]')) x.classList.toggle('sel', x === b);
    checar();
  });

  on(el, '[data-int]', 'click', (e, b) => {
    intensidade = Number(b.dataset.int);
    for (const x of el.querySelectorAll('[data-int]')) x.classList.toggle('sel', x === b);
    checar();
  });

  if (salvar) {
    salvar.addEventListener('click', () => {
      ctx.store.push('logs', {
        gatilho,
        intensidade,
        contexto: el.querySelector('#contexto').value.trim(),
        tipo: 'cigarro',
      });
      toast('Registrado.');
      ctx.ir('registro', { substituir: true });
    });
  }

  rotear(el, ctx);
  return el;
}

// --- E — Mapa de gatilhos --------------------------------------------------
function mapa(ctx) {
  const s = ctx.store.get();
  const m = mapaDeGatilhos(s);

  const el = h(`
    <div class="tela">
      ${cabecalho('Mapa de Gatilhos', `${m.total} cigarros registrados`)}
      ${
        m.total < 10
          ? `<div class="card"><p>Ainda faltam registros para o mapa ficar confiável. Continue registrando por alguns dias.</p>
             <button class="btn primario" data-rota="registro">Registrar cigarro</button></div>`
          : `
      <div class="card">
        <h2>Seus gatilhos dominantes</h2>
        <ul class="ranking">
          ${m.ranking
            .slice(0, 8)
            .map((r) => {
              const g = gatilhoPorId(r.gatilho);
              return `<li>
                <span class="rot">${esc(g ? g.rotulo : r.gatilho)}</span>
                <span class="barra fina"><i style="width:${Math.round(r.pct * 100)}%"></i></span>
                <span class="val">${r.n} · ${esc(formatarPct(r.pct, 0))}</span>
              </li>`;
            })
            .join('')}
        </ul>
      </div>

      <div class="card">
        <h2>Seus horários críticos</h2>
        <p>${m.horasCriticas.map((x) => `<strong>${x.hora}h</strong> (${x.n})`).join(' · ')}</p>
        <p class="mini">O app usa esses horários para calcular o seu Índice de Risco ao longo do dia.</p>
      </div>

      <div class="card">
        <h2>Cigarros automáticos</h2>
        <div class="destaque-num">${esc(formatarPct(m.pctAutomaticos, 0))}</div>
        <p>dos seus cigarros foram fumados no piloto automático — vontade 2 ou menos, ou nenhum gatilho identificável.</p>
        <p class="mini">Esses são os mais fáceis de eliminar, porque não estavam resolvendo problema nenhum. Para a maioria das pessoas essa fatia é bem maior do que elas imaginavam.</p>
      </div>

      <div class="card">
        <h2>O que fazer com cada um</h2>
        ${m.ranking
          .slice(0, 4)
          .map((r) => {
            const g = gatilhoPorId(r.gatilho);
            if (!g) return '';
            return `<div class="sugestao">
              <h3>${esc(g.rotulo)}</h3>
              <p class="mini">O que o cigarro fazia aqui: <em>${esc(g.funcao)}</em></p>
              <ul class="guia">${g.sugestoes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>`;
          })
          .join('')}
        <button class="btn primario" data-rota="planos">Transformar isso em planos SE-ENTÃO</button>
      </div>`
      }
    </div>`);

  rotear(el, ctx);
  return el;
}

// --- S — Farmacoterapia ----------------------------------------------------
function farmaco(ctx) {
  const s = ctx.store.get();
  const ftnd = s.fagerstrom;

  const el = h(`
    <div class="tela">
      ${cabecalho('Farmacoterapia', 'Fase S — Segurança')}

      <div class="card alerta">
        <p><strong>O Respira não indica, não prescreve e não ajusta dose de nenhum medicamento.</strong> Esta tela prepara a sua conversa com o profissional de saúde. Quem decide é ele.</p>
      </div>

      <div class="card">
        <h2>Por que isso importa</h2>
        <p>A evidência é consistente: apoio comportamental combinado com farmacoterapia rende mais do que qualquer um dos dois sozinho. Análises do próprio ensaio do app de ACT que embasa este método mostraram que quem usou medicação teve resultado melhor.</p>
        <p class="mini">Fonte: revisão Cochrane consolidada (Addiction, 2024); análise secundária do ensaio iCanQuit.</p>
      </div>

      <div class="card destaque-sus">
        <h2>No Brasil isso é de graça</h2>
        <p>O SUS oferece, pelo Programa Nacional de Controle do Tabagismo, na UBS mais perto da sua casa:</p>
        <ul class="guia">
          <li>Adesivo de nicotina de 7 mg, 14 mg e 21 mg</li>
          <li>Goma de mascar de nicotina de 2 mg</li>
          <li>Bupropiona 150 mg</li>
          <li>Acompanhamento psicológico e grupos de apoio</li>
        </ul>
        <p class="mini">Fonte: INCA / Ministério da Saúde. Não precisa de encaminhamento — é só procurar a UBS.</p>
      </div>

      <div class="card">
        <h2>Roteiro para a consulta</h2>
        <p class="mini">Leve isto anotado ou mostre esta tela.</p>
        <ol class="guia">
          <li>"Quero parar de fumar e já marquei uma data: ${s.quitDate ? esc(dataBR(s.quitDate)) : '<em>(ainda vou marcar)</em>'}."</li>
          <li>"Fumo ${esc(String(s.profile?.cigarrosPorDia || '—'))} cigarros por dia${s.profile?.anosFumando ? `, há ${esc(String(s.profile.anosFumando))} anos` : ''}."</li>
          <li>${ftnd ? `"Fiz o teste de Fagerström e meu escore foi <strong>${ftnd.escore}/10</strong> — dependência ${esc(ftnd.nivel.toLowerCase())}."` : '<em>Faça o teste de Fagerström antes da consulta e leve o escore.</em>'}</li>
          <li>"Que apoio medicamentoso o senhor(a) recomenda para o meu caso?"</li>
          <li>"Devo começar antes da data de parar ou no dia?" <span class="mini">— há evidência de começar o adesivo cerca de 2 semanas antes.</span></li>
          <li>"Quais efeitos colaterais eu devo esperar e quando devo voltar?"</li>
        </ol>
        ${!ftnd ? `<button class="btn secundario" data-rota="fagerstrom">Fazer o teste de Fagerström</button>` : ''}
      </div>

      <div class="card">
        <h2>Qual é a sua decisão?</h2>
        <div class="opcoes coluna">
          <button class="opcao ${s.farmaco?.decisao === 'ubs' ? 'sel' : ''}" data-decisao="ubs">Vou procurar a UBS</button>
          <button class="opcao ${s.farmaco?.decisao === 'consultei' ? 'sel' : ''}" data-decisao="consultei">Já consultei e tenho meu tratamento</button>
          <button class="opcao ${s.farmaco?.decisao === 'particular' ? 'sel' : ''}" data-decisao="particular">Vou pelo médico particular</button>
          <button class="opcao ${s.farmaco?.decisao === 'sem' ? 'sel' : ''}" data-decisao="sem">Vou sem medicamento, ciente de que isso reduz minhas chances</button>
        </div>
      </div>
    </div>`);

  on(el, '[data-decisao]', 'click', (e, b) => {
    ctx.store.set({ farmaco: { decisao: b.dataset.decisao, decididoEm: new Date().toISOString() } });
    toast('Decisão registrada.');
  });

  rotear(el, ctx);
  return el;
}

// --- S — Rede de apoio -----------------------------------------------------
function apoio(ctx) {
  const s = ctx.store.get();
  const mensagem = `Oi! Decidi parar de fumar e escolhi você como parte da minha rede de apoio.

O que ajuda: atender se eu ligar num momento difícil; me perguntar como estou de vez em quando; comemorar comigo os marcos.

O que NÃO ajuda: me policiar, perguntar "você fumou?" o tempo todo, ou me julgar se eu escorregar. Se eu escorregar, o programa continua — não é o fim.

Minha data de parar é ${s.quitDate ? new Date(s.quitDate).toLocaleDateString('pt-BR') : 'em breve'}. Obrigado.`;

  const el = h(`
    <div class="tela">
      ${cabecalho('Rede de apoio', 'Fase S — Segurança')}
      <div class="card">
        <p>De 1 a 3 pessoas. Não precisa ser quem mais te ama — precisa ser quem atende o telefone.</p>
      </div>

      <div class="card">
        <h2>Suas pessoas</h2>
        <ul class="lista-apoio">
          ${(s.support || []).map((p, i) => `<li><strong>${esc(p.nome)}</strong> <span class="mini">${esc(p.contato || '')}</span><button class="btn texto" data-remover="${i}">remover</button></li>`).join('') || '<li class="mini">Ninguém ainda.</li>'}
        </ul>
        <label>Nome<input type="text" id="nome" placeholder="Ex.: Marina"></label>
        <label>Telefone ou @ <span class="mini">(fica só no seu aparelho)</span><input type="text" id="contato" placeholder="Ex.: (62) 9…"></label>
        <button class="btn primario" id="add">Adicionar</button>
      </div>

      <div class="card">
        <h2>Mensagem para mandar a elas</h2>
        <p class="mini">Copie e mande. Ela explica o que fazer — e principalmente o que não fazer.</p>
        <pre class="mensagem">${esc(mensagem)}</pre>
        <button class="btn secundario" id="copiar">Copiar mensagem</button>
      </div>
    </div>`);

  el.querySelector('#add').addEventListener('click', () => {
    const nome = el.querySelector('#nome').value.trim();
    if (!nome) return toast('Escreva ao menos o nome.');
    ctx.store.update((st) => {
      st.support = [...(st.support || []), { nome, contato: el.querySelector('#contato').value.trim(), avisado: false }];
      return st;
    });
  });

  on(el, '[data-remover]', 'click', (e, b) => {
    const i = Number(b.dataset.remover);
    ctx.store.update((st) => {
      st.support = (st.support || []).filter((_, j) => j !== i);
      return st;
    });
  });

  el.querySelector('#copiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      toast('Copiado.');
    } catch {
      toast('Selecione o texto e copie manualmente.');
    }
  });

  return el;
}

// --- S — Ambiente ----------------------------------------------------------
const ITENS_AMBIENTE = [
  ['maco', 'Jogar fora todos os maços, inclusive o "de emergência"'],
  ['isqueiro', 'Jogar fora isqueiros e fósforos'],
  ['cinzeiro', 'Jogar fora todos os cinzeiros'],
  ['carro', 'Limpar o carro por inteiro — o cheiro é gatilho'],
  ['casa', 'Lavar o que guarda cheiro: cortina, almofada, casaco'],
  ['sacada', 'Reorganizar o lugar onde você mais fumava — mude a cadeira de posição'],
  ['trabalho', 'Limpar a gaveta e a mesa do trabalho'],
  ['bolso', 'Revistar bolsos de casaco, mochila, bolsa'],
  ['avisar', 'Avisar quem mora com você para não deixar cigarro à vista'],
];

const ITENS_KIT = [
  ['agua', 'Garrafa de água sempre por perto'],
  ['boca', 'Algo para a boca: goma, bala de menta, canela em pau'],
  ['maos', 'Algo para as mãos: elástico, bola de apertar, chaveiro'],
  ['contato', 'O contato da rede de apoio salvo e fácil de achar'],
  ['carta', 'A sua carta acessível no celular'],
  ['snack', 'Petisco saudável para queda de açúcar (cenoura, castanha)'],
];

function checklistView(ctx, { titulo, sub, itens, chave, texto }) {
  const s = ctx.store.get();
  const marcados = s[chave] || {};
  const el = h(`
    <div class="tela">
      ${cabecalho(titulo, sub)}
      <div class="card"><p>${esc(texto)}</p></div>
      <div class="card">
        <ul class="checklist">
          ${itens
            .map(
              ([id, rot]) => `<li class="${marcados[id] ? 'ok' : ''}">
                <button class="marcador" data-check="${esc(id)}">${marcados[id] ? '✓' : ''}</button>
                <span>${esc(rot)}</span>
              </li>`
            )
            .join('')}
        </ul>
      </div>
    </div>`);

  on(el, '[data-check]', 'click', (e, b) => {
    const id = b.dataset.check;
    ctx.store.update((st) => {
      st[chave] = { ...(st[chave] || {}) };
      st[chave][id] = !st[chave][id];
      return st;
    });
  });

  return el;
}

const ambiente = (ctx) =>
  checklistView(ctx, {
    titulo: 'Limpar o ambiente',
    sub: 'Fase S — Segurança',
    itens: ITENS_AMBIENTE,
    chave: 'ambiente',
    texto:
      'Cada item aqui é um gatilho a menos esperando por você. Não é superstição: é remover a oportunidade de decidir errado num momento em que você não vai querer estar decidindo nada.',
  });

const kit = (ctx) =>
  checklistView(ctx, {
    titulo: 'Kit SOS físico',
    sub: 'Fase P — Preparação',
    itens: ITENS_KIT,
    chave: 'kit',
    texto: 'O que fica no bolso a partir da Data Zero. Monte antes — na hora da fissura você não vai montar nada.',
  });

// --- S — Data Zero ---------------------------------------------------------
function dataZero(ctx) {
  const s = ctx.store.get();
  const min = dataZeroMinima(s);
  const minISO = min.toISOString().slice(0, 10);

  const el = h(`
    <div class="tela">
      ${cabecalho('Sua Data Zero', 'Fase S — Segurança')}
      <div class="card">
        <h2>Você vai parar de uma vez</h2>
        <p>Não vai reduzir aos poucos. Num ensaio randomizado com 697 fumantes, quem parou de uma vez teve <strong>22%</strong> de abstinência em 6 meses; quem reduziu 75% antes teve <strong>16%</strong>.</p>
        <p class="mini">Fonte: Lindson-Hawley et al., Annals of Internal Medicine, 2016.</p>
      </div>

      <div class="card">
        <h2>Como escolher o dia</h2>
        <ul class="guia">
          <li>Evite uma semana de estresse extremo previsível — entrega grande, prova, mudança.</li>
          <li>Evite véspera de festa ou de viagem com bebida.</li>
          <li>Um dia de semana comum costuma funcionar melhor que fim de semana.</li>
          <li>Não escolha "quando eu estiver pronto". Ninguém fica pronto — você fica preparado, que é outra coisa.</li>
        </ul>
      </div>

      <div class="card">
        <label>Data Zero
          <input type="date" id="data" min="${minISO}" value="${s.quitDate ? s.quitDate.slice(0, 10) : ''}">
        </label>
        <p class="mini">A data mais próxima que o app permite é <strong>${esc(dataBR(min.toISOString()))}</strong>. Isso é proposital: preparação é a variável que mais separa quem para de quem só tenta. ${s.quitDate ? '' : 'Conforme você concluir as fases R, E e S, essa trava diminui.'}</p>
        <button class="btn primario" id="salvar">${s.quitDate ? 'Alterar a data' : 'Marcar a data'}</button>
      </div>

      ${s.quitDate ? `<div class="card"><p class="rotulo">Marcada para</p><div class="destaque-num">${esc(dataBR(s.quitDate))}</div></div>` : ''}
    </div>`);

  el.querySelector('#salvar').addEventListener('click', () => {
    const v = el.querySelector('#data').value;
    if (!v) return toast('Escolha uma data.');
    const d = new Date(`${v}T04:00:00`);
    if (d < min) return toast('Muito cedo. Termine a preparação primeiro.');
    ctx.store.set({ quitDate: d.toISOString() });
    toast('Data Zero marcada.');
  });

  return el;
}

// --- P — Planos SE-ENTÃO ---------------------------------------------------
function planos(ctx) {
  const s = ctx.store.get();
  const m = mapaDeGatilhos(s);
  const sugeridos = m.ranking.slice(0, 5).map((r) => gatilhoPorId(r.gatilho)).filter(Boolean);

  const el = h(`
    <div class="tela">
      ${cabecalho('Planos SE-ENTÃO', 'Fase P — Preparação')}
      <div class="card">
        <p>Um plano para cada gatilho. Formato fixo, sempre concreto:</p>
        <p class="exemplo-plano">"<strong>SE</strong> eu terminar o almoço, <strong>ENTÃO</strong> eu levanto da mesa e escovo os dentes imediatamente."</p>
        <p class="mini">A decisão é tomada agora, com a cabeça fria. Na hora da fissura você não decide nada — você só executa o que já estava decidido.</p>
      </div>

      <div class="card">
        <h2>Novo plano</h2>
        ${
          sugeridos.length
            ? `<label>Gatilho</label>
               <div class="chips">${sugeridos.map((g) => `<button class="chip" data-g="${esc(g.id)}">${esc(g.rotulo)}</button>`).join('')}</div>
               <div id="dica" class="mini"></div>`
            : `<p class="mini">Registre alguns cigarros na fase Exame para o app sugerir os seus gatilhos reais.</p>
               <label>Gatilho</label>
               <div class="chips">${GATILHOS.slice(0, 8).map((g) => `<button class="chip" data-g="${esc(g.id)}">${esc(g.rotulo)}</button>`).join('')}</div>
               <div id="dica" class="mini"></div>`
        }
        <label>SE<input type="text" id="se" placeholder="eu estiver tomando café na sacada"></label>
        <label>ENTÃO<input type="text" id="entao" placeholder="eu tomo o café em pé na cozinha e lavo a xícara logo em seguida"></label>
        <button class="btn primario" id="add">Salvar plano</button>
      </div>

      <div class="card">
        <h2>Seus planos <span class="mini">(${(s.plans || []).length} de 5)</span></h2>
        <ul class="lista-planos">
          ${(s.plans || [])
            .map((p, i) => {
              const g = gatilhoPorId(p.gatilho);
              return `<li>
                ${g ? `<span class="tag">${esc(g.rotulo)}</span>` : ''}
                <p><strong>SE</strong> ${esc(p.se)}<br><strong>ENTÃO</strong> ${esc(p.entao)}</p>
                <button class="btn texto" data-rm="${i}">remover</button>
              </li>`;
            })
            .join('') || '<li class="mini">Nenhum plano ainda.</li>'}
        </ul>
      </div>
    </div>`);

  let gsel = null;
  on(el, '[data-g]', 'click', (e, b) => {
    gsel = b.dataset.g;
    for (const x of el.querySelectorAll('[data-g]')) x.classList.toggle('sel', x === b);
    const g = gatilhoPorId(gsel);
    const dica = el.querySelector('#dica');
    if (g && dica) dica.innerHTML = `O que o cigarro fazia aqui: <em>${esc(g.funcao)}</em>. ${esc(g.sugestoes[0] || '')}`;
  });

  el.querySelector('#add').addEventListener('click', () => {
    const se = el.querySelector('#se').value.trim();
    const entao = el.querySelector('#entao').value.trim();
    if (!se || !entao) return toast('Preencha o SE e o ENTÃO.');
    ctx.store.push('plans', { gatilho: gsel, se, entao });
    toast('Plano salvo.');
  });

  on(el, '[data-rm]', 'click', (e, b) => {
    const i = Number(b.dataset.rm);
    ctx.store.update((st) => {
      st.plans = (st.plans || []).filter((_, j) => j !== i);
      return st;
    });
  });

  return el;
}

// --- P — Ensaio do Dia Zero ------------------------------------------------
function ensaio(ctx) {
  const s = ctx.store.get();
  const m = mapaDeGatilhos(s);
  const el = h(`
    <div class="tela">
      ${cabecalho('Ensaio do Dia Zero', 'Fase P — Preparação')}
      <div class="card">
        <p>Percorra mentalmente o seu dia da parada, hora a hora. Onde ficam os buracos que o cigarro preenchia?</p>
      </div>
      <div class="card">
        <h2>Seus horários críticos</h2>
        ${
          m.horasCriticas.length
            ? `<ul class="guia">${m.horasCriticas.map((x) => `<li><strong>${x.hora}h</strong> — o que você vai estar fazendo? O que vai fazer no lugar do cigarro?</li>`).join('')}</ul>`
            : '<p class="mini">Registre cigarros na fase Exame para o app mostrar os seus horários reais.</p>'
        }
      </div>
      <div class="card">
        <h2>O roteiro do dia</h2>
        <ul class="guia">
          <li><strong>Ao acordar:</strong> beba um copo de água grande antes de qualquer outra coisa. Mude a ordem da sua manhã.</li>
          <li><strong>Café:</strong> tome em lugar diferente do de sempre, e levante assim que terminar.</li>
          <li><strong>Deslocamento:</strong> carro limpo, água no porta-copos, podcast novo.</li>
          <li><strong>Pausas do trabalho:</strong> mantenha a pausa, tire o cigarro. Caminhe 5 minutos.</li>
          <li><strong>Depois do almoço:</strong> escove os dentes em até 2 minutos.</li>
          <li><strong>Fim do dia:</strong> é o horário de maior risco para a maioria. Tenha um plano combinado com alguém.</li>
          <li><strong>Antes de dormir:</strong> ritual novo de encerramento.</li>
        </ul>
        <p class="mini">Regra do dia: sua única meta é não fumar. Não é ser produtivo, não é ser agradável, não é estar bem.</p>
      </div>
      <div class="card">
        <button class="btn secundario" data-rota="planos">Transformar isso em planos SE-ENTÃO</button>
      </div>
    </div>`);
  rotear(el, ctx);
  return el;
}

// --- R2 — Reengenharia -----------------------------------------------------
function reengenharia(ctx) {
  const s = ctx.store.get();
  const m = mapaDeGatilhos(s);
  const el = h(`
    <div class="tela">
      ${cabecalho('Reengenharia', 'Fase R — dias 4 a 30')}
      <div class="card">
        <p>A nicotina já saiu. Agora o inimigo é o hábito — e hábito se desmonta uma rotina por vez, não todas de uma vez.</p>
        <p class="mini">A regra: identifique o que o cigarro <em>fazia</em> ali e instale um substituto que cumpra a <strong>mesma função</strong>. O cigarro depois do almoço quase nunca é sobre nicotina — é sobre encerrar a refeição e mudar de estado.</p>
      </div>
      ${
        m.ranking.length
          ? m.ranking
              .slice(0, 5)
              .map((r, i) => {
                const g = gatilhoPorId(r.gatilho);
                if (!g) return '';
                return `<div class="card">
                  <p class="rotulo">Semana ${i + 1}</p>
                  <h2>${esc(g.rotulo)}</h2>
                  <p class="mini">${r.n} cigarros registrados · função: <em>${esc(g.funcao)}</em></p>
                  <ul class="guia">${g.sugestoes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                </div>`;
              })
              .join('')
          : '<div class="card"><p class="mini">Sem mapa de gatilhos ainda. Ele é construído na fase Exame.</p></div>'
      }
    </div>`);
  return el;
}

// --- Cofre -----------------------------------------------------------------
function cofreView(ctx) {
  const s = ctx.store.get();
  const diario = gastoDiario(s.profile);
  const el = h(`
    <div class="tela">
      ${cabecalho('Cofre', 'O dinheiro precisa virar coisa')}
      <div class="card">
        <p>Contador de dinheiro economizado é abstrato — some do radar em duas semanas. Objetivo com nome e data, não.</p>
        <p class="mini">Incentivo financeiro tem suporte nas revisões Cochrane. Aqui ele é o seu próprio dinheiro, que você já não está queimando.</p>
      </div>
      <div class="card">
        <label>O que esse dinheiro vai comprar?
          <input type="text" id="objetivo" value="${esc(s.vault?.objetivo || '')}" placeholder="Ex.: a viagem para a praia em janeiro">
        </label>
        <label>Quanto custa? (R$)
          <input type="number" id="valor" step="0.01" min="1" value="${esc(String(s.vault?.valorAlvo || ''))}" placeholder="1400">
        </label>
        <div id="prazo" class="mini"></div>
        <button class="btn primario" id="salvar">Salvar objetivo</button>
      </div>
      <div class="card">
        <p class="mini">Você deixa de gastar cerca de <strong>${esc(formatarBRL(diario))}</strong> por dia · ${esc(formatarBRL(diario * 30))} por mês · ${esc(formatarBRL(diario * 365))} por ano.</p>
      </div>
    </div>`);

  function calcular() {
    const v = parseFloat(el.querySelector('#valor').value);
    const box = el.querySelector('#prazo');
    if (!v || !diario) return (box.textContent = '');
    const dias = Math.ceil(v / diario);
    box.textContent = `Nesse ritmo você chega lá em cerca de ${dias} dias.`;
  }

  el.querySelector('#valor').addEventListener('input', calcular);
  calcular();

  el.querySelector('#salvar').addEventListener('click', () => {
    const objetivo = el.querySelector('#objetivo').value.trim();
    const valorAlvo = parseFloat(el.querySelector('#valor').value);
    if (!objetivo || !valorAlvo) return toast('Preencha o objetivo e o valor.');
    ctx.store.set({ vault: { objetivo, valorAlvo } });
    toast('Objetivo definido.');
    ctx.ir('home');
  });

  return el;
}

// --- Radar — check-in de 3 toques ------------------------------------------
function checkin(ctx) {
  const resp = { fissura: null, humor: null, fumou: null };
  const el = h(`
    <div class="tela checkin">
      ${cabecalho('Check-in', '3 toques · menos de 15 segundos')}
      <div class="card">
        <h2>Como está a vontade de fumar hoje?</h2>
        <div class="escala compacta">${notas('fissura')}</div>
      </div>
      <div class="card">
        <h2>Como está o seu humor hoje?</h2>
        <div class="escala compacta">${notas('humor')}</div>
        <p class="escala-legenda"><span>0 — péssimo</span><span>10 — ótimo</span></p>
      </div>
      <div class="card">
        <h2>Fumou hoje?</h2>
        <div class="opcoes">
          <button class="opcao" data-fumou="nao">Não</button>
          <button class="opcao" data-fumou="sim">Sim</button>
        </div>
      </div>
      <div class="card">
        <button class="btn primario" id="salvar" disabled>Salvar check-in</button>
        <p class="mini">Só isso. Nunca mais que três perguntas — check-in que vira burocracia é check-in que ninguém faz, e aí o app fica cego.</p>
      </div>
    </div>`);

  const salvar = el.querySelector('#salvar');
  const checar = () => (salvar.disabled = !(resp.fissura !== null && resp.humor !== null && resp.fumou !== null));

  on(el, '[data-campo]', 'click', (e, b) => {
    resp[b.dataset.campo] = Number(b.dataset.nota);
    for (const x of el.querySelectorAll(`[data-campo="${b.dataset.campo}"]`)) x.classList.toggle('sel', x === b);
    checar();
  });

  on(el, '[data-fumou]', 'click', (e, b) => {
    resp.fumou = b.dataset.fumou === 'sim';
    for (const x of el.querySelectorAll('[data-fumou]')) x.classList.toggle('sel', x === b);
    checar();
  });

  salvar.addEventListener('click', () => {
    const hoje = diaISO(new Date());
    ctx.store.update((st) => {
      st.checkins = [...(st.checkins || []).filter((c) => c.data !== hoje), { data: hoje, ...resp }];
      return st;
    });
    if (resp.fumou) ctx.ir('deslize', { substituir: true });
    else ctx.ir('home', { substituir: true });
  });

  return el;

  function notas(campo) {
    return Array.from({ length: 11 }, (_, i) => `<button class="nota" data-campo="${campo}" data-nota="${i}">${i}</button>`).join('');
  }
}

// --- Ajustes ---------------------------------------------------------------
function ajustes(ctx) {
  const s = ctx.store.get();
  const el = h(`
    <div class="tela">
      ${cabecalho('Ajustes', '')}
      <div class="card">
        <h2>Meu perfil</h2>
        <label>Cigarros por dia<input type="number" id="cpd" value="${esc(String(s.profile?.cigarrosPorDia || ''))}"></label>
        <label>Preço do maço (R$)<input type="number" step="0.01" id="pm" value="${esc(String(s.profile?.precoMaco || ''))}"></label>
        <label>Cigarros por maço<input type="number" id="cpm" value="${esc(String(s.profile?.cigarrosPorMaco || 20))}"></label>
        <button class="btn primario" id="salvar-perfil">Salvar</button>
      </div>

      <div class="card">
        <h2>Seus dados</h2>
        <p class="mini">Tudo o que o Respira sabe sobre você está neste aparelho. Nada foi enviado para servidor nenhum — dado de saúde é dado sensível pela LGPD, e a forma mais segura de proteger um dado é não coletá-lo.</p>
        <button class="btn secundario" id="exportar">Exportar backup (.json)</button>
        <details>
          <summary>Restaurar de um backup</summary>
          <textarea id="import" rows="4" placeholder="Cole aqui o conteúdo do arquivo"></textarea>
          <button class="btn secundario" id="importar">Restaurar</button>
        </details>
      </div>

      <div class="card perigo">
        <h2>Apagar tudo</h2>
        <p class="mini">Apaga o programa inteiro deste aparelho. Não tem como desfazer.</p>
        <button class="btn contorno" id="apagar">Apagar todos os meus dados</button>
      </div>

      <div class="card">
        <h2>Sobre</h2>
        <p class="mini">Respira · Método RESPIRA · versão 1.0</p>
        <p class="mini">Programa de apoio comportamental baseado em evidências. <strong>Não é um dispositivo médico</strong>: não diagnostica, não prescreve e não ajusta dose de medicamento. Para a parte farmacológica, procure a UBS mais próxima ou o seu médico.</p>
        <p class="mini">Se você está em sofrimento psíquico grave, ligue <strong>188</strong> (CVV), 24 horas, de graça.</p>
      </div>
    </div>`);

  el.querySelector('#salvar-perfil').addEventListener('click', () => {
    ctx.store.update((st) => {
      st.profile = {
        ...st.profile,
        cigarrosPorDia: Number(el.querySelector('#cpd').value) || st.profile.cigarrosPorDia,
        precoMaco: Number(el.querySelector('#pm').value) || st.profile.precoMaco,
        cigarrosPorMaco: Number(el.querySelector('#cpm').value) || st.profile.cigarrosPorMaco,
      };
      return st;
    });
    toast('Perfil atualizado.');
  });

  el.querySelector('#exportar').addEventListener('click', () => {
    const blob = new Blob([ctx.store.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respira-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  el.querySelector('#importar').addEventListener('click', () => {
    const r = ctx.store.importar(el.querySelector('#import').value);
    toast(r.ok ? 'Backup restaurado.' : r.erro);
  });

  el.querySelector('#apagar').addEventListener('click', () => {
    if (!confirm('Apagar todos os dados do Respira neste aparelho? Isso não pode ser desfeito.')) return;
    if (!confirm('Tem certeza mesmo? Todo o seu histórico do programa será perdido.')) return;
    ctx.store.apagarTudo();
    location.hash = '#/home';
  });

  return el;
}

export const TOOLS = {
  valores,
  carta,
  fagerstrom,
  registro,
  mapa,
  farmaco,
  apoio,
  ambiente,
  kit,
  dataZero,
  planos,
  ensaio,
  reengenharia,
  cofre: cofreView,
  checkin,
  ajustes,
};
