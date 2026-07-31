// Estatísticas do programa.
//
// A DECISÃO MAIS IMPORTANTE DESTE ARQUIVO:
// a métrica principal do Respira é `taxaDiasLivres` (% de dias livres desde a Data Zero),
// e NÃO "dias seguidos sem fumar".
//
// Motivo, direto da evidência (Shiffman et al., abstinence violation effect):
// o que prediz recaída não é o deslize em si — é o colapso de autoeficácia que vem depois.
// Todo app do mercado tem um botão que zera o contador. Isso pega o único fator que
// comprovadamente prediz recaída e o maximiza, com animação.
//
// Aqui, um deslize no dia 47 leva a métrica principal de 100% para 97,9%.
// Nada zera. Nunca.

const DIA_MS = 24 * 60 * 60 * 1000;

export function diaISO(data) {
  const d = data instanceof Date ? data : new Date(data);
  return d.toISOString().slice(0, 10);
}

/** Dias corridos desde a Data Zero (0 = o próprio dia da parada). */
export function diasDesdeDataZero(estado, agora = new Date()) {
  if (!estado.quitDate) return null;
  const inicio = new Date(estado.quitDate);
  return Math.max(0, Math.floor((agora - inicio) / DIA_MS));
}

export function minutosLivre(estado, agora = new Date()) {
  if (!estado.quitDate) return 0;
  const desdeUltimoCigarro = ultimoCigarroDepoisDaDataZero(estado);
  const referencia = desdeUltimoCigarro || new Date(estado.quitDate);
  return Math.max(0, Math.floor((agora - referencia) / 60000));
}

function ultimoCigarroDepoisDaDataZero(estado) {
  if (!estado.quitDate) return null;
  const zero = new Date(estado.quitDate);
  const deslizes = (estado.logs || [])
    .filter((l) => new Date(l.ts) >= zero)
    .map((l) => new Date(l.ts))
    .sort((a, b) => b - a);
  return deslizes[0] || null;
}

/** Conjunto de dias (YYYY-MM-DD) em que houve pelo menos um cigarro após a Data Zero. */
export function diasComCigarro(estado) {
  if (!estado.quitDate) return new Set();
  const zero = new Date(estado.quitDate);
  const dias = new Set();
  for (const l of estado.logs || []) {
    const ts = new Date(l.ts);
    if (ts >= zero) dias.add(diaISO(ts));
  }
  return dias;
}

/**
 * A métrica principal.
 * Retorna { diasTotais, diasLivres, diasComDeslize, taxa } — taxa em 0..1.
 */
export function taxaDiasLivres(estado, agora = new Date()) {
  const dias = diasDesdeDataZero(estado, agora);
  if (dias === null) return null;
  const diasTotais = dias + 1; // inclui o dia de hoje
  const comCigarro = diasComCigarro(estado).size;
  const diasLivres = Math.max(0, diasTotais - comCigarro);
  return {
    diasTotais,
    diasLivres,
    diasComDeslize: comCigarro,
    taxa: diasTotais > 0 ? diasLivres / diasTotais : 1,
  };
}

/**
 * Sequência atual de dias livres.
 * Existe apenas como informação secundária — nunca como métrica principal,
 * nunca com destaque visual maior que a taxa, e nunca acompanhada de linguagem
 * de perda quando quebra.
 */
export function sequenciaAtual(estado, agora = new Date()) {
  if (!estado.quitDate) return 0;
  const comCigarro = diasComCigarro(estado);
  let n = 0;
  for (let i = 0; ; i++) {
    const d = new Date(agora.getTime() - i * DIA_MS);
    if (d < new Date(estado.quitDate)) break;
    if (comCigarro.has(diaISO(d))) break;
    n++;
    if (n > 20000) break;
  }
  return n;
}

// --- Consumo e dinheiro ----------------------------------------------------

export function precoPorCigarro(profile) {
  if (!profile || !profile.precoMaco || !profile.cigarrosPorMaco) return 0;
  return profile.precoMaco / profile.cigarrosPorMaco;
}

export function gastoDiario(profile) {
  if (!profile) return 0;
  return (profile.cigarrosPorDia || 0) * precoPorCigarro(profile);
}

export function gastoAnual(profile) {
  return gastoDiario(profile) * 365;
}

/**
 * Cofre: dinheiro economizado desde a Data Zero, descontando os cigarros
 * efetivamente fumados em deslizes. Honesto, não inflado.
 */
export function cofre(estado, agora = new Date()) {
  if (!estado.quitDate || !estado.profile) return { economizado: 0, cigarrosNaoFumados: 0 };
  const ms = Math.max(0, agora - new Date(estado.quitDate));
  const diasFracionados = ms / DIA_MS;
  const previstos = diasFracionados * (estado.profile.cigarrosPorDia || 0);
  const zero = new Date(estado.quitDate);
  const fumados = (estado.logs || []).filter((l) => new Date(l.ts) >= zero).length;
  const naoFumados = Math.max(0, previstos - fumados);
  return {
    economizado: naoFumados * precoPorCigarro(estado.profile),
    cigarrosNaoFumados: Math.floor(naoFumados),
  };
}

// --- Fissuras --------------------------------------------------------------

export function statsFissuras(estado) {
  const c = estado.cravings || [];
  const enfrentadas = c.length;
  const vencidas = c.filter((x) => x.venceu !== false).length;
  const duracoes = c.filter((x) => x.duracaoSeg > 0).map((x) => x.duracaoSeg);
  const duracaoMedia = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : 0;
  return {
    enfrentadas,
    vencidas,
    obedecidas: enfrentadas - vencidas,
    duracaoMedia,
    taxa: enfrentadas ? vencidas / enfrentadas : 1,
  };
}

// --- Mapa de gatilhos ------------------------------------------------------

export function mapaDeGatilhos(estado) {
  const contagem = new Map();
  const horas = new Array(24).fill(0);
  let automaticos = 0;

  for (const l of estado.logs || []) {
    contagem.set(l.gatilho, (contagem.get(l.gatilho) || 0) + 1);
    horas[new Date(l.ts).getHours()]++;
    if (l.gatilho === 'automatico' || (typeof l.intensidade === 'number' && l.intensidade <= 2)) automaticos++;
  }

  const total = (estado.logs || []).length;
  const ranking = [...contagem.entries()]
    .map(([gatilho, n]) => ({ gatilho, n, pct: total ? n / total : 0 }))
    .sort((a, b) => b.n - a.n);

  const horasCriticas = horas
    .map((n, h) => ({ hora: h, n }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  return { total, ranking, horasCriticas, automaticos, pctAutomaticos: total ? automaticos / total : 0 };
}

/** Dias distintos com registro — usado para saber se a Semana de Registro terminou. */
export function diasComRegistro(estado) {
  const dias = new Set((estado.logs || []).map((l) => diaISO(l.ts)));
  return dias.size;
}

export function formatarBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function formatarPct(x, casas = 1) {
  return `${((x || 0) * 100).toFixed(casas).replace('.', ',')}%`;
}
