import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { createDb, type Database } from '../client';
import { devData } from '../seed/dev-data';
import { masterDataSeed } from '../seed/master-data';
import { referenceData } from '../seed/reference-data';
import { loadRootEnv, requireEnv } from './env';

/**
 * A seed step must be idempotent (safe to run repeatedly). Modules append their
 * steps to `steps` below in dependency order (branches → users → master data → …).
 */
export interface SeedStep {
  name: string;
  run: (db: Database) => Promise<void>;
}

const includeDevData =
  process.env.NODE_ENV !== 'production' && process.env.SEED_DEV_DATA !== 'false';

const steps: SeedStep[] = [referenceData, masterDataSeed, ...(includeDevData ? [devData] : [])];

async function assertDatabaseReady(db: Database): Promise<void> {
  const [row] = await db.execute<{ postgis: string }>(sql`SELECT postgis_lib_version() AS postgis`);
  console.info(`• PostGIS ${row?.postgis} available`);
}

export async function runSeed(url: string): Promise<void> {
  const { db, client } = createDb(url, { max: 1, applicationName: 'jobbank-seed' });
  try {
    await assertDatabaseReady(db);
    for (const step of steps) {
      await step.run(db);
      console.info(`• seeded ${step.name}`);
    }
  } finally {
    await client.end();
  }
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  loadRootEnv();
  runSeed(requireEnv('DATABASE_MIGRATOR_URL'))
    .then(() => console.info(`✔ seed complete (${steps.length} steps)`))
    .catch((error: unknown) => {
      console.error('✘ seed failed:', error);
      process.exit(1);
    });
}
