/**
 * Agente Fernanda — Webhook Server
 * Prop Assessoria de Cobrança
 *
 * Recebe webhooks do Zaperchat (FlwChat) quando devedor manda mensagem,
 * processa com IA (OpenAI) e responde de volta via API do Zaperchat.
 */

const express = require('express');
const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./prompt-ana');
const remessa = require('./remessa-loader');

const app = express();
app.use(express.json());

// ==================== CONFIGURAÇÃO ====================

const PORT = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const ZAPERCHAT_TOKEN = process.env.ZAPERCHAT_TOKEN;
const ZAPERCHAT_BASE = 'https://api.wts.chat';

// ID do departamento Vitta no Zaperchat
const VITTA_DEPT_ID = process.env.VITTA_DEPT_ID || 'ba2317e2-c5df-4391-9627-f45e37b3b2d4';

// ID do usuário humano para escalonamento
const HUMAN_USER_ID = process.env.HUMAN_USER_ID || process.env.ANA_USER_ID || '';

// ==================== CLIENTES ====================

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Rastreia sessões que já receberam cumprimento (evita repetição)
// Key: sessionId, Value: timestamp do primeiro cumprimento
const greetedSessions = new Map();

// Limpa sessões antigas a cada 6 horas (evita vazamento de memória)
setInterval(() => {
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  for (const [sid, ts] of greetedSessions) {
    if (ts < sixHoursAgo) greetedSessions.delete(sid);
  }
  console.log(`[CLEANUP] greetedSessions: ${greetedSessions.size} sessões ativas`);
}, 60 * 60 * 1000); // roda a cada 1h

// ==================== ZAPERCHAT API ====================

async function zaperchatRequest(method, path, body = null) {
  const url = `${ZAPERCHAT_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ZAPERCHAT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[ZAPERCHAT ERROR] ${method} ${path}: ${resp.status} - ${text}`);
    return null;
  }
  const contentType = resp.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return resp.json();
  }
  return resp.text();
}

/**
 * Busca dados do contato pelo contactId para obter o nome
 */
async function getContactName(contactId) {
  if (!contactId) return '';
  const data = await zaperchatRequest('GET', `/core/v1/contact/${contactId}`);
  if (!data || !data.name) return '';
  // Retorna apenas o primeiro nome
  return data.name.split(' ')[0];
}

/**
 * Busca o histórico de mensagens de uma sessão para dar contexto à IA
 */
async function getSessionHistory(sessionId, maxMessages = 20) {
  const data = await zaperchatRequest('GET',
    `/chat/v1/session/${sessionId}/message?PageSize=${maxMessages}&PageNumber=0`
  );
  if (!data || !data.items) return [];

  // Ordenar do mais antigo para o mais recente
  return data.items
    .filter(m => m.text && m.text.trim())
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(m => ({
      role: m.isFromMe ? 'assistant' : 'user',
      content: m.text.trim(),
    }));
}

/**
 * Envia mensagem de resposta na sessão do Zaperchat
 */
async function sendMessage(sessionId, text) {
  return zaperchatRequest('POST', `/chat/v1/session/${sessionId}/message`, {
    text,
  });
}

/**
 * Transfere a sessão para atendente humano (escalonamento)
 */
async function escalateToHuman(sessionId) {
  if (!HUMAN_USER_ID) {
    console.warn('[ESCALATE] HUMAN_USER_ID não configurado, não foi possível transferir');
    return false;
  }
  // Atribuir a sessão ao atendente humano
  const result = await zaperchatRequest('PUT',
    `/chat/v2/session/${sessionId}/assign`,
    { userId: HUMAN_USER_ID }
  );
  return !!result;
}

// ==================== IA ====================

/**
 * Gera resposta da Fernanda IA com base no histórico da conversa
 */
/**
 * Tenta identificar o devedor baseando-se no histórico da conversa e telefone
 */
