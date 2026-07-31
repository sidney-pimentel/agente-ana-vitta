// Placar de Saúde — marcos fisiológicos após o último cigarro.
//
// REGRA EDITORIAL (não negociável): todo item tem fonte citada e visível ao usuário.
// Sem exagero, sem terrorismo, sem número inventado. A credibilidade científica é o
// ativo do produto e se perde uma vez só.
//
// Manutenção: revisar a cada 6 meses junto com as revisões Cochrane (ver 04-plano-do-projeto.md §7.3).

export const MARCOS_SAUDE = [
  {
    minutos: 20,
    titulo: 'Frequência cardíaca e pressão normalizando',
    texto: 'Sua frequência cardíaca e sua pressão arterial começam a voltar aos níveis de quem não fuma.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 8 * 60,
    titulo: 'Oxigênio subindo',
    texto: 'O nível de oxigênio no sangue começa a se normalizar à medida que o monóxido de carbono cai.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 12 * 60,
    titulo: 'Monóxido de carbono pela metade',
    texto: 'O monóxido de carbono no seu sangue já caiu para níveis próximos aos de um não fumante.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 24 * 60,
    titulo: '24 horas',
    texto: 'O risco de infarto começa a cair. Seus pulmões já começaram a limpar resíduos.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 48 * 60,
    titulo: 'Paladar e olfato voltando',
    texto:
      'As terminações nervosas começam a se recuperar. Comida volta a ter gosto. Nas próximas 24 horas você atravessa o pico da abstinência física.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 72 * 60,
    titulo: '72 horas — o pico passou',
    texto:
      'A nicotina já saiu do seu corpo. Os brônquios relaxam e respirar fica mais fácil. A partir daqui o desafio deixa de ser químico e passa a ser de hábito — e hábito se reconstrói.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 14 * 24 * 60,
    titulo: '2 semanas',
    texto: 'A circulação melhora e a capacidade pulmonar começa a aumentar. Caminhar e subir escada ficam mais fáceis.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 30 * 24 * 60,
    titulo: '1 mês',
    texto: 'Tosse, congestão e falta de ar diminuem. Os cílios dos pulmões voltam a funcionar e a limpar as vias aéreas.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 90 * 24 * 60,
    titulo: '3 meses',
    texto: 'Função pulmonar mensuravelmente melhor. A circulação está significativamente mais eficiente.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 365 * 24 * 60,
    titulo: '1 ano',
    texto: 'Seu risco de doença coronariana cai para cerca de metade do risco de quem continua fumando.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 5 * 365 * 24 * 60,
    titulo: '5 anos',
    texto: 'O risco de AVC se aproxima do de uma pessoa que nunca fumou.',
    fonte: 'OMS / INCA',
  },
  {
    minutos: 10 * 365 * 24 * 60,
    titulo: '10 anos',
    texto: 'O risco de câncer de pulmão cai para cerca da metade do de quem continuou fumando.',
    fonte: 'OMS / INCA',
  },
];

// Mensagens hora a hora das primeiras 72h (Fase I — Impacto).
export const MENSAGENS_72H = [
  { h: 0, texto: 'Começou. A partir de agora, sua única meta é não fumar. Nada mais.' },
  { h: 2, texto: 'A vontade vem em ondas de 3 a 5 minutos. Ela não fica subindo para sempre — ela quebra.' },
  { h: 6, texto: 'Se está irritado, é esperado e é temporário. Não é você piorando; é a nicotina saindo.' },
  { h: 12, texto: 'Metade do primeiro dia. O monóxido de carbono no seu sangue já despencou.' },
  { h: 24, texto: 'Um dia inteiro. Beba água, coma alguma coisa, durma se conseguir. Hoje não se cobra mais nada.' },
  { h: 36, texto: 'Você está na parte mais difícil. Não é sinal de que está dando errado — é sinal de que está no meio.' },
  { h: 48, texto: 'Dois dias. Paladar e olfato começando a voltar. O pico é agora e ele vai passar.' },
  { h: 60, texto: 'Falta pouco para as 72 horas. A partir daí a química para de trabalhar contra você.' },
  { h: 72, texto: 'Setenta e duas horas. A nicotina saiu do seu corpo. O que vier agora é hábito — e hábito você reconstrói.' },
];

export function marcosAtingidos(minutosLivre) {
  return MARCOS_SAUDE.filter((m) => minutosLivre >= m.minutos);
}

export function proximoMarco(minutosLivre) {
  return MARCOS_SAUDE.find((m) => minutosLivre < m.minutos) || null;
}

export function mensagem72h(horas) {
  let atual = MENSAGENS_72H[0];
  for (const m of MENSAGENS_72H) if (horas >= m.h) atual = m;
  return atual;
}
