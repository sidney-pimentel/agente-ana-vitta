import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { FASES } from '../src/content/method.js';
import { AUTO_CHECKS, tarefaConcluida, progressoDaFase, faseAtual, emModoCrise, proximoPasso, dataZeroMinima } from '../src/core/program.js';
import { calcularFTND, PERGUNTAS_FTND } from '../src/content/fagerstrom.js';
import { indiceDeRisco } from '../src/core/risk.js';
import { estadoInicial, migrar, criarStore, SCHEMA_VERSION } from '../src/core/store.js';
import { MARCOS_SAUDE, proximoMarco, marcosAtingidos, mensagem72h } from '../src/content/health.js';
import { GATILHOS } from '../src/content/triggers.js';
import { VALORES } from '../src/content/values.js';

const DIA = 864e5;

describe('estrutura do método', () => {
  test('tem exatamente 7 fases, formando RESPIRA', () => {
    assert.equal(FASES.length, 7);
    assert.equal(FASES.map((f) => f.letra).join(''), 'RESPIRA');
  });

  test('toda tarefa tem id e título, e ids são únicos dentro da fase', () => {
    for (const f of FASES) {
      const ids = new Set();
      for (const t of f.tarefas) {
        assert.ok(t.id, `tarefa sem id em ${f.id}`);
        assert.ok(t.titulo, `tarefa sem título em ${f.id}`);
        assert.ok(!ids.has(t.id), `id duplicado ${t.id} em ${f.id}`);
        ids.add(t.id);
      }
    }
  });

  test('todo `auto` declarado existe em AUTO_CHECKS', () => {
    for (const f of FASES) {
      for (const t of f.tarefas) {
        if (t.auto) assert.ok(AUTO_CHECKS[t.auto], `AUTO_CHECKS faltando: ${t.auto}`);
      }
    }
  });

  test('cada fase tem ao menos uma tarefa essencial', () => {
    for (const f of FASES) {
      assert.ok(f.tarefas.some((t) => t.critica), `fase ${f.id} sem tarefa essencial`);
    }
  });

  test('as fases de preparação vêm antes do Dia Zero e cobrem pelo menos 21 dias', () => {
    const prep = FASES.filter((f) => f.dia[0] < 0);
    assert.equal(prep.length, 4);
    assert.equal(Math.min(...prep.map((f) => f.dia[0])), -21);
  });

  test('o programa vai até o dia 365', () => {
    assert.equal(FASES[FASES.length - 1].dia[1], 365);
  });
});

