// Motor do programa: em que fase o usuário está, o que já concluiu, o que falta.

import { FASES } from '../content/method.js';
import { diasDesdeDataZero, diasComRegistro } from './stats.js';

/**
 * Condições que concluem uma tarefa automaticamente, a partir do estado.
 * A tarefa vira "feita" porque a coisa foi feita de verdade — não porque
 * alguém marcou um quadradinho.
 */
export const AUTO_CHECKS = {
  temTresValores: (s) => (s.values || []).length >= 3,
  valoresComFrase: (s) => (s.values || []).filter((v) => (v.frase || '').trim().length >= 10).length >= 3,
  temCarta: (s) => !!(s.letter && (s.letter.texto || '').trim().length >= 40),
  temFagerstrom: (s) => !!s.fagerstrom,
  temRegistrosSuficientes: (s) => diasComRegistro(s) >= 5 && (s.logs || []).length >= 15,
  temMapa: (s) => (s.logs || []).length >= 10,
  decidiuFarmaco: (s) => !!(s.farmaco && s.farmaco.decisao),
  temApoio: (s) => (s.support || []).length >= 1,
  ambienteLimpo: (s) => Object.values(s.ambiente || {}).filter(Boolean).length >= 5,
  temDataZero: (s) => !!s.quitDate,
  treinouUrge: (s) => (s.cravings || []).filter((c) => c.treino).length >= 5,
  temCincoPlanos: (s) => (s.plans || []).length >= 5,
  kitMontado: (s) => Object.values(s.kit || {}).filter(Boolean).length >= 3,
};

export function tarefaConcluida(estado, faseId, tarefa) {
  if (tarefa.auto && AUTO_CHECKS[tarefa.auto]) {
    if (AUTO_CHECKS[tarefa.auto](estado)) return true;
  }
  return !!(estado.phases?.[faseId]?.tarefas?.[tarefa.id]);
}

export function progressoDaFase(estado, fase) {
  const total = fase.tarefas.length;
  const feitas = fase.tarefas.filter((t) => tarefaConcluida(estado, fase.id, t)).length;
  const criticasPendentes = fase.tarefas.filter((t) => t.critica && !tarefaConcluida(estado, fase.id, t));
  return {
    total,
    feitas,
    pct: total ? feitas / total : 0,
    completa: criticasPendentes.length === 0 && feitas === total,
    liberada: criticasPendentes.length === 0,
    criticasPendentes,
  };
}

/**
 * Fase atual.
 * Antes da Data Zero: a primeira fase de preparação ainda com tarefa crítica pendente.
 * Depois da Data Zero: a fase determinada pelo dia — o tempo manda, não a lista de tarefas.
 */
export function faseAtual(estado, agora = new Date()) {
  const dias = diasDesdeDataZero(estado, agora);

  if (dias === null || jaVaiParar(estado, agora)) {
    const pendente = FASES.filter((f) => f.dia[0] < 0).find((f) => !progressoDaFase(estado, f).liberada);
    return pendente || FASES.find((f) => f.id === 'preparacao');
  }

  const posZero = FASES.filter((f) => f.dia[0] >= 0);
  for (const f of posZero) {
    if (dias >= f.dia[0] && dias <= f.dia[1]) return f;
  }
  return posZero[posZero.length - 1];
}

function jaVaiParar(estado, agora) {
  if (!estado.quitDate) return true;
  return new Date(estado.quitDate) > agora;
}

/** Dias até a Data Zero (negativo se já passou, null se não marcada). */
export function diasAteDataZero(estado, agora = new Date()) {
  if (!estado.quitDate) return null;
  const zero = new Date(estado.quitDate);
  const a = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const b = Date.UTC(zero.getFullYear(), zero.getMonth(), zero.getDate());
  return Math.round((b - a) / 864e5);
}

/** Modo crise: interface reduzida das 72 horas (Fase I — Impacto). */
export function emModoCrise(estado, agora = new Date()) {
  const dias = diasDesdeDataZero(estado, agora);
  if (dias === null) return false;
  const horas = (agora - new Date(estado.quitDate)) / 36e5;
  return horas >= 0 && horas <= 72;
}

/** O próximo passo concreto — o app sempre tem uma resposta para "e agora?". */
export function proximoPasso(estado, agora = new Date()) {
  const fase = faseAtual(estado, agora);
  if (!fase) return null;
  const pendente =
    fase.tarefas.find((t) => t.critica && !tarefaConcluida(estado, fase.id, t)) ||
    fase.tarefas.find((t) => !tarefaConcluida(estado, fase.id, t));
  return pendente ? { fase, tarefa: pendente } : { fase, tarefa: null };
}

export function progressoGeral(estado) {
  let total = 0;
  let feitas = 0;
  for (const f of FASES) {
    const p = progressoDaFase(estado, f);
    total += p.total;
    feitas += p.feitas;
  }
  return { total, feitas, pct: total ? feitas / total : 0 };
}

/**
 * Regra de segurança do método: não deixar marcar a Data Zero para daqui a menos
 * de 7 dias no primeiro acesso. Preparação é a variável que mais separa quem para
 * de quem tenta. Se as fases críticas de preparação já estiverem prontas, libera.
 */
export function dataZeroMinima(estado, agora = new Date()) {
  const prepProntas = ['razoes', 'exame', 'seguranca'].every((id) => {
    const f = FASES.find((x) => x.id === id);
    return f && progressoDaFase(estado, f).liberada;
  });
  const minDias = prepProntas ? 1 : 7;
  const d = new Date(agora);
  d.setDate(d.getDate() + minDias);
  d.setHours(0, 0, 0, 0);
  return d;
}
