// Brevo HTTP API email sending, with fetch mocked so no real email is sent.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.BREVO_API_KEY = 'test-brevo-key';
process.env.SMTP_FROM = 'NoteVault <team@example.com>';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAddress, sendWithBrevo } = require('../utils/mailer');

test('parses sender addresses', () => {
  assert.deepEqual(parseAddress('NoteVault <team@example.com>'), { name: 'NoteVault', email: 'team@example.com' });
  assert.deepEqual(parseAddress('"Note Vault" <a@b.co>'), { name: 'Note Vault', email: 'a@b.co' });
  assert.deepEqual(parseAddress('plain@example.com'), { name: 'NoteVault', email: 'plain@example.com' });
});

test('sends through the Brevo API with the right payload', async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ messageId: 'abc' }), { status: 201 });
  };
  try {
    await sendWithBrevo({ to: 'user@example.com', subject: 'Hi', text: 'plain', html: '<p>html</p>' });
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].init.headers['api-key'], 'test-brevo-key');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    sender: { name: 'NoteVault', email: 'team@example.com' },
    to: [{ email: 'user@example.com' }],
    subject: 'Hi',
    textContent: 'plain',
    htmlContent: '<p>html</p>',
  });
});

test('reports Brevo errors', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => new Response('{"message":"Key not found"}', { status: 401 });
  try {
    await assert.rejects(sendWithBrevo({ to: 'u@example.com', subject: 's', text: 't', html: 'h' }), /Brevo responded 401/);
  } finally {
    global.fetch = realFetch;
  }
});
