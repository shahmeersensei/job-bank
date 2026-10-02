import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from '../client';
import { loadRootEnv, requireEnv } from './env';

export const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

/** Applies all pending migrations using the owner (migrator) connection. */
export async function runMigrations(url: string): Promise<void> {
  const { db, client } = createDb(url, { max: 1, applicationName: 'jobbank-migrator' });
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  loadRootEnv();
  const started = Date.now();
  runMigrations(requireEnv('DATABASE_MIGRATOR_URL'))
    .then(() => console.info(`✔ migrations applied in ${Date.now() - started}ms`))
    .catch((error: unknown) => {
      console.error('✘ migration failed:', error);
      process.exit(1);
    });
}
