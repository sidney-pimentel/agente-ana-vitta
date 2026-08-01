// O Método RESPIRA — 7 fases, estrutura declarativa.
// Referência conceitual completa: docs/02-metodo-respira.md
//
// Campos de cada tarefa:
//   id, titulo, desc     — conteúdo
//   acao {view, label}   — leva a uma tela do app
//   auto: 'chaveDeAuto'  — tarefa concluída automaticamente por uma condição
//                          calculada (ver core/program.js: AUTO_CHECKS)
//   critica: true        — não pode ser pulada para avançar de fase

export const FASES = [
  {
    id: 'razoes',
    letra: 'R',
    nome: 'Razões',
    subtitulo: 'Por que, de verdade',
    dia: [-21, -15],
    duracaoDias: 7,
    objetivo:
      'Trocar "porque faz mal" por um motivo que ainda funcione às 3h da manhã do sétimo dia. Medo de câncer é motivação emprestada e decai rápido. Valor é escolha sua e não expira.',
    tarefas: [
      {
        id: 'escolher_valores',
        titulo: 'Escolher seus 3 valores',
        desc: 'Não motivos genéricos. As três direções de vida que o cigarro está atrapalhando.',
        acao: { view: 'valores', label: 'Escolher valores' },
        auto: 'temTresValores',
        critica: true,
      },
      {
        id: 'frases_pessoais',
        titulo: 'Escrever cada valor com as suas palavras',
        desc: 'Não "quero saúde". Escreva a cena: "quero subir a ladeira de casa com meu filho sem parar no meio".',
        acao: { view: 'valores', label: 'Escrever' },
        auto: 'valoresComFrase',
        critica: true,
      },
      {
        id: 'carta',
        titulo: 'Escrever a Carta do Eu Comprometido',
        desc: 'Uma mensagem de você, hoje, lúcido e decidido, para você no pior momento. O app vai devolver esta carta quando você mais precisar.',
        acao: { view: 'carta', label: 'Escrever a carta' },
        auto: 'temCarta',
        critica: true,
      },
      {
        id: 'custo_real',
        titulo: 'Ver o Custo Real',
        desc: 'Quanto o cigarro te custa por ano — em dinheiro e em tempo.',
        acao: { view: 'numeros', label: 'Ver os números' },
      },
    ],
  },

  {
    id: 'exame',
    letra: 'E',
    nome: 'Exame',
    subtitulo: 'Conhecer o inimigo',
    dia: [-21, -14],
    duracaoDias: 7,
    objetivo:
      'Produzir o seu diagnóstico pessoal. Sem dado, todo conselho é genérico. Nesta fase você AINDA FUMA normalmente — não reduza nada. Reduzir aos poucos antes de parar tem resultado pior do que parar de uma vez (Annals of Internal Medicine, 2016).',
    tarefas: [
      {
        id: 'fagerstrom',
        titulo: 'Fazer o teste de Fagerström',
        desc: '6 perguntas. Mede sua dependência física de nicotina. É o número que você vai levar para a consulta na UBS.',
        acao: { view: 'fagerstrom', label: 'Fazer o teste' },
        auto: 'temFagerstrom',
        critica: true,
      },
      {
        id: 'semana_registro',
        titulo: 'Registrar cada cigarro por 7 dias',
        desc: 'Continue fumando. Só registre: contexto, gatilho e a intensidade da vontade de 0 a 10. Este passo sozinho já quebra o piloto automático — que é o mecanismo central do hábito.',
        acao: { view: 'registro', label: 'Registrar cigarro' },
        auto: 'temRegistrosSuficientes',
        critica: true,
      },
      {
        id: 'mapa',
        titulo: 'Ver o seu Mapa de Gatilhos',
        desc: 'Seus 5 gatilhos dominantes, seus horários críticos e quantos dos seus cigarros são puro automático — sem vontade nenhuma por trás.',
        acao: { view: 'mapa', label: 'Ver o mapa' },
        auto: 'temMapa',
      },
    ],
  },

  {
    id: 'seguranca',
    letra: 'S',
    nome: 'Segurança',
    subtitulo: 'Não fazer isso na raça',
    dia: [-14, -8],
    duracaoDias: 7,
    objetivo:
      'Montar a rede de proteção antes de precisar dela. Força de vontade é um recurso que acaba; sistema é um recurso que não acaba.',
    tarefas: [
      {
        id: 'farmaco',
        titulo: 'Resolver a farmacoterapia',
        desc: 'A evidência é consistente: remédio + apoio comportamental rende mais que qualquer um sozinho. E no Brasil o SUS dá de graça. Aqui está o roteiro para a consulta na UBS.',
        acao: { view: 'farmaco', label: 'Ver o roteiro' },
        auto: 'decidiuFarmaco',
        critica: true,
      },
      {
        id: 'rede_apoio',
        titulo: 'Montar sua rede de apoio',
        desc: 'De 1 a 3 pessoas. O app gera a mensagem que explica a elas o que fazer — e o que não fazer.',
        acao: { view: 'apoio', label: 'Montar a rede' },
        auto: 'temApoio',
        critica: true,
      },
      {
        id: 'ambiente',
        titulo: 'Limpar o ambiente',
        desc: 'Maço, isqueiro, cinzeiro, carro, sacada, mesa de trabalho, bolso do casaco, gaveta.',
        acao: { view: 'ambiente', label: 'Abrir checklist' },
        auto: 'ambienteLimpo',
      },
      {
        id: 'data_zero',
        titulo: 'Marcar a sua Data Zero',
        desc: 'O dia em que você para. De uma vez, não aos poucos. Evite semanas de estresse extremo previsível.',
        acao: { view: 'dataZero', label: 'Marcar a data' },
        auto: 'temDataZero',
        critica: true,
      },
    ],
  },

  {
    id: 'preparacao',
    letra: 'P',
    nome: 'Preparação',
    subtitulo: 'Treinar antes da prova',
    dia: [-7, -1],
    duracaoDias: 7,
    objetivo:
      'Chegar no Dia Zero com as habilidades já treinadas. Ninguém aprende a surfar durante o tsunami. Esta é a fase que quase nenhum programa faz direito.',
    tarefas: [
      {
        id: 'treino_urge',
        titulo: 'Treinar o urge surfing 5 vezes — ainda fumando',
        desc: 'Uma vez por dia, quando bater a vontade, abra o SOS e adie 10 minutos. Observe a vontade subir, parar e descer. Depois, se quiser, fume. O objetivo não é não fumar: é você comprovar, no seu próprio corpo, que a vontade passa sozinha.',
        acao: { view: 'sos', label: 'Treinar agora' },
        auto: 'treinouUrge',
        critica: true,
      },
      {
        id: 'planos',
        titulo: 'Criar 5 planos SE-ENTÃO',
        desc: 'Um para cada gatilho do seu mapa. Formato fixo e concreto: "SE eu terminar o almoço, ENTÃO eu levanto e escovo os dentes." A decisão é tomada agora, longe da fissura.',
        acao: { view: 'planos', label: 'Criar planos' },
        auto: 'temCincoPlanos',
        critica: true,
      },
      {
        id: 'kit',
        titulo: 'Montar o Kit SOS físico',
        desc: 'O que fica no bolso: goma ou bala, garrafa de água, algo para as mãos, e o contato da rede de apoio.',
        acao: { view: 'kit', label: 'Ver o kit' },
        auto: 'kitMontado',
      },
      {
        id: 'ensaio',
        titulo: 'Ensaiar o Dia Zero',
        desc: 'Percorra a sua agenda do dia da parada, hora a hora. Onde ficam os buracos que o cigarro preenchia?',
        acao: { view: 'ensaio', label: 'Fazer o ensaio' },
      },
      {
        id: 'ultimo',
        titulo: 'O Último Cigarro',
        desc: 'Não escondido, não com pressa. Consciente, com hora marcada — e depois o descarte de tudo.',
      },
    ],
  },

  {
    id: 'impacto',
    letra: 'I',
    nome: 'Impacto',
    subtitulo: 'As 72 horas',
    dia: [0, 3],
    duracaoDias: 4,
    objetivo:
      'Atravessar o pico. Nada além disso. Nas 72 horas a sua única meta é não fumar. Não é ser produtivo, não é ser agradável, não é estar bem. É só não fumar.',
    modoCrise: true,
    tarefas: [
      { id: 'h0', titulo: 'Passar as primeiras 4 horas', desc: 'Uma hora de cada vez. Não pense no mês, pense na próxima hora.' },
      { id: 'h12', titulo: 'Chegar às 12 horas', desc: 'Beba muita água. Coma. Ande.' },
      { id: 'h24', titulo: 'Chegar às 24 horas', desc: 'Um dia inteiro. Hoje você não se cobra mais nada.' },
      { id: 'h48', titulo: 'Chegar às 48 horas', desc: 'A parte mais difícil. Irritação é esperada e é temporária.' },
      { id: 'h72', titulo: 'Chegar às 72 horas', desc: 'A nicotina saiu do seu corpo. A química parou de trabalhar contra você.', critica: true },
      { id: 'ler_carta', titulo: 'Ler a sua Carta', desc: 'Escrita por você, para este momento exato.', acao: { view: 'carta', label: 'Ler a carta' } },
    ],
  },

  {
    id: 'reengenharia',
    letra: 'R',
    nome: 'Reengenharia',
    subtitulo: 'Reconstruir a rotina',
    dia: [4, 30],
    duracaoDias: 27,
    objetivo:
      'A nicotina já saiu. Agora o inimigo é o hábito. Cada rotina ancorada em cigarro precisa ser reescrita — uma por semana, não todas de uma vez.',
    tarefas: [
      {
        id: 'reeng_1',
        titulo: 'Semana 1 — reengenheirar o gatilho nº 1',
        desc: 'Identifique o buraco: o que o cigarro fazia ali? Pausa? Transição? Mãos ocupadas? Respirar fundo? Instale um substituto que cumpra a MESMA função.',
        acao: { view: 'reengenharia', label: 'Abrir' },
      },
      { id: 'reeng_2', titulo: 'Semana 2 — gatilho nº 2', desc: 'Mesmo processo, próximo gatilho do mapa.', acao: { view: 'reengenharia', label: 'Abrir' } },
      { id: 'reeng_3', titulo: 'Semana 3 — gatilho nº 3', desc: 'Mesmo processo.', acao: { view: 'reengenharia', label: 'Abrir' } },
      { id: 'reeng_4', titulo: 'Semana 4 — gatilho nº 4', desc: 'Mesmo processo.', acao: { view: 'reengenharia', label: 'Abrir' } },
      {
        id: 'plano_alcool',
        titulo: 'Fazer o plano para bebida alcoólica',
        desc: 'O gatilho nº 1 de recaída. O plano se faz antes de sair — depois do segundo copo você não decide mais nada.',
        acao: { view: 'planos', label: 'Criar o plano' },
        critica: true,
      },
      { id: 'primeiro_mes', titulo: 'Completar 30 dias', desc: 'Um mês inteiro.', critica: true },
    ],
  },

  {
    id: 'ancoragem',
    letra: 'A',
    nome: 'Ancoragem',
    subtitulo: 'Deixar de ser alguém que parou de fumar',
    dia: [31, 365],
    duracaoDias: 335,
    objetivo:
      'A transição de identidade. Enquanto você se define como "um fumante que está parando", cada cigarro que você não fuma é uma privação — e privação não se sustenta. O alvo é "eu não fumo", dito sem esforço nenhum.',
    tarefas: [
      { id: 'marco_3m', titulo: '3 meses — revisar seus valores', desc: 'O que mudou de verdade na vida que você queria?', acao: { view: 'valores', label: 'Revisar' } },
      { id: 'marco_6m', titulo: '6 meses', desc: 'Metade do caminho do programa completo.' },
      { id: 'marco_1a', titulo: '1 ano', desc: 'Seu risco de doença coronariana caiu para cerca de metade do de quem continuou fumando.', critica: true },
      {
        id: 'alto_risco',
        titulo: 'Manter os planos de alto risco atualizados',
        desc: 'Viagens, períodos de estresse, datas difíceis, eventos com álcool. Recaída tardia é a regra, não a exceção.',
        acao: { view: 'planos', label: 'Revisar planos' },
      },
      {
        id: 'devolver',
        titulo: 'Ajudar alguém que está começando',
        desc: 'Ajudar consolida identidade. É o passo que fecha o ciclo: você deixa de ser alguém que parou de fumar e passa a ser alguém que sabe como se para de fumar.',
      },
    ],
  },
];

export function fasePorId(id) {
  return FASES.find((f) => f.id === id) || null;
}

export function todasAsTarefas() {
  return FASES.flatMap((f) => f.tarefas.map((t) => ({ ...t, faseId: f.id })));
}
