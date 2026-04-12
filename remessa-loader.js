/**
 * Módulo de consulta da remessa de cobrança Vitta
 *
 * Carrega o JSON da remessa e permite buscar devedores por:
 * - Nome (parcial, case-insensitive)
 * - CPF (com ou sem formatação)
 * - Telefone
 * - Empreendimento + nome
 */

const fs = require('fs');
const path = require('path');

let remessaData = [];
let lastLoaded = null;

/**
 * Carrega ou recarrega os dados da remessa
 */
function loadRemessa() {
  const filePath = path.join(__dirname, 'remessa-vitta.json');

  if (!fs.existsSync(filePath)) {
    console.warn('[REMESSA] Arquivo remessa-vitta.json não encontrado');
    return false;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    remessaData = JSON.parse(raw);
    lastLoaded = new Date();
    console.log(`[REMESSA] Carregados ${remessaData.length} registros (${lastLoaded.toISOString()})`);
    return true;
  } catch (error) {
    console.error('[REMESSA] Erro ao carregar:', error.message);
    return false;
  }
}

/**
 * Normaliza CPF removendo pontos, traços e espaços
 */
function normalizeCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/[.\-\s/]/g, '').trim();
}

/**
 * Normaliza nome para busca (lowercase, sem acentos)
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza telefone removendo tudo exceto dígitos
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Busca devedor por CPF
 */
function buscarPorCPF(cpf) {
  const cpfNorm = normalizeCPF(cpf);
  if (cpfNorm.length < 11) return null;

  return remessaData.find(r => normalizeCPF(r.cpf) === cpfNorm) || null;
}

/**
 * Busca devedor por nome (parcial)
 */
function buscarPorNome(nome) {
  const nomeNorm = normalizeName(nome);
  if (nomeNorm.length < 3) return [];

  // Primeiro tenta match exato
  const exato = remessaData.filter(r => normalizeName(r.nome) === nomeNorm);
  if (exato.length > 0) return exato;

  // Depois tenta match parcial (nome contém a busca)
  const parcial = remessaData.filter(r => normalizeName(r.nome).includes(nomeNorm));
  if (parcial.length > 0) return parcial;

  // Tenta match por palavras (todas as palavras da busca devem estar no nome)
  const palavras = nomeNorm.split(/\s+/).filter(p => p.length >= 2);
  if (palavras.length > 0) {
    return remessaData.filter(r => {
      const nomeCliente = normalizeName(r.nome);
      return palavras.every(p => nomeCliente.includes(p));
    });
  }

  return [];
}

/**
 * Busca devedor por telefone
 */
function buscarPorTelefone(telefone) {
  const telNorm = normalizePhone(telefone);
  if (telNorm.length < 8) return null;

  // Busca em todos os campos de telefone
  return remessaData.find(r => {
    return [r.tel1, r.tel2]
      .some(t => {
        const tNorm = normalizePhone(t);
        return tNorm && (tNorm === telNorm || tNorm.endsWith(telNorm) || telNorm.endsWith(tNorm));
      });
  }) || null;
}

/**
 * Formata os dados do devedor para inserir no contexto da IA
 */
function formatarDadosDevedor(registro) {
  if (!registro) return null;

  const fmtMoney = (v) => typeof v === 'number'
    ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : v || 'não informado';

  return {
    nome: registro.nome || '',
    cpf: registro.cpf || '',
    empreendimento: registro.empreendimento || '',
    etapa: registro.etapa || '',
    bloco: registro.bloco || '',
    unidade: registro.unidade || '',
    status: registro.status || '',
    statusObra: registro.status_obra || '',
    chavesEntregues: registro.chaves || '',
    parcelas_inadimplentes: registro.parcelas_inad || 0,
    valor_inadimplente: fmtMoney(registro.valor_inad),
    valor_encargos: fmtMoney(registro.encargos),
    valor_contrato: fmtMoney(registro.valor_contrato),
    dias_atraso: registro.dias_atraso || 0,
    aging: registro.aging || '',
    email: registro.email || '',
    contrato: registro.contrato || '',
  };
}

/**
 * Busca inteligente — tenta CPF, nome e telefone
 * Retorna dados formatados para a IA
 */
function buscarDevedor(texto) {
  if (!texto) return null;

  const textoLimpo = texto.trim();

  // Tenta CPF primeiro (se tem números suficientes)
  const numeros = textoLimpo.replace(/\D/g, '');
  if (numeros.length >= 11) {
    const porCPF = buscarPorCPF(numeros);
    if (porCPF) return formatarDadosDevedor(porCPF);
  }

  // Tenta telefone (se parece número de telefone)
  if (numeros.length >= 8 && numeros.length <= 13) {
    const porTel = buscarPorTelefone(numeros);
    if (porTel) return formatarDadosDevedor(porTel);
  }

  // Tenta nome
  const resultados = buscarPorNome(textoLimpo);
  if (resultados.length === 1) {
    return formatarDadosDevedor(resultados[0]);
  }
  if (resultados.length > 1) {
    // Múltiplos resultados — retorna lista resumida
    return {
      multiplos: true,
      total: resultados.length,
      lista: resultados.slice(0, 5).map(r => ({
        nome: r.nome,
        empreendimento: r.empreendimento,
        cpf_parcial: r.cpf ? `***${r.cpf.slice(-6)}` : '',
      })),
    };
  }

  return null;
}

/**
 * Retorna info sobre a base carregada
 */
function getStatus() {
  return {
    registros: remessaData.length,
    carregadoEm: lastLoaded ? lastLoaded.toISOString() : null,
  };
}

// Carregar ao importar o módulo
loadRemessa();

module.exports = {
  loadRemessa,
  buscarDevedor,
  buscarPorCPF,
  buscarPorNome,
  buscarPorTelefone,
  formatarDadosDevedor,
  getStatus,
};
