// Applies database migrations on deploy.
//
// Databases created by the old `prisma db push` setup have the original tables but no migration history.
// For those, the first migration (0_init, the original schema) is marked as already applied before
// `prisma migrate deploy` runs the rest. New, empty databases get every migration.
require('dotenv').config();
const path = require('path');
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prismaBin = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');
const run = (...args) => execFileSync(prismaBin, args, { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: process.env });

async function tableExists(prisma, name) {
  const rows = await prisma.$queryRaw`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${name}`;
  return Number(rows[0].n) > 0;
}

async function main() {
  const prisma = new PrismaClient();
  let needsBaseline = false;
  try {
    needsBaseline = !(await tableExists(prisma, '_prisma_migrations')) && (await tableExists(prisma, 'User'));
  } catch (err) {
    // The database doesn't exist yet: `migrate deploy` creates it, nothing to baseline.
    if (err.code !== 'P1003' && !/does not exist/i.test(err.message)) throw err;
  } finally {
    await prisma.$disconnect();
  }
  if (needsBaseline) {
    console.log('[migrate] Existing database without migration history: marking 0_init as applied.');
    run('migrate', 'resolve', '--applied', '0_init');
  }
  run('migrate', 'deploy');
}

main().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
