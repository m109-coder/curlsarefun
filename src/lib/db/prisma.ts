import { PrismaClient } from '@prisma/client';

// Cache the client on `globalThis` so Next.js hot-reloads in development
// don't spawn a new PrismaClient (and a new DB connection pool) every reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Shared Prisma client singleton. Import this instead of `new PrismaClient()`. */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;