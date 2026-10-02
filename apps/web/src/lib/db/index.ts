import 'server-only';
import { createClient, createDrizzle, type Database } from '@jobbank/db';
import { env } from '@/lib/env';

// Reuse one connection pool across hot reloads in development, but rebuild the drizzle
// wrapper each time: it caches table/column names, which go stale when the schema changes.
const globalForDb = globalThis as unknown as { jobbankPgClient?: ReturnType<typeof createClient> };

const client = (globalForDb.jobbankPgClient ??= createClient(env.DATABASE_URL, {
  applicationName: 'jobbank-web',
}));

export const db = createDrizzle(client);
/** Raw postgres.js client — prefer `db`; use this only for health checks and raw PostGIS SQL. */
export const sqlClient = client;

export type { Database };
/** A transaction handle (same query API as `db`). */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run queries: the pool or an open transaction. */
export type DbExecutor = Database | Transaction;

/** Runs `fn` in a transaction; rolls back if it throws. */
export function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
