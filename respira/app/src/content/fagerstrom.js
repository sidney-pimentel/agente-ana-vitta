// Teste de Fagerström para Dependência de Nicotina (FTND).
// Instrumento padrão, usado no PNCT/SUS e na literatura internacional.
// O app calcula e interpreta o escore para o usuário levar à consulta.
// Ele NÃO indica medicamento nem dose — isso é decisão do profissional de saúde.

export const PERGUNTAS_FTND = [
  {
    id: 'tempo',
    texto: 'Quanto tempo depois de acordar você fuma o primeiro cigarro?',
    opcoes: [
      { rotulo: 'Nos primeiros 5 minutos', pontos: 3 },
      { rotulo: 'Entre 6 e 30 minutos', pontos: 2 },
      { rotulo: 'Entre 31 e 60 minutos', pontos: 1 },
      { rotulo: 'Depois de 60 minutos', pontos: 0 },
    ],
  },
  {
    id: 'proibido',
    texto: 'Você acha difícil não fumar em lugares onde é proibido?',
    opcoes: [
      { rotulo: 'Sim', pontos: 1 },
      { rotulo: 'Não', pontos: 0 },
    ],
  },
  {
    id: 'qual_deixaria',
    texto: 'Qual cigarro seria mais difícil de abandonar?',
    opcoes: [
      { rotulo: 'O primeiro da manhã', pontos: 1 },
      { rotulo: 'Qualquer outro', pontos: 0 },
    ],
  },
  {
    id: 'quantidade',
    texto: 'Quantos cigarros você fuma por dia?',
    opcoes: [
      { rotulo: '31 ou mais', pontos: 3 },
      { rotulo: 'De 21 a 30', pontos: 2 },
      { rotulo: 'De 11 a 20', pontos: 1 },
      { rotulo: '10 ou menos', pontos: 0 },
    ],
  },
  {
    id: 'manha',
    texto: 'Você fuma mais nas primeiras horas da manhã do que no resto do dia?',
    opcoes: [
      { rotulo: 'Sim', pontos: 1 },
      { rotulo: 'Não', pontos: 0 },
    ],
  },
  {
    id: 'doente',
    texto: 'Você fuma mesmo quando está doente, a ponto de ficar de cama?',
    opcoes: [
      { rotulo: 'Sim', pontos: 1 },
      { rotulo: 'Não', pontos: 0 },
    ],
  },
];

export const NIVEIS = [
  {
    max: 2,
    nivel: 'Muito baixa',
    texto:
      'Sua dependência física da nicotina é baixa. A maior parte do seu desafio é de hábito e de gatilho — que é exatamente o que as fases E, P e R do programa atacam.',
  },
  {
    max: 4,
    nivel: 'Baixa',
    texto:
      'Dependência física leve. O trabalho de gatilhos vai carregar boa parte do resultado, mas vale conversar sobre apoio medicamentoso na UBS.',
  },
  {
    max: 6,
    nivel: 'Média',
    texto:
      'Dependência física relevante. A evidência mostra ganho claro ao combinar apoio comportamental com farmacoterapia — leve este escore para a consulta.',
  },
  {
    max: 7,
    nivel: 'Elevada',
    texto:
      'Dependência física alta. Fazer isso sem apoio medicamentoso reduz bastante suas chances. Procure a UBS antes de marcar a Data Zero.',
  },
  {
    max: 10,
    nivel: 'Muito elevada',
    texto:
      'Dependência física muito alta. Isso não é falta de força de vontade — é química. A boa notícia é que este é justamente o perfil que mais se beneficia de tratamento, e o SUS oferece de graça. Não marque a Data Zero antes de passar na UBS.',
  },
];

export function calcularFTND(respostas) {
  let escore = 0;
  for (const p of PERGUNTAS_FTND) {
    const idx = respostas[p.id];
    if (typeof idx === 'number' && p.opcoes[idx]) escore += p.opcoes[idx].pontos;
  }
  const faixa = NIVEIS.find((n) => escore <= n.max) || NIVEIS[NIVEIS.length - 1];
  return { escore, nivel: faixa.nivel, texto: faixa.texto };
}
