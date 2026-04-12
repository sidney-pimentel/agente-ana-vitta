/**
 * Agente Ana — Webhook Server
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

// ID do departamento/usuário da Ana humana para escalonamento
const ANA_USER_ID = process.env.ANA_USER_ID || '';

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

async function getSessionHistory(sessionId, maxMessages = 20) {
  const data = await zaperchatRequest('GET',
    `/chat/v1/session/${sessionId}/message?PageSize=${maxMessages}&PageNumber=0`
  );
  if (!data || !data.items) return [];
  return data.items
    .filter(m => m.text && m.text.trim())
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(m => ({
      role: m.isFromMe ? 'assistant' : 'user',
      content: m.text.trim(),
    }));
}

async function sendMessage(sessionId, text) {
  return zaperchatRequest('POST', `/chat/v1/session/${sessionId}/message`, { text });
}

async function escalateToHuman(sessionId) {
  if (!ANA_USER_ID) {
    console.warn('[ESCALATE] ANA_USER_ID não configurado');
    return false;
  }
  const result = await zaperchatRequest('PUT',
    `/chat/v2/session/${sessionId}/assign`,
    { userId: ANA_USER_ID }
  );
  return !!result;
}

// ==================== IA ====================

async function generateResponse(history, devedorNome) {
  let systemPrompt = SYSTEM_PROMPT;
  if (devedorNome) {
    systemPrompt += `\n\n## CONTEXTO ATUAL\nVocê está conversando com: ${devedorNome}`;
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
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('[OPENAI ERROR]', error.message);
    return null;
  }
}

function shouldEscalate(response) {
  const escalateKeywords = [
    'vou te transferir', 'transferir para', 'minha colega',
    'dar continuidade', 'um momento',
  ];
  const lower = response.toLowerCase();
  return escalateKeywords.some(k => lower.includes(k));
}

// ==================== WEBHOOK ENDPOINT ====================

app.post('/webhook/zaperchat', async (req, res) => {
  const startTime = Date.now();
  console.log('[WEBHOOK] Recebido:', JSON.stringify(req.body).substring(0, 500));

  try {
    const { sessionId, contactName, lastMessage, lastMessagesAggregated, departmentId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId obrigatório' });
    }

    if (departmentId && departmentId !== VITTA_DEPT_ID) {
      return res.status(200).json({ status: 'ignored', reason: 'not_vitta' });
    }

    const devedorMessage = lastMessage || lastMessagesAggregated || '';
    if (!devedorMessage.trim()) {
      return res.status(200).json({ status: 'ignored', reason: 'empty_message' });
    }

    const history = await getSessionHistory(sessionId, 15);
    if (history.length === 0) {
      history.push({ role: 'user', content: devedorMessage });
    }

    const nome = contactName ? contactName.split(' ')[0] : '';
    const response = await generateResponse(history, contactName);

    if (!response) {
      await sendMessage(sessionId, `${nome ? nome + ', ' : ''}vou verificar uma informação e já te retorno!`);
      await escalateToHuman(sessionId);
      return res.status(200).json({ status: 'escalated', reason: 'ai_error' });
    }

    if (shouldEscalate(response)) {
      await sendMessage(sessionId, response);
      await escalateToHuman(sessionId);
      return res.status(200).json({ status: 'escalated', response, duration: Date.now() - startTime });
    }

    await sendMessage(sessionId, response);
    return res.status(200).json({ status: 'responded', response, duration: Date.now() - startTime });

  } catch (error) {
    console.error('[WEBHOOK] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/message-received', async (req, res) => {
  console.log('[EVENT] Recebido:', JSON.stringify(req.body).substring(0, 500));
  try {
    const { eventType, content } = req.body;
    if (eventType !== 'MESSAGE_RECEIVED') {
      return res.status(200).json({ status: 'ignored', reason: 'wrong_event' });
    }
    const sessionId = content?.sessionId;
    const text = content?.text || '';
    const isFromMe = content?.isFromMe;
    const contactName = content?.contact?.name || '';

    if (isFromMe) return res.status(200).json({ status: 'ignored', reason: 'from_me' });
    if (!sessionId || !text.trim()) return res.status(200).json({ status: 'ignored', reason: 'no_data' });

    const history = await getSessionHistory(sessionId, 15);
    if (history.length === 0) history.push({ role: 'user', content: text });

    const nome = contactName ? contactName.split(' ')[0] : '';
    const response = await generateResponse(history, contactName);

    if (!response) {
      await sendMessage(sessionId, `${nome ? nome + ', ' : ''}vou verificar e já te retorno!`);
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
    name: 'Agente Ana — Vitta',
    status: 'online',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    config: {
      model: OPENAI_MODEL,
      vittaDept: VITTA_DEPT_ID,
      hasOpenAI: !!OPENAI_API_KEY,
      hasZaperchat: !!ZAPERCHAT_TOKEN,
      hasAnaUser: !!ANA_USER_ID,
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`Agente Ana — Vitta | Porta ${PORT} | Webhook: /webhook/zaperchat`);
  if (!OPENAI_API_KEY) console.warn('⚠️  OPENAI_API_KEY não configurada!');
  if (!ZAPERCHAT_TOKEN) console.warn('⚠️  ZAPERCHAT_TOKEN não configurado!');
  if (!ANA_USER_ID) console.warn('⚠️  ANA_USER_ID não configurado');
});
