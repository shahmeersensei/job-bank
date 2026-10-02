import { schema } from '@jobbank/db';
import { and, desc, eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as getApplicant, PATCH as staffPatch } from '@/app/api/v1/applicants/[id]/route';
import { GET as staffDocUrl } from '@/app/api/v1/applicants/[id]/documents/[docId]/url/route';
import { POST as verifyIdentity } from '@/app/api/v1/applicants/[id]/identity-verification/route';
import { PUT as changePhone } from '@/app/api/v1/applicants/[id]/phone/route';
import { PATCH as staffStatus } from '@/app/api/v1/applicants/[id]/status/route';
import { POST as transfer } from '@/app/api/v1/applicants/[id]/transfer/route';
import { GET as branchOptions } from '@/app/api/v1/applicants/me/branch-options/route';
import { PUT as putExperience } from '@/app/api/v1/applicants/me/experience/route';
import { POST as confirmDoc } from '@/app/api/v1/applicants/me/documents/[id]/confirm/route';
import { DELETE as removeDoc } from '@/app/api/v1/applicants/me/documents/[id]/route';
import { GET as docTypes, POST as presignDoc } from '@/app/api/v1/applicants/me/documents/route';
import { PUT as putLocation } from '@/app/api/v1/applicants/me/location/route';
import { PUT as putPreferences } from '@/app/api/v1/applicants/me/preferences/route';
import { GET as getMe, PATCH as patchMe } from '@/app/api/v1/applicants/me/route';
import { PUT as putSkills } from '@/app/api/v1/applicants/me/skills/route';
import { PATCH as myStatus } from '@/app/api/v1/applicants/me/status/route';
import { POST as register } from '@/app/api/v1/applicants/register/route';
import { GET as listApplicants } from '@/app/api/v1/applicants/route';
import { resetMemoryRateLimits } from '@/domains/shared/rate-limit';
import { db } from '@/lib/db';
import {
  call,
  owner,
  randomPhone,
  signIn,
  signInAdmin,
  signInApplicant,
  type Jar,
} from '@/test/api-client';

const KARACHI_HOME = { lat: 24.9256, lng: 67.0899 }; // ~1 km from the Gulshan branch
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

const randomCnic = () => `42${String(Math.floor(Math.random() * 1e11)).padStart(11, '0')}`;
let idempotency = 0;
const key = () => `it-applicant-${Date.now()}-${idempotency++}`;

const branchId = async (code: string) =>
  (
    await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(eq(schema.branches.code, code))
  )[0]!.id;

let khi: string;
let lhr: string;

beforeAll(async () => {
  khi = await branchId('KHI-GULSHAN');
  lhr = await branchId('LHR-JOHAR');
});
beforeEach(() => resetMemoryRateLimits());

const personal = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Ayesha Khan',
  fatherName: 'Imran Khan',
  cnic: randomCnic(),
  dateOfBirth: '1998-04-12',
  gender: 'FEMALE',
  email: '',
  ...overrides,
});

