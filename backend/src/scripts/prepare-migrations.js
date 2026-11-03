// Render runs `npm run db:deploy` on every build. If a migration failed on a
// previous deploy it stays in `_prisma_migrations` with finished_at = NULL which
// makes `prisma migrate deploy` fail with P3009 forever, so the service keeps
// serving the previous release. This script removes those stale rows when the
// migration folder no longer exists in the repository. Real, still-present
// migrations are never touched: they keep failing loudly until they are fixed.
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'prisma', 'migrations');
const onDisk = new Set(
  existsSync(migrationsDir)
    ? readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    : [],
);

const prisma = new PrismaClient();

async function main() {
  let rows;
  try {
    rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations',
    );
  } catch (error) {
    // Fresh database: Prisma creates the table during `migrate deploy`.
    if (/doesn't exist|Unknown table|no such table/i.test(String(error?.message))) {
      console.log('[prepare-migrations] no migration history yet, nothing to clean');
      return;
    }
    throw error;
  }

  const unfinished = rows.filter((row) => !row.finished_at || row.rolled_back_at);
  const stale = unfinished.filter((row) => !onDisk.has(row.migration_name));

  if (!unfinished.length) {
    console.log('[prepare-migrations] migration history is clean');
    return;
  }

  for (const row of unfinished) {
    if (onDisk.has(row.migration_name)) {
      console.warn(`[prepare-migrations] ${row.migration_name} is still unfinished and still exists on disk; leaving it for prisma migrate deploy to report`);
    }
  }

  for (const row of stale) {
    await prisma.$executeRawUnsafe(
      'DELETE FROM _prisma_migrations WHERE migration_name = ? AND (finished_at IS NULL OR rolled_back_at IS NOT NULL)',
      row.migration_name,
    );
    console.log(`[prepare-migrations] removed stale failed migration ${row.migration_name}`);
  }
}

main()
  .catch((error) => {
    console.error('[prepare-migrations] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
