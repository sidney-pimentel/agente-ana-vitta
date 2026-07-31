// RADAR — Índice de Risco (0..100).
//
// Base: literatura de just-in-time adaptive interventions (JITAI) para cessação
// (Smart-T2 e afins, JMIR 2020/2025). EMA breve prevê risco de deslize iminente e
// dispara a micro-intervenção certa no momento certo.
//
// RESTRIÇÃO DE DESENHO, vinda direto da mesma literatura: o check-in tem no máximo
// 3 perguntas. A ressalva é explícita nos estudos — limitar frequência e número de
// itens é o que mantém a aceitabilidade. No momento em que o check-in vira burocracia,
// o dado para de chegar e o sistema inteiro cega.

import { diaISO, mapaDeGatilhos } from './stats.js';

export const PESOS = {
  fissura: 32, // fissura declarada hoje (0..10)
  humor: 22, // humor negativo hoje (invertido, 0..10)
  tendencia: 16, // piora nos últimos 3 dias
  horario: 12, // estamos numa hora crítica do mapa do usuário
  deslizeRecente: 12, // fumou nos últimos 3 dias
  faseInicial: 6, // ainda dentro das 72h
};

/**
 * @returns {{ valor:number, nivel:'baixo'|'moderado'|'alto'|'critico', fatores:string[] }}
 */
export function indiceDeRisco(estado, agora = new Date()) {
  const fatores = [];
  let valor = 0;

  const hoje = diaISO(agora);
  const checkins = estado.checkins || [];
  const deHoje = checkins.find((c) => c.data === hoje);

  if (deHoje) {
    valor += (deHoje.fissura / 10) * PESOS.fissura;
    if (deHoje.fissura >= 7) fatores.push('Você marcou fissura alta hoje.');

    const humorNegativo = (10 - deHoje.humor) / 10;
    valor += humorNegativo * PESOS.humor;
    if (deHoje.humor <= 3) fatores.push('Seu humor hoje está baixo — é o gatilho que mais derruba gente.');
  } else {
    // Sem check-in não há informação; assume risco médio-baixo em vez de zero,
    // para não dar falsa sensação de segurança.
    valor += PESOS.fissura * 0.35;
    fatores.push('Você ainda não fez o check-in de hoje.');
  }

  // Tendência: média de fissura dos 3 últimos check-ins vs. os 3 anteriores.
  const ultimos = checkins.slice(-6);
  if (ultimos.length >= 4) {
    const meio = Math.floor(ultimos.length / 2);
    const antes = media(ultimos.slice(0, meio).map((c) => c.fissura));
    const depois = media(ultimos.slice(meio).map((c) => c.fissura));
    if (depois > antes) {
      const delta = Math.min(1, (depois - antes) / 5);
      valor += delta * PESOS.tendencia;
      fatores.push('Sua fissura vem subindo nos últimos dias.');
    }
  }

  // Horário crítico, tirado do Mapa de Gatilhos do próprio usuário.
  const mapa = mapaDeGatilhos(estado);
  const horaAtual = agora.getHours();
  if (mapa.horasCriticas.some((h) => Math.abs(h.hora - horaAtual) <= 1)) {
    valor += PESOS.horario;
    fatores.push(`Este é um dos seus horários críticos (${horaAtual}h).`);
  }

  // Deslize recente.
  const tresDias = new Date(agora.getTime() - 3 * 864e5);
  const zero = estado.quitDate ? new Date(estado.quitDate) : null;
  if (zero && (estado.logs || []).some((l) => new Date(l.ts) >= tresDias && new Date(l.ts) >= zero)) {
    valor += PESOS.deslizeRecente;
    fatores.push('Você teve um deslize nos últimos 3 dias — os dias seguintes são os mais sensíveis.');
  }

  // Primeiras 72 horas.
  if (zero) {
    const horas = (agora - zero) / 36e5;
    if (horas >= 0 && horas <= 72) {
      valor += PESOS.faseInicial;
      fatores.push('Você está dentro das 72 horas de pico.');
    }
  }

  valor = Math.round(Math.max(0, Math.min(100, valor)));
  return { valor, nivel: nivelDe(valor), fatores };
}

function nivelDe(v) {
  if (v >= 75) return 'critico';
  if (v >= 50) return 'alto';
  if (v >= 28) return 'moderado';
  return 'baixo';
}

function media(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export const ORIENTACAO_POR_NIVEL = {
  baixo: {
    titulo: 'Risco baixo hoje',
    texto: 'Bom dia para trabalhar a fase do programa. Use a calma para preparar o que vem.',
  },
  moderado: {
    titulo: 'Risco moderado',
    texto: 'Dê uma olhada nos seus planos SE-ENTÃO antes de entrar no seu horário crítico.',
  },
  alto: {
    titulo: 'Risco alto',
    texto:
      'Hoje o programa fica de lado. Sua meta é só uma: não fumar. Deixe o SOS à mão e avise alguém da sua rede de apoio.',
  },
  critico: {
    titulo: 'Risco crítico',
    texto:
      'Ligue para alguém da sua rede de apoio agora. Não negocie com você mesmo — abra o SOS na primeira vontade e leia a sua Carta.',
  },
};
