import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationsFolder } from '../src/scripts/migrate';

describe('migration files', () => {
  // drizzle-kit quotes custom types like geography(Point, 4326) as identifiers, which
  // Postgres rejects. Every generated migration must be fixed by hand — this catches it.
  it('never quote the PostGIS geography type', () => {
    const offenders = readdirSync(migrationsFolder)
      .filter((file) => file.endsWith('.sql'))
      .filter((file) => /"geography\(/.test(readFileSync(`${migrationsFolder}/${file}`, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
