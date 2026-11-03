import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';
import { app } from './app.js';

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Mann Ki Mannat API is listening'));
async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