async function registered(overrides: Record<string, unknown> = {}) {
  const jar = await signInApplicant(randomPhone());
  const body = personal(overrides);
  const res = await call(register, '/api/v1/applicants/register', {
    method: 'POST',
    body,
    jar,
    headers: { 'idempotency-key': key() },
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { jar, profile: res.body.data, cnic: body.cnic as string };
}

const location = (branch: string) => ({
  location: KARACHI_HOME,
  addressLine: 'House 12, Block 13-D',
  cityCode: 'KARACHI',
  areaCode: 'KARACHI_GULSHAN_E_IQBAL',
  branchId: branch,
});

async function upload(jar: Jar, typeCode: string, bytes = PNG, contentType = 'image/png') {
  const presigned = await call(presignDoc, '/api/v1/applicants/me/documents', {
    method: 'POST',
    body: { typeCode, fileName: `${typeCode}.png`, contentType, sizeBytes: bytes.byteLength },
    jar,
  });
  expect(presigned.status, JSON.stringify(presigned.body)).toBe(201);
  const { documentId, upload: put } = presigned.body.data;
  const stored = await fetch(put.url, { method: 'PUT', headers: put.headers, body: bytes });
  expect(stored.status).toBe(200);
  const confirmed = await call(
    confirmDoc,
    `/api/v1/applicants/me/documents/${documentId}/confirm`,
    {
      method: 'POST',
      jar,
      params: { id: documentId },
    },
  );
  expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
  return { documentId: documentId as string, profile: confirmed.body.data };
}

/** Registered, located in Karachi and with both CNIC sides: an ACTIVE profile. */
async function activeApplicant() {
  const r = await registered();
  expect(
    (
      await call(putLocation, '/api/v1/applicants/me/location', {
        method: 'PUT',
        body: location(khi),
        jar: r.jar,
      })
    ).status,
  ).toBe(200);
  await upload(r.jar, 'CNIC_FRONT');
  const back = await upload(r.jar, 'CNIC_BACK');
  expect(back.profile.status).toBe('ACTIVE');
  return { ...r, profile: back.profile };
}

const latestAudit = async (action: string, entityId: string) =>
  (
    await db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, action), eq(schema.auditLogs.entityId, entityId)))
      .orderBy(desc(schema.auditLogs.id))
      .limit(1)
  )[0];

describe('applicant registration', () => {
  it('starts a DRAFT profile from the phone account and names the account', async () => {
    const jar = await signInApplicant(randomPhone());
    expect((await call(getMe, '/api/v1/applicants/me', { jar })).status).toBe(404);

    const body = personal();
    const res = await call(register, '/api/v1/applicants/register', {
      method: 'POST',
      body: {
        ...body,
        cnic: `${body.cnic.slice(0, 5)}-${body.cnic.slice(5, 12)}-${body.cnic.slice(12)}`,
      },
      jar,
      headers: { 'idempotency-key': key() },
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'DRAFT',
      identityStatus: 'UNVERIFIED',
      personal: { fullName: 'Ayesha Khan', cnic: body.cnic, email: null },
      completeness: { percent: 20, activationMissing: ['location', 'documents'] },
      branch: null,
    });
    const [user] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .innerJoin(schema.applicants, eq(schema.applicants.userId, schema.users.id))
      .where(eq(schema.applicants.id, res.body.data.id));
    expect(user!.name).toBe('Ayesha Khan');

    const again = await call(register, '/api/v1/applicants/register', {
      method: 'POST',
      body: personal(),
      jar,
      headers: { 'idempotency-key': key() },
    });
    expect(again.status).toBe(409);
  });

  it('rejects under-18s and malformed CNICs', async () => {
    const jar = await signInApplicant(randomPhone());
    const young = new Date();
    young.setUTCFullYear(young.getUTCFullYear() - 17);
    const res = await call(register, '/api/v1/applicants/register', {
      method: 'POST',
      body: personal({ dateOfBirth: young.toISOString().slice(0, 10), cnic: '12345' }),
      jar,
      headers: { 'idempotency-key': key() },
    });
    expect(res.status).toBe(422);
    const paths = res.body.error.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['dateOfBirth', 'cnic']));
  });

  it('refuses a CNIC that is already registered and points to its branch', async () => {
    const first = await registered();
    await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(khi),
      jar: first.jar,
    });

    const intruder = await signInApplicant(randomPhone());
    const res = await call(register, '/api/v1/applicants/register', {
      method: 'POST',
      body: personal({ cnic: first.cnic }),
      jar: intruder,
      headers: { 'idempotency-key': key() },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('Karachi — Gulshan-e-Iqbal');
    expect(res.body.error.details).toMatchObject({ reason: 'CNIC_TAKEN' });
    expect(JSON.stringify(res.body)).not.toContain('+92');

    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.correlationId, res.body.error.correlation_id));
    expect(audit?.action).toBe('applicant.register_duplicate_cnic');
  });
});

