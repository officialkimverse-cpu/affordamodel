const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleChat } = require('../api/chat');

test('handleChat requires an apiKey from the client', async () => {
  const result = await handleChat({ userMessage: 'set vacancy to 7%' });
  assert.equal(result.status, 400);
  assert.match(result.body.error.message, /apiKey/i);
});

test('handleChat requires a userMessage', async () => {
  const result = await handleChat({ apiKey: 'sk-test' });
  assert.equal(result.status, 400);
  assert.match(result.body.error.message, /userMessage/i);
});

test('handleChat forwards the pasted key to Anthropic and returns the model response', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      status: 200,
      json: async () => ({ content: [{ text: '{"vacancy_rate":7,"explanation":"Vacancy set to 7%."}' }] }),
    };
  };

  const result = await handleChat(
    { apiKey: 'sk-ant-user-key', model: 'claude-sonnet-4-6', systemPrompt: 'sys', userMessage: 'set vacancy to 7%' },
    { fetchImpl }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.content[0].text.includes('vacancy_rate'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].opts.headers['x-api-key'], 'sk-ant-user-key');
  const payload = JSON.parse(calls[0].opts.body);
  assert.equal(payload.messages[0].content, 'set vacancy to 7%');
  assert.equal(payload.system, 'sys');
});
