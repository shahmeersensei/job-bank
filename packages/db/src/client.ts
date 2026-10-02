import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export interface CreateDbOptions {
  /** Max pool connections. Keep low in serverless environments. */
  max?: number;
  /** Tag shown in pg_stat_activity.application_name. */
  applicationName?: string;
}

export function createClient(url: string, options: CreateDbOptions = {}) {
  return postgres(url, {
    max: options.max ?? 10,
    connection: { application_name: options.applicationName ?? 'jobbank' },
    onnotice: () => {},
  });
}

/** Drizzle wrapper around an existing connection pool (cheap; holds the schema + casing cache). */
export function createDrizzle(client: ReturnType<typeof createClient>) {
  return drizzle(client, { schema, casing: 'snake_case' });
}

export function createDb(url: string, options: CreateDbOptions = {}) {
  const client = createClient(url, options);
  return { db: createDrizzle(client), client };
}

export type Database = ReturnType<typeof createDb>['db'];
