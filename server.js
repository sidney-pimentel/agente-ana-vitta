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
async function generateResponse(history) {
  // Monta contexto dinâmico: data atual + flag de continuação
  const now = new Date();
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataHoje = `${diasSemana[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
  const hora = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Detectar se já houve interação prévia (se tem mensagem do assistant no histórico)
  const hasAssistantMessage = history.some(m => m.role === 'assistant');
  const isFirstMessage = !hasAssistantMessage;

  let systemPrompt = SYSTEM_PROMPT;
  systemPrompt += `\n\n## CONTEXTO ATUAL`;
  systemPrompt += `\nData de hoje: ${dataHoje}`;
  systemPrompt += `\nHorário atual: ${hora}`;

  if (isFirstMessage) {
    systemPrompt += `\nEsta é a PRIMEIRA mensagem da conversa. Cumprimente o cliente e se apresente.`;
  } else {
    systemPrompt += `\nEsta é uma CONTINUAÇÃO de conversa. NÃO cumprimente novamente. NÃO repita "Olá, aqui é a Fernanda...". Apenas responda naturalmente ao que o cliente disse. Leia o histórico acima e continue de onde parou.`;
  }

  // IMPORTANTE: NÃO enviar o nome do perfil do WhatsApp como nome do devedor.
  systemPrompt += `\nIMPORTANTE: Você NÃO sabe o nome do cliente ainda. NÃO use "[nome]" nem qualquer placeholder. Trate por "você" até que o próprio cliente informe seu nome na conversa.`;

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

    // Gerar resposta da Fernanda IA (sem nome do WhatsApp — não confiável)
    const response = await generateResponse(history);

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

    // Ignorar mensagens enviadas por nós mesmos
    if (isFromMe) {
      return res.status(200).json({ status: 'ignored', reason: 'from_me' });
    }

    if (!sessionId || !text.trim()) {
      return res.status(200).json({ status: 'ignored', reason: 'no_data' });
    }

    // NÃO usar nome do WhatsApp/Zaperchat — pode ser emoji, frase, etc.
    // O nome do cliente só será usado quando ele mesmo informar na conversa.
    console.log(`[EVENT] Sessão: ${sessionId}, contactId: ${contactId || '(sem id)'}`);

    // Buscar histórico
    const history = await getSessionHistory(sessionId, 15);
    if (history.length === 0) {
      history.push({ role: 'user', content: text });
    }

    // Gerar e enviar resposta (sem passar nome — a IA descobre na conversa)
    const response = await generateResponse(history);

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
