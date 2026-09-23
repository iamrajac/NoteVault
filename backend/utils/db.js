const { PrismaClient } = require('@prisma/client');

// Reuse one client per process (nodemon/test reloads would otherwise open new connection pools).
const prisma = globalThis.__notevaultPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__notevaultPrisma = prisma;

module.exports = prisma;
