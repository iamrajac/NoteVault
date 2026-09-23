const { test } = require('node:test');
const assert = require('node:assert/strict');

// Loads config.js fresh with the given environment.
function loadConfig(env) {
  const saved = { ...process.env };
  for (const k of Object.keys(process.env)) if (k.startsWith('SMTP_')) delete process.env[k];
  Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(40), DOTENV_CONFIG_PATH: '/nonexistent' }, env);
  delete require.cache[require.resolve('../config')];
  try {
    return require('../config').smtp;
  } finally {
    process.env = saved;
  }
}

test('Gmail settings still work', () => {
  const smtp = loadConfig({ SMTP_EMAIL: 'team@gmail.com', SMTP_APP_PASSWORD: 'app-pass' });
  assert.equal(smtp.host, undefined);
  assert.equal(smtp.user, 'team@gmail.com');
  assert.equal(smtp.pass, 'app-pass');
  assert.equal(smtp.from, 'team@gmail.com');
});

test('generic SMTP provider settings are read', () => {
  const smtp = loadConfig({
    SMTP_HOST: 'smtp.resend.com',
    SMTP_PORT: '465',
    SMTP_USER: 'resend',
    SMTP_PASS: 'key',
    SMTP_FROM: 'NoteVault <noreply@example.com>',
  });
  assert.deepEqual(smtp, {
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    user: 'resend',
    pass: 'key',
    from: 'NoteVault <noreply@example.com>',
  });
});
