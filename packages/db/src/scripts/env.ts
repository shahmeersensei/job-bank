import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Loads the monorepo root `.env` for CLI scripts (Next.js loads env on its own). */
export function loadRootEnv(): void {
  const path = resolve(repoRoot, '.env');
  if (existsSync(path)) config({ path, quiet: true });
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return value;
}
