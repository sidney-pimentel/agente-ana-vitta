import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  taxaDiasLivres,
  sequenciaAtual,
  cofre,
  precoPorCigarro,
  gastoAnual,
  mapaDeGatilhos,
  diasComRegistro,
  statsFissuras,
  diasDesdeDataZero,
  minutosLivre,
} from '../src/core/stats.js';

const DIA = 864e5;

function estadoBase(overrides = {}) {
  return {
    profile: { cigarrosPorDia: 20, precoMaco: 12, cigarrosPorMaco: 20, anosFumando: 15 },
    logs: [],
    cravings: [],
    checkins: [],
    quitDate: null,
    ...overrides,
  };
}

describe('taxa de dias livres — a métrica principal', () => {
  test('é null antes da Data Zero', () => {
    assert.equal(taxaDiasLivres(estadoBase()), null);
  });

  test('é 100% no primeiro dia sem deslize', () => {
    const agora = new Date('2026-01-01T20:00:00Z');
    const s = estadoBase({ quitDate: '2026-01-01T08:00:00Z' });
    const t = taxaDiasLivres(s, agora);
    assert.equal(t.diasTotais, 1);
    assert.equal(t.diasLivres, 1);
    assert.equal(t.taxa, 1);
  });

  test('conta dias com deslize, não cigarros', () => {
    const zero = new Date('2026-01-01T08:00:00Z');
    const agora = new Date(zero.getTime() + 9 * DIA);
    // Três cigarros no MESMO dia contam como um único dia com deslize.
    const s = estadoBase({
      quitDate: zero.toISOString(),
      logs: [
        { ts: new Date(zero.getTime() + 5 * DIA + 3600e3).toISOString() },
        { ts: new Date(zero.getTime() + 5 * DIA + 7200e3).toISOString() },
        { ts: new Date(zero.getTime() + 5 * DIA + 10800e3).toISOString() },
      ],
    });
    const t = taxaDiasLivres(s, agora);
    assert.equal(t.diasComDeslize, 1);
    assert.equal(t.diasTotais, 10);
    assert.equal(t.diasLivres, 9);
  });

  test('ignora cigarros registrados ANTES da Data Zero (Semana de Registro)', () => {
    const zero = new Date('2026-01-15T08:00:00Z');
    const agora = new Date(zero.getTime() + 4 * DIA);
    const s = estadoBase({
      quitDate: zero.toISOString(),
      logs: Array.from({ length: 40 }, (_, i) => ({ ts: new Date(zero.getTime() - (i + 1) * 3600e3).toISOString() })),
    });
    const t = taxaDiasLivres(s, agora);
    assert.equal(t.diasComDeslize, 0, 'registros de preparação não são deslizes');
    assert.equal(t.taxa, 1);
  });
});

describe('REGRA CENTRAL DO MÉTODO: um deslize não zera nada', () => {
  // Esta é a regra que, se quebrar em silêncio, faz o app machucar o usuário.
  // Base: Shiffman et al. — o que prediz recaída é o colapso de autoeficácia
  // depois do deslize, não o deslize. Um app que zera o contador maximiza
  // exatamente esse fator.

  const zero = new Date('2026-01-01T08:00:00Z');
  const agora = new Date(zero.getTime() + 46 * DIA + 20 * 3600e3);
  const comDeslize = estadoBase({
    quitDate: zero.toISOString(),
    logs: [{ ts: new Date(zero.getTime() + 46 * DIA + 10 * 3600e3).toISOString() }],
  });

  test('a métrica principal permanece acima de 97% após um deslize no dia 47', () => {
    const t = taxaDiasLivres(comDeslize, agora);
    assert.equal(t.diasTotais, 47);
    assert.equal(t.diasLivres, 46);
    assert.ok(t.taxa > 0.97, `esperado > 97%, veio ${(t.taxa * 100).toFixed(2)}%`);
  });

  test('a queda causada por um deslize é menor que 3 pontos percentuais', () => {
    const semDeslize = estadoBase({ quitDate: zero.toISOString(), logs: [] });
    const antes = taxaDiasLivres(semDeslize, agora).taxa;
    const depois = taxaDiasLivres(comDeslize, agora).taxa;
    assert.ok(antes - depois < 0.03, 'um deslize não pode derrubar a métrica principal');
  });

  test('os dias livres acumulados NUNCA voltam a zero', () => {
    const t = taxaDiasLivres(comDeslize, agora);
    assert.ok(t.diasLivres >= 46, 'o histórico de dias livres é preservado');
  });

  test('a sequência (métrica secundária) reinicia — mas ela nunca é a principal', () => {
    // A sequência existe como informação, não como veredito. Ela pode reiniciar;
    // a taxa não. Este teste documenta a diferença de propósito entre as duas.
    const seq = sequenciaAtual(comDeslize, agora);
    const t = taxaDiasLivres(comDeslize, agora);
    assert.ok(seq < t.diasLivres, 'sequência e dias livres são grandezas diferentes');
    assert.ok(t.diasLivres > 40, 'a métrica principal segue intacta');
  });
});

