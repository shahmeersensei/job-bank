import { runMigrations } from '@jobbank/db/migrate';
import { runSeed } from '@jobbank/db/seed';
import postgres from 'postgres';

/** Fails fast when Postgres is down, then migrates and seeds (roles, dev branches/users) the test DB. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_MIGRATOR_URL;
  if (!url)
    throw new Error('TEST_DATABASE_MIGRATOR_URL is not set (see apps/web/vitest.config.ts)');

  const sql = postgres(url, { max: 1, connect_timeout: 3, onnotice: () => {} });
  try {
    await sql`SELECT 1`;
  } catch (error) {
    const { hostname, port } = new URL(url);
    throw new Error(
      `Test database is not reachable at ${hostname}:${port} (${(error as NodeJS.ErrnoException).code ?? 'error'}).\n` +
        '  → Start Docker Desktop, then run: pnpm infra:up',
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
  await runMigrations(url);
  await runSeed(url);
}
