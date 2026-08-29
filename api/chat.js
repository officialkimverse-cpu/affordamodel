const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function handleChat(body = {}, { fetchImpl } = {}) {
  const { apiKey, model, systemPrompt, userMessage } = body;
  if (!apiKey) {
    return { status: 400, body: { error: { message: 'apiKey is required' } } };
  }
  if (!userMessage) {
    return { status: 400, body: { error: { message: 'userMessage is required' } } };
  }

  const fetchFn = fetchImpl || fetch;
  const upstream = await fetchFn(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await upstream.json();
  return { status: upstream.status, body: data };
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }

  const result = await handleChat(payload || {});
  return res.status(result.status).json(result.body);
}

handler.handleChat = handleChat;
module.exports = handler;
