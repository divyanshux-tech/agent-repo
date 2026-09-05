// ============================================================
// src/db/client.js
// Prisma client singleton.
// Always import from here — never instantiate PrismaClient
// elsewhere to avoid connection pool exhaustion.
// ============================================================

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
