import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';
import { app } from './app.js';
import { ensureDefaultSettings } from './services/settings.js';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Mann Ki Mannat API is listening');
  // Reading settings is cheap, but never let a database hiccup take the API
  // down: the health check must keep answering while MySQL reconnects.
  ensureDefaultSettings()
    .then((created) => {
      if (created.length) logger.info({ created }, 'created missing default settings');
    })
    .catch((error) => logger.error({ err: error }, 'could not prepare default settings'));
});

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
