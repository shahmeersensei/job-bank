import { defineConfig } from 'drizzle-kit';
import { loadRootEnv, requireEnv } from './src/scripts/env';

loadRootEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
  // PostGIS owns these; never let drizzle-kit diff or drop them.
  extensionsFilters: ['postgis'],
  dbCredentials: { url: requireEnv('DATABASE_MIGRATOR_URL') },
  strict: true,
  verbose: true,
});
