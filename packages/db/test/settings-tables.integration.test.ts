import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/client';
import { runMigrations } from '../src/scripts/migrate';
import { testAppUrl, testMigratorUrl } from './helpers';

const app = createDb(testAppUrl, { max: 1 });
let branchId: string;
let categoryId: string;

beforeAll(async () => {
  await runMigrations(testMigratorUrl);
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  [{ id: branchId }] = await app.client<[{ id: string }]>`
    INSERT INTO branches (code, name, city) VALUES (${`M5-${suffix}`}, 'M5 probe', 'Karachi')
    RETURNING id`;
  [{ id: categoryId }] = await app.client<[{ id: string }]>`
    INSERT INTO master_data (type, code, label) VALUES ('JOB_CATEGORY', ${`M5_PROBE_${suffix}`}, 'Probe')
    RETURNING id`;
});

afterAll(async () => {
  await app.client`DELETE FROM match_radius_policies WHERE branch_id = ${branchId} OR category_id = ${categoryId}`;
  await app.client`DELETE FROM master_data WHERE id = ${categoryId}`;
  await app.client`DELETE FROM branches WHERE id = ${branchId}`;
  await app.client.end();
});

const violates = (constraint: string) =>
  expect.objectContaining({ constraint_name: constraint }) as unknown as Error;

describe('match_radius_policies', () => {
  it('has exactly one global policy, created by the migration', async () => {
    const rows =
      await app.client`SELECT preferred_m, max_m FROM match_radius_policies WHERE scope = 'GLOBAL'`;
    expect(rows).toHaveLength(1);
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, preferred_m, max_m) VALUES ('GLOBAL', 5000, 9000)`,
    ).rejects.toEqual(violates('match_radius_policies_global_uq'));
  });

  it('never allows a radius beyond 10 km, or preferred above max', async () => {
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, branch_id, preferred_m, max_m)
                 VALUES ('BRANCH', ${branchId}, 8000, 10001)`,
    ).rejects.toEqual(violates('match_radius_policies_range'));
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, branch_id, preferred_m, max_m)
                 VALUES ('BRANCH', ${branchId}, 9000, 8000)`,
    ).rejects.toEqual(violates('match_radius_policies_range'));
  });

  it('requires the reference column that matches the scope, once per target', async () => {
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, category_id, preferred_m, max_m)
                 VALUES ('BRANCH', ${categoryId}, 5000, 8000)`,
    ).rejects.toEqual(violates('match_radius_policies_scope_ref'));
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, preferred_m, max_m) VALUES ('JOB', 5000, 8000)`,
    ).rejects.toEqual(violates('match_radius_policies_scope_ref'));

    await app.client`INSERT INTO match_radius_policies (scope, category_id, preferred_m, max_m)
                     VALUES ('CATEGORY', ${categoryId}, 5000, 8000)`;
    await expect(
      app.client`INSERT INTO match_radius_policies (scope, category_id, preferred_m, max_m)
                 VALUES ('CATEGORY', ${categoryId}, 4000, 6000)`,
    ).rejects.toEqual(violates('match_radius_policies_category_uq'));
  });
});

describe('master_data', () => {
  it('rejects unknown types, badly formatted codes and duplicate codes per type', async () => {
    await expect(
      app.client`INSERT INTO master_data (type, code, label) VALUES ('PLANET', 'MARS', 'Mars')`,
    ).rejects.toEqual(violates('master_data_type_valid'));
    await expect(
      app.client`INSERT INTO master_data (type, code, label) VALUES ('SKILL', 'not code', 'x')`,
    ).rejects.toEqual(violates('master_data_code_format'));
    const [{ code }] = await app.client<
      [{ code: string }]
    >`SELECT code FROM master_data WHERE id = ${categoryId}`;
    await expect(
      app.client`INSERT INTO master_data (type, code, label) VALUES ('JOB_CATEGORY', ${code}, 'Again')`,
    ).rejects.toEqual(violates('master_data_type_code_uq'));
  });
});

describe('system_settings', () => {
  it('stores one global value per key (NULL branch counts as the same target)', async () => {
    const key = `test.${crypto.randomUUID()}`;
    await app.client`INSERT INTO system_settings (key, value) VALUES (${key}, '1')`;
    await expect(
      app.client`INSERT INTO system_settings (key, value) VALUES (${key}, '2')`,
    ).rejects.toEqual(violates('system_settings_key_branch_uq'));
    await app.client`DELETE FROM system_settings WHERE key = ${key}`;
  });
});
