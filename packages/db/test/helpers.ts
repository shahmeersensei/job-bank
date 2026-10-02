import { loadRootEnv, requireEnv } from '../src/scripts/env';

loadRootEnv();

/** Points a connection URL at another database on the same server. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

const TEST_DATABASE = process.env.TEST_DATABASE_NAME ?? 'jobbank_test';

/** Owner connection to the isolated test database (created by infra/postgres/init). */
export const testMigratorUrl = withDatabase(requireEnv('DATABASE_MIGRATOR_URL'), TEST_DATABASE);
/** Runtime-role (app_rw) connection to the test database. */
export const testAppUrl = withDatabase(requireEnv('DATABASE_URL'), TEST_DATABASE);
