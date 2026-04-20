/**
 * proxy.js — local development proxy for Affordamodel
 *
 * Sits between Live Server (port 5500) and the Anthropic API.
 * Server-to-server calls are not subject to CORS, so this works
 * where a direct browser fetch to api.anthropic.com does not.
 *
 * Usage:
 *   node proxy.js
 *
 * Keep this terminal open while using the app on Live Server.
 * No npm install required — uses only Node.js built-ins.
 */

const http  = require('http');
const https = require('https');

const PROXY_PORT    = 3001;
const DEFAULT_MODEL = 'claude-sonnet-4-6'; // fallback if browser doesn't send one

// Accept requests from either form Live Server uses
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:5500',
  'http://localhost:5500',
]);

// ── Write status + CORS headers in one call so they always travel together ──
function respond(res, origin, statusCode, body) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.has(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  res.writeHead(statusCode, headers);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// ── Main handler ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  console.log(`→ ${req.method} ${req.url}  (origin: ${origin || 'none'})`);

  // 1. CORS preflight — browser sends OPTIONS before the real POST
  if (req.method === 'OPTIONS') {
    respond(res, origin, 204, '');
    return;
  }

  // 2. Only accept POST (any path — keeps routing simple)
  if (req.method !== 'POST') {
    respond(res, origin, 405, { error: 'Method not allowed' });
    return;
  }

  // 3. Collect body
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {

    // Parse browser payload
    let apiKey, model, systemPrompt, userMessage;
    try {
      ({ apiKey, model, systemPrompt, userMessage } = JSON.parse(raw));
    } catch {
      respond(res, origin, 400, { error: 'Invalid JSON body' });
      return;
    }

    if (!apiKey) {
      respond(res, origin, 400, { error: 'apiKey is required' });
      return;
    }

    const resolvedModel = model || DEFAULT_MODEL;
    console.log(`   model: ${resolvedModel}`);

    // Build Anthropic request
    const payload = JSON.stringify({
      model:      resolvedModel,
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
        'content-length':    Buffer.byteLength(payload),
      },
    };

    // Forward to Anthropic (server → server, no CORS restriction)
    const upstream = https.request(options, upstreamRes => {
      let data = '';
      upstreamRes.on('data', chunk => { data += chunk; });
      upstreamRes.on('end', () => {
        console.log(`← Anthropic ${upstreamRes.statusCode}`);
        respond(res, origin, upstreamRes.statusCode, data);
      });
    });

    upstream.on('error', err => {
      console.error('Upstream error:', err.message);
      respond(res, origin, 502, { error: { message: err.message } });
    });

    upstream.write(payload);
    upstream.end();
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PROXY_PORT} is already in use.`);
    console.error('  Stop the other process or change PROXY_PORT in proxy.js.\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PROXY_PORT, () => {
  console.log('');
  console.log('  Affordamodel local proxy');
  console.log(`  Listening  →  http://localhost:${PROXY_PORT}`);
  console.log(`  Forwarding →  https://api.anthropic.com/v1/messages`);
  console.log(`  Model      →  ${DEFAULT_MODEL} (default, overridable per-request)`);
  console.log(`  CORS allow →  ${[...ALLOWED_ORIGINS].join(', ')}`);
  console.log('');
  console.log('  Keep this running while using the app on Live Server.');
  console.log('  Ctrl+C to stop.');
  console.log('');
});