describe('location, branch and profile sections', () => {
  it('suggests the nearest active branch and stores the pin as a geography point', async () => {
    const { jar } = await registered();
    const options = await call(
      branchOptions,
      `/api/v1/applicants/me/branch-options?lat=${KARACHI_HOME.lat}&lng=${KARACHI_HOME.lng}`,
      { jar },
    );
    expect(options.status).toBe(200);
    expect(options.body.data[0]).toMatchObject({ code: 'KHI-GULSHAN' });
    expect(options.body.data[0].distanceM).toBeLessThan(2000);

    const wrongArea = await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: { ...location(khi), areaCode: 'LAHORE_JOHAR_TOWN' },
      jar,
    });
    expect(wrongArea.status).toBe(422);

    const saved = await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(khi),
      jar,
    });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    expect(saved.body.data.branch.code).toBe('KHI-GULSHAN');
    expect(saved.body.data.completeness.percent).toBe(40);
    const [stored] = await owner<[{ type: string; lat: number }]>`
      SELECT GeometryType(location::geometry) AS type, ST_Y(location::geometry) AS lat
      FROM applicant_addresses WHERE applicant_id = ${saved.body.data.id}`;
    expect(stored).toMatchObject({ type: 'POINT', lat: KARACHI_HOME.lat });
  });

  it('validates section codes, dates and the radius cap', async () => {
    const { jar } = await registered();
    await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(khi),
      jar,
    });

    const badSkill = await call(putSkills, '/api/v1/applicants/me/skills', {
      method: 'PUT',
      body: { items: [{ skillCode: 'NOT_A_SKILL', level: 'EXPERT', years: 3 }] },
      jar,
    });
    expect(badSkill.status).toBe(422);
    expect(badSkill.body.error.issues[0].path).toBe('items.0.skillCode');

    const contradiction = await call(putExperience, '/api/v1/applicants/me/experience', {
      method: 'PUT',
      body: {
        hasNoExperience: true,
        items: [
          { employerName: 'ABC', jobTitle: 'Helper', startMonth: '2020-01', isCurrent: true },
        ],
      },
      jar,
    });
    expect(contradiction.status).toBe(422);

    const fresher = await call(putExperience, '/api/v1/applicants/me/experience', {
      method: 'PUT',
      body: { hasNoExperience: true, items: [] },
      jar,
    });
    expect(fresher.body.data.completeness.sections).toContainEqual(
      expect.objectContaining({ id: 'experience', done: true }),
    );

    const [skill] = await db
      .select({ code: schema.masterData.code })
      .from(schema.masterData)
      .where(and(eq(schema.masterData.type, 'SKILL'), eq(schema.masterData.isActive, true)))
      .limit(1);
    const skills = await call(putSkills, '/api/v1/applicants/me/skills', {
      method: 'PUT',
      body: { items: [{ skillCode: skill!.code, level: 'INTERMEDIATE', years: 2 }] },
      jar,
    });
    expect(skills.status).toBe(200);
    expect(skills.body.data.skills).toEqual([
      { skillCode: skill!.code, level: 'INTERMEDIATE', years: 2 },
    ]);

    const [category] = await db
      .select({ code: schema.masterData.code })
      .from(schema.masterData)
      .where(eq(schema.masterData.type, 'JOB_CATEGORY'))
      .limit(1);
    const tooFar = await call(putPreferences, '/api/v1/applicants/me/preferences', {
      method: 'PUT',
      body: { categoryCodes: [category!.code], shifts: [], jobTypes: [], willingRadiusM: 12000 },
      jar,
    });
    expect(tooFar.status).toBe(422);
    const prefs = await call(putPreferences, '/api/v1/applicants/me/preferences', {
      method: 'PUT',
      body: {
        categoryCodes: [category!.code],
        shifts: ['DAY'],
        jobTypes: ['FULL_TIME'],
        willingRadiusM: 6000,
        minSalaryPkr: 40000,
      },
      jar,
    });
    expect(prefs.status, JSON.stringify(prefs.body)).toBe(200);
    expect(prefs.body.data.completeness.percent).toBe(20 + 20 + 15 + 10 + 10);
  });
});

