// Starts a throwaway MySQL server, applies the real migrations, and loads the app against it.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createDB } = require('mysql-memory-server');

async function setupTestApp() {
  const db = await createDB({ version: '8.4.x', dbName: 'notevault_test', logLevel: 'ERROR' });
  process.env.DATABASE_URL = `mysql://${db.username}@127.0.0.1:${db.port}/${db.dbName}`;

  execFileSync(path.join(__dirname, '..', 'node_modules', '.bin', 'prisma'), ['migrate', 'deploy'], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });

  const app = require('../app');
  const prisma = require('../utils/db');
  const request = require('supertest');
  const { sentEmails } = require('../utils/mailer');

  let counter = 0;
  const api = {
    app,
    prisma,
    sentEmails,
    // Registers a new user; returns { token, user, workspaceId, auth } where auth sets the Authorization header.
    async register(name = `user${++counter}`) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `${name.replace(/[^a-z0-9]/gi, "") || "user"}-${Date.now()}-${counter}@example.com`, password: 'password123', name });
      if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
      return withAuth(res.body.token, res.body.user);
    },
    request: () => request(app),
    withAuth,
  };

  function withAuth(token, user) {
    const call = (method) => (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
    return {
      token,
      user,
      workspaceId: user.activeWorkspaceId,
      get: call('get'),
      post: call('post'),
      patch: call('patch'),
      delete: call('delete'),
    };
  }

  async function teardown() {
    await prisma.$disconnect();
    await db.stop();
  }

  return { api, teardown };
}

// The link in the last email sent to an address.
function lastLinkTo(sentEmails, email) {
  const mail = [...sentEmails].reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`no email sent to ${email}`);
  return new URL(mail.text.match(/https?:\/\/\S+/)[0]);
}

module.exports = { setupTestApp, lastLinkTo };
