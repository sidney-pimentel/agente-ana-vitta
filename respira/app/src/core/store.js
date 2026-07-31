// Estado do Respira.
//
// Princípio arquitetural nº 1 (docs/04-plano-do-projeto.md §3): local-first.
// Dado de saúde é dado pessoal sensível pela LGPD. O que não sai do aparelho não vaza.
// Nada aqui vai para servidor nenhum. Sincronização, se um dia existir, será opt-in explícito.
//
// O dado do usuário é de 365 dias e é insubstituível: migração de schema é versionada e
// nunca destrutiva.

const CHAVE = 'respira.v1';
export const SCHEMA_VERSION = 1;

export function estadoInicial() {
  return {
    schemaVersion: SCHEMA_VERSION,
    criadoEm: new Date().toISOString(),
    profile: null, // { cigarrosPorDia, precoMaco, cigarrosPorMaco, anosFumando }
    values: [], // [{ id, rotulo, frase }]
    letter: null, // { texto, criadaEm }
    fagerstrom: null, // { respostas, escore, nivel, texto, respondidoEm }
    logs: [], // [{ id, ts, gatilho, contexto, intensidade, tipo }]
    cravings: [], // [{ id, ts, inicial, final, venceu, duracaoSeg, treino }]
    checkins: [], // [{ id, data, fissura, humor, fumou }]
    plans: [], // [{ id, gatilho, se, entao, criadoEm }]
    quitDate: null, // ISO
    support: [], // [{ nome, contato, avisado }]
    ambiente: {}, // { [itemId]: true }
    kit: {}, // { [itemId]: true }
    farmaco: null, // { decisao, detalhe, decididoEm }
    vault: null, // { objetivo, valorAlvo }
    phases: {}, // { [faseId]: { concluidaEm, tarefas: { [tarefaId]: true } } }
    settings: { tema: 'auto' },
  };
}

// --- Migrações -------------------------------------------------------------
// Cada função leva o estado da versão N para N+1. Nunca apagar dado.
const MIGRACOES = {
  // 1: (s) => { ...; s.schemaVersion = 2; return s },
};

export function migrar(estado) {
  let s = { ...estado };
  while (s.schemaVersion < SCHEMA_VERSION && MIGRACOES[s.schemaVersion]) {
    s = MIGRACOES[s.schemaVersion](s);
  }
  // Preenche chaves novas que ainda não existam, sem tocar nas existentes.
  const base = estadoInicial();
  for (const k of Object.keys(base)) {
    if (!(k in s)) s[k] = base[k];
  }
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}

// --- Store -----------------------------------------------------------------

export function criarStore(storage) {
  const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : memoriaFake());
  const ouvintes = new Set();
  let estado;

  try {
    const bruto = backend.getItem(CHAVE);
    estado = bruto ? migrar(JSON.parse(bruto)) : estadoInicial();
  } catch {
    // Dado corrompido não pode derrubar o app: um usuário em fissura precisa do SOS
    // funcionando mesmo que o resto tenha se perdido.
    estado = estadoInicial();
  }

  function persistir() {
    try {
      backend.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* quota cheia ou modo privado — o app continua funcionando em memória */
    }
  }

  function notificar() {
    for (const fn of ouvintes) fn(estado);
  }

  return {
    get: () => estado,

    /** Aplica uma função pura ao estado, persiste e notifica. */
    update(fn) {
      const proximo = fn(structuredCloneSeguro(estado));
      if (proximo) estado = proximo;
      persistir();
      notificar();
      return estado;
    },

    set(patch) {
      return this.update((s) => ({ ...s, ...patch }));
    },

    /** Anexa um item a uma lista, gerando id e timestamp. */
    push(lista, item) {
      return this.update((s) => {
        s[lista] = [...(s[lista] || []), { id: novoId(), ts: new Date().toISOString(), ...item }];
        return s;
      });
    },

    inscrever(fn) {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },

    exportar() {
      return JSON.stringify(estado, null, 2);
    },

    /** Importa um backup. Retorna { ok, erro }. Nunca substitui dado por lixo. */
    importar(texto) {
      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        return { ok: false, erro: 'Arquivo não é um JSON válido.' };
      }
      if (!dados || typeof dados !== 'object' || !('schemaVersion' in dados)) {
        return { ok: false, erro: 'Este arquivo não é um backup do Respira.' };
      }
      estado = migrar(dados);
      persistir();
      notificar();
      return { ok: true };
    },

    apagarTudo() {
      estado = estadoInicial();
      persistir();
      notificar();
    },
  };
}

export function novoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function structuredCloneSeguro(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function memoriaFake() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}
