import { PrismaClient } from '@prisma/client';

// Render's free instance is small, so a single MySQL connection makes parallel
// reads (dashboard cards, product lists) queue up one after another. A modest
// shared pool keeps those queries truly parallel. Anything set explicitly in
// DATABASE_URL still wins.
function withPoolSettings(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) parsed.searchParams.set('connection_limit', '8');
    if (!parsed.searchParams.has('pool_timeout')) parsed.searchParams.set('pool_timeout', '20');
    return parsed.toString();
  } catch {
    return url;
  }
}

export const prisma = new PrismaClient({
  datasourceUrl: withPoolSettings(process.env.DATABASE_URL),
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
