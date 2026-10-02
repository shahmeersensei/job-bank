import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/client';
import { runMigrations } from '../src/scripts/migrate';
import { testAppUrl, testMigratorUrl } from './helpers';

const app = createDb(testAppUrl, { max: 1 });
const suffix = crypto.randomUUID().slice(0, 8);
let userId: string;
let branchId: string;
let applicantId: string;

const cnic = () => `35${String(Math.floor(Math.random() * 1e11)).padStart(11, '0')}`;

beforeAll(async () => {
  await runMigrations(testMigratorUrl);
  [{ id: userId }] = await app.client<[{ id: string }]>`
    INSERT INTO users (name, email) VALUES ('M6 probe', ${`m6-${suffix}@probe.test`}) RETURNING id`;
  [{ id: branchId }] = await app.client<[{ id: string }]>`
    INSERT INTO branches (code, name, city) VALUES (${`M6-${suffix.toUpperCase()}`}, 'M6 probe', 'Karachi')
    RETURNING id`;
  [{ id: applicantId }] = await app.client<[{ id: string }]>`
    INSERT INTO applicants (user_id, full_name, father_name, cnic, date_of_birth, gender)
    VALUES (${userId}, 'Probe Person', 'Probe Father', ${cnic()}, '1995-01-01', 'MALE')
    RETURNING id`;
});

afterAll(async () => {
  await app.client.end();
});

const violates = (constraint: string) =>
  expect.objectContaining({ constraint_name: constraint }) as unknown as Error;

describe('applicants', () => {
  it('starts as an unverified DRAFT with no branch', async () => {
    const [row] = await app.client`
      SELECT status, identity_status, branch_id, profile_completeness FROM applicants WHERE id = ${applicantId}`;
    expect(row).toEqual({
      status: 'DRAFT',
      identity_status: 'UNVERIFIED',
      branch_id: null,
      profile_completeness: 0,
    });
  });

  it('only stores 13-digit CNICs', async () => {
    await expect(
      app.client`UPDATE applicants SET cnic = '42101-1234567-1' WHERE id = ${applicantId}`,
    ).rejects.toEqual(violates('applicants_cnic_format'));
  });

  it('cannot leave DRAFT without a branch (matching is per branch)', async () => {
    await expect(
      app.client`UPDATE applicants SET status = 'ACTIVE' WHERE id = ${applicantId}`,
    ).rejects.toEqual(violates('applicants_active_needs_branch'));
    await app.client`UPDATE applicants SET status = 'ACTIVE', branch_id = ${branchId} WHERE id = ${applicantId}`;
  });
});

describe('profile sections', () => {
  it('keeps experience dates consistent', async () => {
    await expect(
      app.client`INSERT INTO applicant_experience (applicant_id, employer_name, job_title, start_month, end_month, is_current)
                 VALUES (${applicantId}, 'ABC', 'Helper', '2022-05-01', '2021-01-01', false)`,
    ).rejects.toEqual(violates('applicant_experience_dates'));
    await expect(
      app.client`INSERT INTO applicant_experience (applicant_id, employer_name, job_title, start_month, end_month, is_current)
                 VALUES (${applicantId}, 'ABC', 'Helper', '2022-05-01', '2023-01-01', true)`,
    ).rejects.toEqual(violates('applicant_experience_dates'));
  });

  it('never lets an applicant ask for more than the 10 km maximum', async () => {
    await expect(
      app.client`INSERT INTO applicant_preferences (applicant_id, willing_radius_m) VALUES (${applicantId}, 10001)`,
    ).rejects.toEqual(violates('applicant_preferences_radius'));
  });

  it('indexes the home pin for distance queries', async () => {
    const [index] = await app.client`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'applicant_addresses_location_gix'`;
    expect(index?.indexdef).toContain('USING gist');
  });
});

describe('identity_verifications', () => {
  it('is append-only for the app role', async () => {
    const [{ id }] = await app.client<[{ id: string }]>`
      INSERT INTO identity_verifications (applicant_id, cnic, method, outcome, verified_by)
      VALUES (${applicantId}, '3500000000000', 'IN_PERSON', 'VERIFIED', ${userId}) RETURNING id`;
    await expect(
      app.client`UPDATE identity_verifications SET outcome = 'REJECTED' WHERE id = ${id}`,
    ).rejects.toThrow();
    await expect(app.client`DELETE FROM identity_verifications WHERE id = ${id}`).rejects.toThrow();
  });
});

describe('document types', () => {
  it('marks only certificates and letters as multi-file', async () => {
    const rows = await app.client<{ code: string }[]>`
      SELECT code FROM master_data
      WHERE type = 'DOCUMENT_TYPE' AND (meta->>'multiple')::boolean ORDER BY code`;
    expect(rows.map((r) => r.code)).toEqual(['EDUCATION_CERTIFICATE', 'EXPERIENCE_LETTER']);
  });
});
