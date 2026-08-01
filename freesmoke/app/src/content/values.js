// Fase R — Razões.
// Valores no sentido da ACT: direções de vida escolhidas, não metas a atingir.
// Deliberadamente sem nenhum item baseado em medo (câncer, morte, doença):
// motivação por medo decai; valor não expira.

export const VALORES = [
  {
    id: 'presenca',
    rotulo: 'Presença com quem eu amo',
    exemplo: 'Subir a ladeira de casa com meu filho sem parar no meio do caminho.',
  },
  {
    id: 'liberdade',
    rotulo: 'Liberdade',
    exemplo: 'Passar um dia inteiro sem que nada na minha cabeça me diga o que fazer.',
  },
  {
    id: 'autorrespeito',
    rotulo: 'Autorrespeito',
    exemplo: 'Olhar no espelho e não ter que negociar comigo mesmo.',
  },
  {
    id: 'vitalidade',
    rotulo: 'Vitalidade e fôlego',
    exemplo: 'Voltar a jogar bola no sábado sem sair depois de dez minutos.',
  },
  {
    id: 'exemplo',
    rotulo: 'Ser exemplo',
    exemplo: 'Que meus filhos nunca me vejam com um cigarro na mão de novo.',
  },
  {
    id: 'dinheiro',
    rotulo: 'Dinheiro e o que fazer com ele',
    exemplo: 'Levar minha família para a praia com o dinheiro que eu queimava.',
  },
  {
    id: 'desempenho',
    rotulo: 'Desempenho',
    exemplo: 'Terminar os 10 km que eu sempre disse que ia correr.',
  },
  {
    id: 'presente',
    rotulo: 'Estar inteiro no momento',
    exemplo: 'Ficar na mesa até o fim do almoço em vez de já estar pensando na sacada.',
  },
  {
    id: 'futuro',
    rotulo: 'O tempo que eu ainda quero ter',
    exemplo: 'Conhecer meus netos com energia para brincar com eles.',
  },
  {
    id: 'controle',
    rotulo: 'Ser eu quem decide',
    exemplo: 'Não reorganizar meu dia em volta de onde eu posso fumar.',
  },
  {
    id: 'cheiro',
    rotulo: 'Não carregar o cigarro comigo',
    exemplo: 'Abraçar alguém sem pensar em como eu estou cheirando.',
  },
  {
    id: 'coragem',
    rotulo: 'Provar para mim que eu consigo',
    exemplo: 'Terminar uma coisa difícil que eu comecei.',
  },
];

export function valorPorId(id) {
  return VALORES.find((v) => v.id === id) || null;
}
