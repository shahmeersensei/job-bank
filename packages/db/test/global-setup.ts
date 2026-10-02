import postgres from 'postgres';
import { testMigratorUrl } from './helpers';

/**
 * Fails fast with one actionable message when the database is not running,
 * instead of every integration test dumping a connection AggregateError.
 */
export default async function checkDatabaseReachable() {
  const sql = postgres(testMigratorUrl, { max: 1, connect_timeout: 3, onnotice: () => {} });
  try {
    await sql`SELECT 1`;
  } catch (error) {
    const { hostname, port } = new URL(testMigratorUrl);
    const code = (error as NodeJS.ErrnoException).code ?? (error as Error).message;
    throw new Error(
      `Test database is not reachable at ${hostname}:${port} (${code}).\n` +
        '  → Start Docker Desktop, then run: pnpm infra:up',
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}