describe('documents and activation', () => {
  it('lists upload rules and refuses files that break them', async () => {
    const { jar } = await registered();
    const beforeLocation = await call(presignDoc, '/api/v1/applicants/me/documents', {
      method: 'POST',
      body: { typeCode: 'CNIC_FRONT', fileName: 'a.png', contentType: 'image/png', sizeBytes: 10 },
      jar,
    });
    expect(beforeLocation.status).toBe(409);
    await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(khi),
      jar,
    });

    const types = await call(docTypes, '/api/v1/applicants/me/documents', { jar });
    expect(
      types.body.data.find((t: { code: string }) => t.code === 'CNIC_FRONT').meta,
    ).toMatchObject({
      required: true,
      multiple: false,
    });
    const pdfForCnic = await call(presignDoc, '/api/v1/applicants/me/documents', {
      method: 'POST',
      body: {
        typeCode: 'CNIC_FRONT',
        fileName: 'a.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
      },
      jar,
    });
    expect(pdfForCnic.status).toBe(422);
    const huge = await call(presignDoc, '/api/v1/applicants/me/documents', {
      method: 'POST',
      body: {
        typeCode: 'PHOTO',
        fileName: 'a.png',
        contentType: 'image/png',
        sizeBytes: 3 * 1024 * 1024,
      },
      jar,
    });
    expect(huge.status).toBe(422);

    // Presigned but never uploaded: confirming must fail.
    const ghost = await call(presignDoc, '/api/v1/applicants/me/documents', {
      method: 'POST',
      body: { typeCode: 'CV', fileName: 'cv.pdf', contentType: 'application/pdf', sizeBytes: 100 },
      jar,
    });
    const confirmGhost = await call(
      confirmDoc,
      `/api/v1/applicants/me/documents/${ghost.body.data.documentId}/confirm`,
      { method: 'POST', jar, params: { id: ghost.body.data.documentId } },
    );
    expect(confirmGhost.status).toBe(409);
  });

  it('activates automatically once both CNIC sides are uploaded, then locks the branch', async () => {
    const { jar, profile } = await registered();
    await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(khi),
      jar,
    });
    const front = await upload(jar, 'CNIC_FRONT');
    expect(front.profile.status).toBe('DRAFT');

    // A re-upload replaces the old front image instead of adding a second one.
    const front2 = await upload(jar, 'CNIC_FRONT');
    expect(
      front2.profile.documents.filter((d: { typeCode: string }) => d.typeCode === 'CNIC_FRONT'),
    ).toHaveLength(1);

    const back = await upload(jar, 'CNIC_BACK');
    expect(back.profile).toMatchObject({ status: 'ACTIVE', branchLocked: true });
    expect(back.profile.activatedAt).not.toBeNull();
    expect(await latestAudit('applicant.activate', profile.id)).toBeDefined();

    const moveBranch = await call(putLocation, '/api/v1/applicants/me/location', {
      method: 'PUT',
      body: location(lhr),
      jar,
    });
    expect(moveBranch.status).toBe(403);

    const required = await call(removeDoc, `/api/v1/applicants/me/documents/${back.documentId}`, {
      method: 'DELETE',
      jar,
      params: { id: back.documentId },
    });
    expect(required.status).toBe(409);
  });

  it('lets applicants pause and resume their profile', async () => {
    const { jar } = await activeApplicant();
    const paused = await call(myStatus, '/api/v1/applicants/me/status', {
      method: 'PATCH',
      body: { status: 'INACTIVE' },
      jar,
    });
    expect(paused.body.data.status).toBe('INACTIVE');
    const resumed = await call(myStatus, '/api/v1/applicants/me/status', {
      method: 'PATCH',
      body: { status: 'ACTIVE' },
      jar,
    });
    expect(resumed.body.data.status).toBe('ACTIVE');
  });
});