function buscarDevedorNoHistorico(history, phoneNumber) {
  // 1. Tentar pelo telefone primeiro (mais confiável)
  if (phoneNumber) {
    const porTel = remessa.buscarPorTelefone(phoneNumber);
    if (porTel) return remessa.formatarDadosDevedor(porTel);
  }

  // 2. Extrair nomes e CPFs das mensagens do usuário
  const userMessages = history.filter(m => m.role === 'user').map(m => m.content);

  for (const msg of userMessages) {
    // Tentar CPF (11 dígitos)
    const cpfMatch = msg.match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[.\-\s]?\d{2}/);
    if (cpfMatch) {
      const resultado = remessa.buscarDevedor(cpfMatch[0]);
      if (resultado) return resultado;
    }

    // Tentar nome (mensagens que parecem ser um nome — 2+ palavras, sem números)
    const limpo = msg.trim();
    if (limpo.length >= 5 && !limpo.match(/\d/) && limpo.split(/\s+/).length >= 2) {
      const resultado = remessa.buscarDevedor(limpo);
      if (resultado) return resultado;
    }
  }

  return null;
}

async function generateResponse(history, sessionId, phoneNumber) {
  // Monta contexto dinâmico: data atual + flag de continuação
  const now = new Date();
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataHoje = `${diasSemana[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
  const hora = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Detectar primeira mensagem via Map em memória (mais confiável que histórico da API)
  const isFirstMessage = !greetedSessions.has(sessionId);

  // Também verificar pelo histórico como fallback
  const hasAssistantMessage = history.some(m => m.role === 'assistant');

  // Se NÃO está no Map MAS tem mensagem de assistant no histórico, não é primeira
  const shouldGreet = isFirstMessage && !hasAssistantMessage;

  if (shouldGreet) {
    greetedSessions.set(sessionId, Date.now());
    console.log(`[GREETED] Sessão ${sessionId} marcada como cumprimentada (total: ${greetedSessions.size})`);
  }

  let systemPrompt = SYSTEM_PROMPT;
  systemPrompt += `\n\n## CONTEXTO ATUAL`;
  systemPrompt += `\nData de hoje: ${dataHoje}`;
  systemPrompt += `\nHorário atual: ${hora}`;

  if (shouldGreet) {
    systemPrompt += `\nEsta é a PRIMEIRA mensagem da conversa. Cumprimente o cliente e se apresente.`;
  } else {
    systemPrompt += `\nEsta é uma CONTINUAÇÃO de conversa. NÃO cumprimente novamente. NÃO se apresente de novo. NÃO repita "Olá", "Tudo bem?", "Aqui é a Fernanda" ou qualquer variação de cumprimento/apresentação. Vá DIRETO ao ponto respondendo o que o cliente disse.`;
  }

  // Tentar buscar dados do devedor na remessa com base no histórico
  const dadosDevedor = buscarDevedorNoHistorico(history, phoneNumber);
  if (dadosDevedor && !dadosDevedor.multiplos) {
    systemPrompt += `\n\n## DADOS DO DEVEDOR (da remessa de cobrança)`;
    systemPrompt += `\nNome: ${dadosDevedor.nome}`;
    systemPrompt += `\nCPF: ${dadosDevedor.cpf}`;
    systemPrompt += `\nEmpreendimento: ${dadosDevedor.empreendimento}`;
    if (dadosDevedor.bloco) systemPrompt += `\nBloco: ${dadosDevedor.bloco}`;
    if (dadosDevedor.unidade) systemPrompt += `\nUnidade: ${dadosDevedor.unidade}`;
    systemPrompt += `\nStatus: ${dadosDevedor.status}`;
    systemPrompt += `\nParcelas inadimplentes: ${dadosDevedor.parcelas_inadimplentes}`;
    systemPrompt += `\nValor inadimplente: ${dadosDevedor.valor_inadimplente}`;
    systemPrompt += `\nEncargos: ${dadosDevedor.valor_encargos}`;
    systemPrompt += `\nDias em atraso: ${dadosDevedor.dias_atraso}`;
    systemPrompt += `\nValor do contrato: ${dadosDevedor.valor_contrato}`;
    systemPrompt += `\nChaves entregues: ${dadosDevedor.chavesEntregues}`;
    systemPrompt += `\nUse esses dados para conduzir a negociação. Você TEM a informação — NÃO diga "vou verificar" ou "vou buscar".`;
    console.log(`[REMESSA] Devedor encontrado: ${dadosDevedor.nome} (${dadosDevedor.cpf})`);
  } else if (dadosDevedor && dadosDevedor.multiplos) {
    systemPrompt += `\n\n## BUSCA NA REMESSA`;
    systemPrompt += `\nEncontrei ${dadosDevedor.total} clientes com nome similar. Peça ao cliente que confirme o CPF ou o empreendimento para identificá-lo com certeza.`;
  } else {
    systemPrompt += `\nIMPORTANTE: Você NÃO sabe o nome do cliente ainda. NÃO use "[nome]" nem qualquer placeholder. Trate por "você" até que o próprio cliente informe seu nome na conversa.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    return response || null;
  } catch (error) {
    console.error('[OPENAI ERROR]', error.message);
    return null;
  }
}

/**
 * Verifica se a resposta da IA indica necessidade de escalonamento.
 * Usa combinação de frases para evitar falsos positivos
 * (ex: "à vista" não deve disparar "vou te transferir").
 */
function shouldEscalate(response) {
  const lower = response.toLowerCase();

  // Frases específicas de escalonamento (precisam ser exatas)
  const exactPhrases = [
    'vou te transferir para minha colega',
    'transferir para minha colega',
    'dar continuidade ao seu atendimento',
  ];

  // Se contém qualquer frase exata de escalonamento, escalar
  if (exactPhrases.some(p => lower.includes(p))) return true;

  // Combinação: "transferir" + indicador de pessoa
  if (lower.includes('transferir') && lower.includes('colega')) return true;

  return false;
}

// ==================== WEBHOOK ENDPOINT ====================

/**
 * Endpoint principal — recebe webhook do chatbot do Zaperchat
 *
 * O chatbot do Zaperchat envia um POST com os dados da conversa.
 * Formato esperado (padrão FlwChat chatbot webhook):
 * {
 *   "sessionId": "uuid",
 *   "contactId": "uuid",
 *   "contactName": "Nome do contato",
 *   "phoneNumber": "+5534999999999",
 *   "lastMessage": "texto da última mensagem",
 *   "lastMessagesAggregated": "mensagens agregadas",
 *   "departmentId": "uuid",
 *   ...
 * }
 */
app.post('/webhook/zaperchat', async (req, res) => {
  const startTime = Date.now();
  console.log('[WEBHOOK] Recebido:', JSON.stringify(req.body).substring(0, 500));

  try {
    const {
      sessionId,
      contactName,
      lastMessage,
      lastMessagesAggregated,
      departmentId,
      phoneNumber,
    } = req.body;

    // Validação básica
    if (!sessionId) {
      console.warn('[WEBHOOK] Sem sessionId, ignorando');
      return res.status(400).json({ error: 'sessionId obrigatório' });
    }

    // Filtrar apenas departamento Vitta (segurança)
    if (departmentId && departmentId !== VITTA_DEPT_ID) {
      console.log(`[WEBHOOK] Departamento ${departmentId} não é Vitta, ignorando`);
      return res.status(200).json({ status: 'ignored', reason: 'not_vitta' });
    }

    // Pegar a mensagem do devedor
    const devedorMessage = lastMessage || lastMessagesAggregated || '';
    if (!devedorMessage.trim()) {
      console.log('[WEBHOOK] Mensagem vazia, ignorando');
      return res.status(200).json({ status: 'ignored', reason: 'empty_message' });
    }

    // Buscar histórico da conversa para contexto
    const history = await getSessionHistory(sessionId, 15);

    // Se o histórico está vazio, usar apenas a mensagem atual
    if (history.length === 0) {
      history.push({ role: 'user', content: devedorMessage });
    }

    // Gerar resposta da Fernanda IA
    const response = await generateResponse(history, sessionId, phoneNumber);

    if (!response) {
      console.error('[WEBHOOK] Falha ao gerar resposta');
      // Em caso de erro, escalonar para humano
      await sendMessage(sessionId, 'Vou verificar uma informação e já te retorno!');
      await escalateToHuman(sessionId);
      return res.status(200).json({ status: 'escalated', reason: 'ai_error' });
    }

    // Verificar se a IA decidiu escalonar
    if (shouldEscalate(response)) {
      console.log('[WEBHOOK] IA solicitou escalonamento');
      await sendMessage(sessionId, response);
      await escalateToHuman(sessionId);
      return res.status(200).json({
        status: 'escalated',
        response,
        duration: Date.now() - startTime,
      });
    }

    // Enviar resposta no Zaperchat
    await sendMessage(sessionId, response);

    console.log(`[WEBHOOK] Respondido em ${Date.now() - startTime}ms`);
    return res.status(200).json({
      status: 'responded',
      response,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[WEBHOOK] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint alternativo — recebe webhook direto dos eventos do Zaperchat
 * (MESSAGE_RECEIVED event subscription)
 */
app.post('/webhook/message-received', async (req, res) => {
  console.log('[EVENT] Recebido:', JSON.stringify(req.body).substring(0, 500));

  try {
    const { eventType, content } = req.body;

    if (eventType !== 'MESSAGE_RECEIVED') {
      return res.status(200).json({ status: 'ignored', reason: 'wrong_event' });
    }

    // Extrair dados do evento
    const sessionId = content?.sessionId;
    const text = content?.text || '';
    const isFromMe = content?.isFromMe;
    const contactId = content?.contactId || content?.contact?.id || '';
    const phoneNumber = content?.phoneNumber || content?.contact?.phoneNumber || '';

    // Ignorar mensagens enviadas por nós mesmos
    if (isFromMe) {
      return res.status(200).json({ status: 'ignored', reason: 'from_me' });
    }

    if (!sessionId || !text.trim()) {
      return res.status(200).json({ status: 'ignored', reason: 'no_data' });
    }

    console.log(`[EVENT] Sessão: ${sessionId}, contactId: ${contactId || '(sem id)'}, phone: ${phoneNumber || '(sem tel)'}`);

    // Buscar histórico
    const history = await getSessionHistory(sessionId, 15);
    console.log(`[EVENT] Histórico: ${history.length} msgs, roles: ${history.map(m => m.role).join(',')}, greeted: ${greetedSessions.has(sessionId)}`);
    if (history.length === 0) {
      history.push({ role: 'user', content: text });
    }

    // Gerar e enviar resposta com dados da remessa
    const response = await generateResponse(history, sessionId, phoneNumber);

    if (!response) {
      await sendMessage(sessionId, 'Vou verificar e já te retorno!');
      await escalateToHuman(sessionId);
      return res.status(200).json({ status: 'escalated', reason: 'ai_error' });
    }

    if (shouldEscalate(response)) {
      await sendMessage(sessionId, response);
      await escalateToHuman(sessionId);
      return res.status(200).json({ status: 'escalated' });
    }

    await sendMessage(sessionId, response);
    return res.status(200).json({ status: 'responded' });

  } catch (error) {
    console.error('[EVENT] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH & STATUS ====================

app.get('/', (req, res) => {
  res.json({
    name: 'Agente Fernanda — Vitta',
    status: 'online',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    config: {
      model: OPENAI_MODEL,
      vittaDept: VITTA_DEPT_ID,
      hasOpenAI: !!OPENAI_API_KEY,
      hasZaperchat: !!ZAPERCHAT_TOKEN,
      hasHumanUser: !!HUMAN_USER_ID,
    },
    remessa: remessa.getStatus(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🤖 Agente Fernanda — Vitta                      ║
║   Prop Assessoria de Cobrança                 ║
║                                               ║
║   Servidor rodando na porta ${PORT}              ║
║   Webhook: /webhook/zaperchat                 ║
║   Eventos: /webhook/message-received          ║
║   Status:  /health                            ║
╚═══════════════════════════════════════════════╝
  `);

  // Validar configuração
  if (!OPENAI_API_KEY) console.warn('⚠️  OPENAI_API_KEY não configurada!');
  if (!ZAPERCHAT_TOKEN) console.warn('⚠️  ZAPERCHAT_TOKEN não configurado!');
  if (!HUMAN_USER_ID) console.warn('⚠️  HUMAN_USER_ID não configurado (escalonamento desabilitado)');
});