describe('conclusão automática de tarefas', () => {
  test('valores só contam quando têm frase pessoal escrita', () => {
    const s = { ...estadoInicial(), values: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
    assert.equal(AUTO_CHECKS.temTresValores(s), true);
    assert.equal(AUTO_CHECKS.valoresComFrase(s), false, 'escolher não é o mesmo que declarar');

    s.values = s.values.map((v) => ({ ...v, frase: 'quero subir a ladeira com meu filho' }));
    assert.equal(AUTO_CHECKS.valoresComFrase(s), true);
  });

  test('a Semana de Registro exige 5 dias E 15 registros', () => {
    const s = estadoInicial();
    s.logs = Array.from({ length: 20 }, () => ({ ts: '2026-01-01T10:00:00Z' }));
    assert.equal(AUTO_CHECKS.temRegistrosSuficientes(s), false, '20 cigarros num dia só não é uma semana');

    s.logs = Array.from({ length: 20 }, (_, i) => ({ ts: new Date(Date.UTC(2026, 0, 1 + (i % 6), 10)).toISOString() }));
    assert.equal(AUTO_CHECKS.temRegistrosSuficientes(s), true);
  });

  test('o treino de urge surfing exige 5 sessões marcadas como treino', () => {
    const s = estadoInicial();
    s.cravings = Array.from({ length: 5 }, () => ({ venceu: true }));
    assert.equal(AUTO_CHECKS.treinouUrge(s), false, 'fissuras reais não contam como treino da fase P');

    s.cravings = Array.from({ length: 5 }, () => ({ venceu: true, treino: true }));
    assert.equal(AUTO_CHECKS.treinouUrge(s), true);
  });

  test('tarefa marcada à mão também conclui', () => {
    const f = FASES[0];
    const t = f.tarefas.find((x) => !x.auto);
    const s = { ...estadoInicial(), phases: { [f.id]: { tarefas: { [t.id]: true } } } };
    assert.equal(tarefaConcluida(s, f.id, t), true);
  });
});

describe('progresso e fase atual', () => {
  test('fase não fica liberada com tarefa essencial pendente', () => {
    const p = progressoDaFase(estadoInicial(), FASES[0]);
    assert.equal(p.liberada, false);
    assert.ok(p.criticasPendentes.length > 0);
  });

  test('antes da Data Zero, a fase atual é de preparação', () => {
    const f = faseAtual(estadoInicial());
    assert.ok(f.dia[0] < 0, 'sem Data Zero o usuário está preparando');
  });

  test('o tempo manda depois do Dia Zero', () => {
    const zero = new Date('2026-03-01T08:00:00Z');
    const s = { ...estadoInicial(), quitDate: zero.toISOString() };
    assert.equal(faseAtual(s, new Date(zero.getTime() + 1 * DIA)).id, 'impacto');
    assert.equal(faseAtual(s, new Date(zero.getTime() + 12 * DIA)).id, 'reengenharia');
    assert.equal(faseAtual(s, new Date(zero.getTime() + 100 * DIA)).id, 'ancoragem');
  });

  test('o modo crise cobre exatamente as 72 horas', () => {
    const zero = new Date('2026-03-01T08:00:00Z');
    const s = { ...estadoInicial(), quitDate: zero.toISOString() };
    assert.equal(emModoCrise(s, new Date(zero.getTime() + 3600e3)), true);
    assert.equal(emModoCrise(s, new Date(zero.getTime() + 71 * 3600e3)), true);
    assert.equal(emModoCrise(s, new Date(zero.getTime() + 73 * 3600e3)), false);
  });

  test('o app sempre tem um próximo passo concreto', () => {
    const p = proximoPasso(estadoInicial());
    assert.ok(p && p.fase && p.tarefa, 'nunca deixar o usuário sem saber o que fazer agora');
  });
});

describe('trava da Data Zero', () => {
  test('exige no mínimo 7 dias de preparação para quem está começando', () => {
    const agora = new Date('2026-05-01T12:00:00Z');
    const min = dataZeroMinima(estadoInicial(), agora);
    assert.ok((min - agora) / DIA >= 6, 'parar "hoje mesmo" sem preparo é o padrão que mais falha');
  });

  test('libera para o dia seguinte quando as fases R, E e S estão prontas', () => {
    const agora = new Date('2026-05-01T12:00:00Z');
    const s = estadoInicial();
    // Marca à mão todas as tarefas essenciais das três primeiras fases.
    for (const id of ['razoes', 'exame', 'seguranca']) {
      const f = FASES.find((x) => x.id === id);
      s.phases[id] = { tarefas: Object.fromEntries(f.tarefas.map((t) => [t.id, true])) };
    }
    const min = dataZeroMinima(s, agora);
    assert.ok((min - agora) / DIA < 2);
  });
});

describe('Fagerström', () => {
  test('escore mínimo e máximo', () => {
    const min = calcularFTND(Object.fromEntries(PERGUNTAS_FTND.map((p) => [p.id, p.opcoes.length - 1])));
    assert.equal(min.escore, 0);
    const max = calcularFTND(Object.fromEntries(PERGUNTAS_FTND.map((p) => [p.id, 0])));
    assert.equal(max.escore, 10);
    assert.equal(max.nivel, 'Muito elevada');
  });

  test('respostas incompletas não quebram o cálculo', () => {
    const r = calcularFTND({ tempo: 0 });
    assert.equal(r.escore, 3);
    assert.ok(r.nivel);
  });

  test('nunca sugere medicamento ou dose', () => {
    const proibido = /varenic|bupropi|citisin|adesivo de \d|mg\b/i;
    for (let i = 0; i <= 10; i++) {
      const faixa = calcularFTND({ quantidade: 0, tempo: 0 });
      assert.ok(!proibido.test(faixa.texto), 'o app encaminha, não prescreve');
    }
  });
});

describe('índice de risco', () => {
  test('fica entre 0 e 100', () => {
    const r = indiceDeRisco(estadoInicial());
    assert.ok(r.valor >= 0 && r.valor <= 100);
  });

  test('fissura alta e humor baixo elevam o risco', () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const calmo = { ...estadoInicial(), checkins: [{ data: hoje, fissura: 1, humor: 9, fumou: false }] };
    const tenso = { ...estadoInicial(), checkins: [{ data: hoje, fissura: 9, humor: 1, fumou: false }] };
    assert.ok(indiceDeRisco(tenso).valor > indiceDeRisco(calmo).valor + 30);
  });

  test('sem check-in o risco não é zero — falsa segurança é pior que dúvida', () => {
    assert.ok(indiceDeRisco(estadoInicial()).valor > 0);
  });

  test('deslize recente entra como fator', () => {
    const zero = new Date(Date.now() - 10 * DIA);
    const s = { ...estadoInicial(), quitDate: zero.toISOString(), logs: [{ ts: new Date(Date.now() - DIA).toISOString() }] };
    const r = indiceDeRisco(s);
    assert.ok(r.fatores.some((f) => /deslize/i.test(f)));
  });
});