describe('staff access', () => {
  it('scopes search and profiles to the branch, and audits denied access', async () => {
    const { profile } = await activeApplicant();
    const khiStaff = await signIn('staff.khi@jobbank.local');
    const found = await call(
      listApplicants,
      `/api/v1/applicants?q=${profile.personal.cnic.slice(0, 9)}&status=ACTIVE`,
      { jar: khiStaff },
    );
    expect(found.status).toBe(200);
    const row = found.body.data.find((r: { id: string }) => r.id === profile.id);
    expect(row).toMatchObject({
      branchName: 'Karachi — Gulshan-e-Iqbal',
      areaLabel: expect.any(String),
    });
    expect(row.cnicMasked).toContain('•');
    expect(JSON.stringify(found.body)).not.toContain(profile.personal.cnic);

    const lhrStaff = await signIn('staff.lhr@jobbank.local');
    const denied = await call(getApplicant, `/api/v1/applicants/${profile.id}`, {
      jar: lhrStaff,
      params: { id: profile.id },
    });
    expect(denied.status).toBe(403);
    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.correlationId, denied.body.error.correlation_id));
    expect(audit).toMatchObject({ action: 'access.scope_violation', entityId: profile.id });

    const lhrList = await call(listApplicants, `/api/v1/applicants?q=${profile.personal.cnic}`, {
      jar: lhrStaff,
    });
    expect(lhrList.body.data).toEqual([]);

    const employer = await signIn('employer@jobbank.local');
    expect((await call(listApplicants, '/api/v1/applicants', { jar: employer })).status).toBe(403);
    expect(
      (
        await call(getApplicant, `/api/v1/applicants/${profile.id}`, {
          jar: employer,
          params: { id: profile.id },
        })
      ).status,
    ).toBe(403);
  });

  it('verifies identity from the CNIC images, audits document views and locks identity fields', async () => {
    const { jar, profile } = await activeApplicant();
    const staff = await signIn('staff.khi@jobbank.local');
    const front = profile.documents.find((d: { typeCode: string }) => d.typeCode === 'CNIC_FRONT');

    const link = await call(
      staffDocUrl,
      `/api/v1/applicants/${profile.id}/documents/${front.id}/url`,
      {
        jar: staff,
        params: { id: profile.id, docId: front.id },
      },
    );
    expect(link.status).toBe(200);
    const image = await fetch(link.body.data.url);
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(PNG);
    expect(await latestAudit('applicant.document_view', profile.id)).toMatchObject({
      metadata: { documentId: front.id, typeCode: 'CNIC_FRONT' },
    });

    const rejectWithoutNote = await call(
      verifyIdentity,
      `/api/v1/applicants/${profile.id}/identity-verification`,
      {
        method: 'POST',
        body: { outcome: 'REJECTED', method: 'DOCUMENT_REVIEW' },
        jar: staff,
        params: { id: profile.id },
      },
    );
    expect(rejectWithoutNote.status).toBe(422);

    const verified = await call(
      verifyIdentity,
      `/api/v1/applicants/${profile.id}/identity-verification`,
      {
        method: 'POST',
        body: { outcome: 'VERIFIED', method: 'DOCUMENT_REVIEW' },
        jar: staff,
        params: { id: profile.id },
      },
    );
    expect(verified.status, JSON.stringify(verified.body)).toBe(201);
    expect(verified.body.data).toMatchObject({ identityStatus: 'VERIFIED', identityLocked: true });
    expect(verified.body.data.identityHistory[0]).toMatchObject({
      outcome: 'VERIFIED',
      verifiedByName: 'Sana Staff (Karachi)',
      cnicMatchesCurrent: true,
    });
    expect(
      verified.body.data.documents
        .filter((d: { typeCode: string }) => d.typeCode.startsWith('CNIC_'))
        .map((d: { status: string }) => d.status),
    ).toEqual(['ACCEPTED', 'ACCEPTED']);

    const locked = await call(patchMe, '/api/v1/applicants/me', {
      method: 'PATCH',
      body: { fullName: 'Someone Else' },
      jar,
    });
    expect(locked.status).toBe(403);
    const lockedImage = await call(presignDoc, '/api/v1/applicants/me/documents', {
      method: 'POST',
      body: { typeCode: 'CNIC_FRONT', fileName: 'a.png', contentType: 'image/png', sizeBytes: 10 },
      jar,
    });
    expect(lockedImage.status).toBe(403);
    const stillEditable = await call(patchMe, '/api/v1/applicants/me', {
      method: 'PATCH',
      body: { email: 'ayesha@example.com' },
      jar,
    });
    expect(stillEditable.body.data.personal.email).toBe('ayesha@example.com');

    // History is evidence: the database refuses to change it.
    await expect(
      owner`UPDATE identity_verifications SET outcome = 'REJECTED' WHERE applicant_id = ${profile.id}`,
    ).rejects.toMatchObject({ code: 'JB001' });

    // A staff correction of an identity field sends the profile back for a new check.
    const corrected = await call(staffPatch, `/api/v1/applicants/${profile.id}`, {
      method: 'PATCH',
      body: { fatherName: 'Imran Ahmed Khan', reason: 'Typo found while checking the card' },
      jar: staff,
      params: { id: profile.id },
    });
    expect(corrected.status, JSON.stringify(corrected.body)).toBe(200);
    expect(corrected.body.data).toMatchObject({ identityStatus: 'UNVERIFIED' });
    expect(await latestAudit('applicant.staff_update', profile.id)).toMatchObject({
      reason: 'Typo found while checking the card',
    });
  });

  it('moves a profile to a new phone number and ends the old sessions', async () => {
    const { jar, profile } = await activeApplicant();
    const staff = await signIn('staff.khi@jobbank.local');
    const newPhone = randomPhone();
    const changed = await call(changePhone, `/api/v1/applicants/${profile.id}/phone`, {
      method: 'PUT',
      body: { phone: newPhone, reason: 'Lost SIM, verified at the branch' },
      jar: staff,
      params: { id: profile.id },
    });
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    expect(changed.body.data.personal.phone).toBe(newPhone);

    expect((await call(getMe, '/api/v1/applicants/me', { jar })).status).toBe(401);
    const fresh = await signInApplicant(newPhone);
    const me = await call(getMe, '/api/v1/applicants/me', { jar: fresh });
    expect(me.body.data.id).toBe(profile.id);
  });

  it('deactivates with a reason, and lets a Branch Admin transfer to another branch', async () => {
    const { profile } = await activeApplicant();
    const staff = await signIn('staff.khi@jobbank.local');
    const noReason = await call(staffStatus, `/api/v1/applicants/${profile.id}/status`, {
      method: 'PATCH',
      body: { status: 'INACTIVE' },
      jar: staff,
      params: { id: profile.id },
    });
    expect(noReason.status).toBe(422);
    const inactive = await call(staffStatus, `/api/v1/applicants/${profile.id}/status`, {
      method: 'PATCH',
      body: { status: 'INACTIVE', reason: 'Unreachable for 3 weeks' },
      jar: staff,
      params: { id: profile.id },
    });
    expect(inactive.body.data).toMatchObject({
      status: 'INACTIVE',
      statusReason: 'Unreachable for 3 weeks',
    });

    // Staff cannot transfer; the Branch Admin can.
    expect(
      (
        await call(transfer, `/api/v1/applicants/${profile.id}/transfer`, {
          method: 'POST',
          body: { branchId: lhr, reason: 'Moved to Lahore' },
          jar: staff,
          params: { id: profile.id },
        })
      ).status,
    ).toBe(403);
    const admin = await signInAdmin('branchadmin.khi@jobbank.local');
    const moved = await call(transfer, `/api/v1/applicants/${profile.id}/transfer`, {
      method: 'POST',
      body: { branchId: lhr, reason: 'Moved to Lahore' },
      jar: admin,
      params: { id: profile.id },
    });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(moved.body.data.branch.code).toBe('LHR-JOHAR');

    expect(
      (
        await call(getApplicant, `/api/v1/applicants/${profile.id}`, {
          jar: staff,
          params: { id: profile.id },
        })
      ).status,
    ).toBe(403);
    const lhrStaff = await signIn('staff.lhr@jobbank.local');
    expect(
      (
        await call(getApplicant, `/api/v1/applicants/${profile.id}`, {
          jar: lhrStaff,
          params: { id: profile.id },
        })
      ).status,
    ).toBe(200);
  });
});