describe('dinheiro', () => {
  test('preço por cigarro e gasto anual', () => {
    const p = { cigarrosPorDia: 20, precoMaco: 12, cigarrosPorMaco: 20 };
    assert.equal(precoPorCigarro(p), 0.6);
    assert.equal(gastoAnual(p), 0.6 * 20 * 365);
  });

  test('o cofre desconta os cigarros efetivamente fumados', () => {
    const zero = new Date('2026-01-01T00:00:00Z');
    const agora = new Date(zero.getTime() + 10 * DIA);
    const semDeslize = cofre(estadoBase({ quitDate: zero.toISOString() }), agora);
    const comDeslize = cofre(
      estadoBase({ quitDate: zero.toISOString(), logs: [{ ts: new Date(zero.getTime() + 2 * DIA).toISOString() }] }),
      agora
    );
    assert.equal(semDeslize.cigarrosNaoFumados, 200);
    assert.equal(comDeslize.cigarrosNaoFumados, 199, 'o cofre é honesto, não inflado');
    assert.ok(comDeslize.economizado < semDeslize.economizado);
  });

  test('cofre é zero sem Data Zero', () => {
    assert.equal(cofre(estadoBase()).economizado, 0);
  });
});

describe('mapa de gatilhos', () => {
  const s = estadoBase({
    logs: [
      { ts: '2026-01-01T07:00:00Z', gatilho: 'cafe', intensidade: 8 },
      { ts: '2026-01-01T07:30:00Z', gatilho: 'cafe', intensidade: 7 },
      { ts: '2026-01-01T13:00:00Z', gatilho: 'pos_refeicao', intensidade: 6 },
      { ts: '2026-01-02T07:10:00Z', gatilho: 'cafe', intensidade: 9 },
      { ts: '2026-01-02T15:00:00Z', gatilho: 'automatico', intensidade: 1 },
    ],
  });

  test('ordena gatilhos por frequência', () => {
    const m = mapaDeGatilhos(s);
    assert.equal(m.total, 5);
    assert.equal(m.ranking[0].gatilho, 'cafe');
    assert.equal(m.ranking[0].n, 3);
  });

  test('identifica cigarros automáticos por gatilho ou por intensidade baixa', () => {
    assert.equal(mapaDeGatilhos(s).automaticos, 1);
  });

  test('conta dias distintos com registro', () => {
    assert.equal(diasComRegistro(s), 2);
  });
});

describe('fissuras', () => {
  test('separa vencidas de obedecidas e calcula duração média', () => {
    const s = estadoBase({
      cravings: [
        { venceu: true, duracaoSeg: 300 },
        { venceu: true, duracaoSeg: 240 },
        { venceu: false, duracaoSeg: 60 },
      ],
    });
    const f = statsFissuras(s);
    assert.equal(f.enfrentadas, 3);
    assert.equal(f.vencidas, 2);
    assert.equal(f.obedecidas, 1);
    assert.equal(f.duracaoMedia, 200);
  });
});

describe('tempo', () => {
  test('minutosLivre parte do último cigarro, não da Data Zero', () => {
    const zero = new Date('2026-01-01T00:00:00Z');
    const agora = new Date(zero.getTime() + 5 * DIA);
    const s = estadoBase({
      quitDate: zero.toISOString(),
      logs: [{ ts: new Date(zero.getTime() + 4 * DIA).toISOString() }],
    });
    assert.equal(minutosLivre(s, agora), 24 * 60, 'o placar de saúde reflete a realidade fisiológica');
    assert.equal(diasDesdeDataZero(s, agora), 5, 'mas o programa segue contando desde a Data Zero');
  });
});