describe('store', () => {
  test('migra estado antigo sem perder dado', () => {
    const antigo = { schemaVersion: 1, logs: [{ ts: 'x' }], profile: { cigarrosPorDia: 20 } };
    const novo = migrar(antigo);
    assert.equal(novo.schemaVersion, SCHEMA_VERSION);
    assert.equal(novo.logs.length, 1);
    assert.deepEqual(novo.plans, [], 'chaves novas ganham valor padrão');
  });

  test('persiste, recarrega e exporta', () => {
    const mem = memoria();
    const s1 = criarStore(mem);
    s1.set({ profile: { cigarrosPorDia: 15, precoMaco: 10, cigarrosPorMaco: 20 } });
    s1.push('logs', { gatilho: 'cafe', intensidade: 7 });

    const s2 = criarStore(mem);
    assert.equal(s2.get().profile.cigarrosPorDia, 15);
    assert.equal(s2.get().logs.length, 1);
    assert.ok(s2.get().logs[0].id, 'push gera id');
    assert.ok(JSON.parse(s2.exportar()).schemaVersion);
  });

  test('dado corrompido não derruba o app — o SOS precisa abrir de qualquer jeito', () => {
    const mem = memoria();
    mem.setItem('freesmoke.v1', '{isso não é json');
    const s = criarStore(mem);
    assert.equal(s.get().schemaVersion, SCHEMA_VERSION);
  });

  test('recupera dados salvos sob o nome antigo do produto', () => {
    // A troca de "Respira" para "Freesmoke" não pode custar o programa de ninguém.
    const mem = memoria();
    const antigo = { ...estadoInicial(), quitDate: '2026-03-01T08:00:00Z', plans: [{ id: 'p1', se: 'a', entao: 'b' }] };
    mem.setItem('respira.v1', JSON.stringify(antigo));

    const s = criarStore(mem);
    assert.equal(s.get().quitDate, '2026-03-01T08:00:00Z');
    assert.equal(s.get().plans.length, 1);

    // E regrava sob a chave nova, para a leitura seguinte não depender mais da antiga.
    s.set({ quitDate: antigo.quitDate });
    assert.ok(mem.getItem('freesmoke.v1'), 'passou a gravar sob a chave nova');
  });

  test('importar rejeita arquivo que não é backup do Freesmoke', () => {
    const s = criarStore(memoria());
    assert.equal(s.importar('não é json').ok, false);
    assert.equal(s.importar('{"foo":1}').ok, false);
    assert.equal(s.importar(JSON.stringify(estadoInicial())).ok, true);
  });

  test('notifica os inscritos a cada mudança', () => {
    const s = criarStore(memoria());
    let n = 0;
    s.inscrever(() => n++);
    s.set({ quitDate: new Date().toISOString() });
    s.push('plans', { se: 'a', entao: 'b' });
    assert.equal(n, 2);
  });
});

describe('conteúdo de saúde', () => {
  test('todo marco tem fonte citada — regra editorial não negociável', () => {
    for (const m of MARCOS_SAUDE) {
      assert.ok(m.fonte && m.fonte.length > 2, `marco sem fonte: ${m.titulo}`);
      assert.ok(m.titulo && m.texto);
    }
  });

  test('marcos estão em ordem crescente de tempo', () => {
    for (let i = 1; i < MARCOS_SAUDE.length; i++) {
      assert.ok(MARCOS_SAUDE[i].minutos > MARCOS_SAUDE[i - 1].minutos);
    }
  });

  test('marcos atingidos e próximo marco são coerentes', () => {
    const min = 24 * 60 + 1;
    const atingidos = marcosAtingidos(min);
    const prox = proximoMarco(min);
    assert.ok(atingidos.length > 0);
    assert.ok(prox.minutos > min);
    assert.ok(!atingidos.includes(prox));
  });

  test('as mensagens das 72h cobrem da hora 0 à 72', () => {
    assert.equal(mensagem72h(0).h, 0);
    assert.equal(mensagem72h(100).h, 72);
    assert.ok(mensagem72h(37).h <= 37);
  });

  test('nenhum conteúdo promete cura ou garantia', () => {
    const proibido = /\b(cura|curar|garantid[oa]|garante|100% de sucesso|infalível)\b/i;
    const textos = [
      ...MARCOS_SAUDE.flatMap((m) => [m.titulo, m.texto]),
      ...GATILHOS.flatMap((g) => [g.rotulo, g.funcao, ...g.sugestoes]),
      ...VALORES.flatMap((v) => [v.rotulo, v.exemplo]),
      ...FASES.flatMap((f) => [f.objetivo, ...f.tarefas.flatMap((t) => [t.titulo, t.desc || ''])]),
    ];
    for (const t of textos) {
      assert.ok(!proibido.test(t), `linguagem proibida em: "${t}"`);
    }
  });
});

describe('gatilhos', () => {
  test('todo gatilho declara a função que o cigarro cumpria', () => {
    for (const g of GATILHOS) {
      assert.ok(g.funcao, `gatilho ${g.id} sem função — sem isso a Reengenharia não funciona`);
      assert.ok(Array.isArray(g.sugestoes) && g.sugestoes.length > 0);
    }
  });

  test('ids são únicos', () => {
    assert.equal(new Set(GATILHOS.map((g) => g.id)).size, GATILHOS.length);
  });
});

function memoria() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}
