// Fase E — Exame. Taxonomia de gatilhos usada no registro de cigarros,
// no Mapa de Gatilhos e no Protocolo de Deslize.
//
// `funcao` é o campo que a Fase R2 (Reengenharia) usa: o substituto tem que
// cumprir a MESMA função do cigarro, senão não substitui nada.
// O cigarro depois do almoço raramente é sobre nicotina — é sobre encerrar a
// refeição e mudar de estado.

export const GATILHOS = [
  {
    id: 'cafe',
    rotulo: 'Café',
    funcao: 'ritual de início, pausa marcada',
    sugestoes: [
      'Trocar o lugar onde você toma café — se era na sacada, tome na cozinha, em pé.',
      'Terminar o café e levantar imediatamente. O cigarro mora no tempo parado depois do gole.',
      'Segurar a xícara com as duas mãos: elas ficam ocupadas.',
    ],
  },
  {
    id: 'pos_refeicao',
    rotulo: 'Depois de comer',
    funcao: 'encerrar a refeição, mudar de estado',
    sugestoes: [
      'Escovar os dentes em até 2 minutos depois do último garfo.',
      'Levantar da mesa assim que terminar, mesmo que os outros fiquem.',
      'Uma fruta cítrica ou uma bala de menta — muda o gosto da boca, que é metade do gatilho.',
    ],
  },
  {
    id: 'estresse',
    rotulo: 'Estresse ou raiva',
    funcao: 'descarregar, ganhar tempo antes de reagir',
    sugestoes: [
      'Respiração 4-7-8 por 1 minuto. O cigarro "acalmava" em boa parte porque você respirava fundo.',
      'Sair fisicamente do lugar por 3 minutos, sem celular.',
      'Escrever em uma frase o que aconteceu, antes de responder qualquer coisa.',
    ],
  },
  {
    id: 'tedio',
    rotulo: 'Tédio',
    funcao: 'preencher tempo vazio, ocupar as mãos',
    sugestoes: [
      'Ter sempre algo para as mãos: chaveiro, elástico, bola de apertar.',
      'Uma lista curta de 3 coisas de 5 minutos, decidida antes de o tédio chegar.',
      'Andar até algum lugar e voltar. O movimento é o que o cigarro dava.',
    ],
  },
  {
    id: 'alcool',
    rotulo: 'Bebida alcoólica',
    funcao: 'desinibição, ritual social',
    sugestoes: [
      'Combine o plano ANTES de sair, não durante. Depois do segundo copo você não decide mais nada.',
      'Fique perto de quem não fuma. A saída para fumar é um convite, não um impulso.',
      'Nas primeiras semanas, considere não beber. É o gatilho nº 1 de recaída — não é fraqueza, é estatística.',
    ],
  },
  {
    id: 'social',
    rotulo: 'Outras pessoas fumando',
    funcao: 'pertencimento, conversa',
    sugestoes: [
      'Avisar antes: "parei, não me ofereça." Uma vez, para todos, e acabou.',
      'Ir junto sem fumar é treino avançado. Nas 4 primeiras semanas, não vá.',
      'Ter uma resposta pronta e curta para "só um não faz mal".',
    ],
  },
  {
    id: 'volante',
    rotulo: 'Dirigindo',
    funcao: 'ocupar tempo morto, marcar transição',
    sugestoes: [
      'Limpar o carro por inteiro. O cheiro é gatilho.',
      'Deixar água ou bala no porta-copos, no lugar exato onde ficava o maço.',
      'Podcast ou música nova só para o carro — ocupa a atenção que sobrava.',
    ],
  },
  {
    id: 'trabalho_pausa',
    rotulo: 'Pausa do trabalho',
    funcao: 'permissão para parar, transição entre tarefas',
    sugestoes: [
      'Manter a pausa, tirar o cigarro. O que você precisava era da pausa.',
      'Sair do prédio e caminhar 5 minutos. Mesma duração, mesma função.',
      'Marcar a pausa no relógio — assim ela não depende mais da vontade de fumar para acontecer.',
    ],
  },
  {
    id: 'telefone',
    rotulo: 'Falando ao telefone',
    funcao: 'ocupar as mãos durante a conversa',
    sugestoes: ['Andar enquanto fala.', 'Rabiscar num papel.', 'Fone de ouvido, mãos livres, ocupadas com outra coisa.'],
  },
  {
    id: 'acordar',
    rotulo: 'Ao acordar',
    funcao: 'repor nicotina depois da noite, marcar o início do dia',
    sugestoes: [
      'Este é o cigarro mais ligado à dependência física. É onde a farmacoterapia mais ajuda — leve isso para a consulta.',
      'Mudar a ordem da manhã: banho antes do café, por exemplo.',
      'Um copo de água grande antes de qualquer outra coisa.',
    ],
  },
  {
    id: 'dormir',
    rotulo: 'Antes de dormir',
    funcao: 'encerrar o dia, relaxar',
    sugestoes: ['Um ritual novo de encerramento: alongamento, leitura, banho.', 'Deixar o celular fora do quarto.'],
  },
  {
    id: 'tristeza',
    rotulo: 'Tristeza ou solidão',
    funcao: 'companhia, autocuidado distorcido',
    sugestoes: [
      'Falar com alguém da sua rede de apoio. Este gatilho não se resolve sozinho.',
      'Sair de casa por 10 minutos, mesmo sem destino.',
    ],
  },
  {
    id: 'celebracao',
    rotulo: 'Comemoração',
    funcao: 'marcar um momento bom',
    sugestoes: [
      'Escolher antes qual vai ser o novo marcador do momento bom.',
      'Cuidado: este gatilho aparece justamente quando você acha que está seguro.',
    ],
  },
  {
    id: 'automatico',
    rotulo: 'Nenhum — foi automático',
    funcao: 'nenhuma; puro piloto automático',
    sugestoes: [
      'Esse é o cigarro mais fácil de eliminar: ele não estava resolvendo nada.',
      'Repare quantos dos seus cigarros caem aqui. Para a maioria das pessoas é a maior fatia.',
    ],
  },
];

export function gatilhoPorId(id) {
  return GATILHOS.find((g) => g.id === id) || null;
}
