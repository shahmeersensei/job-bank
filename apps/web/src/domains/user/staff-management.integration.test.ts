import { schema } from '@jobbank/db';
import { DEV_PASSWORD } from '@jobbank/db/seed/dev-data';
import { and, desc, eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as confirm2fa } from '@/app/api/v1/account/2fa/confirm/route';
import { POST as disable2fa } from '@/app/api/v1/account/2fa/disable/route';
import { POST as enroll2fa } from '@/app/api/v1/account/2fa/enroll/route';
import { POST as verify2fa } from '@/app/api/v1/auth/2fa/verify/route';
import { POST as emailCodeRequest } from '@/app/api/v1/auth/email-otp/request/route';
import { POST as emailCodeVerify } from '@/app/api/v1/auth/email-otp/verify/route';
import { POST as acceptInvite } from '@/app/api/v1/auth/invitations/accept/route';
import { GET as lookupInvite } from '@/app/api/v1/auth/invitations/lookup/route';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as me } from '@/app/api/v1/auth/me/route';
import { POST as forgot } from '@/app/api/v1/auth/password/forgot/route';
import { POST as reset } from '@/app/api/v1/auth/password/reset/route';
import { PATCH as patchBranch } from '@/app/api/v1/branches/[id]/route';
import { GET as listBranchesRoute, POST as createBranchRoute } from '@/app/api/v1/branches/route';
import { POST as resendInvite } from '@/app/api/v1/users/[id]/invitation/route';
import { DELETE as revokeRoleRoute } from '@/app/api/v1/users/[id]/roles/[assignmentId]/route';
import { POST as grantRoleRoute } from '@/app/api/v1/users/[id]/roles/route';
import { GET as getUser } from '@/app/api/v1/users/[id]/route';
import { PATCH as setStatus } from '@/app/api/v1/users/[id]/status/route';
import { POST as reset2faRoute } from '@/app/api/v1/users/[id]/two-factor/reset/route';
import { GET as listUsers, POST as inviteRoute } from '@/app/api/v1/users/route';
import { resetMemoryRateLimits } from '@/domains/shared/rate-limit';
import { db } from '@/lib/db';
import { mailOutbox } from '@/lib/mail/mailer';
import {
  call,
  enrollTwoFactor,
  Jar,
  resetTwoFactor,
  signIn,
  signInAdmin,
  totpCode,
  uniqueEmail,
} from '@/test/api-client';

const branchId = async (code: string) =>
  (
    await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(eq(schema.branches.code, code))
  )[0]!.id;

function lastMailTo(email: string) {
  const mail = [...mailOutbox].reverse().find((m) => m.to.toLowerCase() === email.toLowerCase());
  if (!mail) throw new Error(`no email captured for ${email}`);
  return mail;
}
const tokenFrom = (text: string) => text.match(/token=([A-Za-z0-9_-]+)/)?.[1] ?? '';

let KHI: string;
let LHR: string;
beforeAll(async () => {
  KHI = await branchId('KHI-GULSHAN');
  LHR = await branchId('LHR-JOHAR');
});
beforeEach(() => resetMemoryRateLimits());

/** Invites + activates a staff member through the real flow; returns their id and session. */
async function inviteAndActivate(adminJar: Jar, role: 'STAFF' | 'VERIFIER', branch: string) {
  const email = uniqueEmail('staff');
  const invited = await call(inviteRoute, '/api/v1/users', {
    method: 'POST',
    jar: adminJar,
    headers: { 'idempotency-key': crypto.randomUUID() },
    body: { name: 'Test Staff', email, title: 'Placement Officer', role, branchId: branch },
  });
  expect(invited.status, JSON.stringify(invited.body)).toBe(201);
  const token = tokenFrom(lastMailTo(email).text);
  const jar = new Jar();
  const accepted = await call(acceptInvite, '/api/v1/auth/invitations/accept', {
    method: 'POST',
    body: { token, password: DEV_PASSWORD },
    jar,
  });
  expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
  return { id: invited.body.data.user.id as string, email, jar };
}

// ─── Mandatory two-factor (decided for M4) ────────────────────────────

describe('two-factor authentication', () => {
  it('Super Admin is blocked until enrolment, then needs a code at every sign-in', async () => {
    const email = 'superadmin@jobbank.local';
    await resetTwoFactor(email);
    const jar = await signIn(email);

    const blocked = await call(listBranchesRoute, '/api/v1/branches', { jar });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.details).toEqual({ reason: 'TWO_FACTOR_SETUP_REQUIRED' });
    expect((await call(me, '/api/v1/auth/me', { jar })).body.data.twoFactorPending).toBe(true);

    const badPassword = await call(enroll2fa, '/api/v1/account/2fa/enroll', {
      method: 'POST',
      jar,
      body: { password: 'wrong-password-1' },
    });
    expect(badPassword.status).toBe(401);

    const start = await call(enroll2fa, '/api/v1/account/2fa/enroll', {
      method: 'POST',
      jar,
      body: { password: DEV_PASSWORD },
    });
    expect(start.status).toBe(200);
    expect(start.body.data.qrSvg).toMatch(/^<svg/);
    expect(start.body.data.backupCodes).toHaveLength(10);
    const wrong = await call(confirm2fa, '/api/v1/account/2fa/confirm', {
      method: 'POST',
      jar,
      body: { code: '000000' },
    });
    expect(wrong.status).toBe(401);
    await resetTwoFactor(email); // start over through the helper, which records the secret
    const fresh = await signIn(email);
    const backupCodes = await enrollTwoFactor(email, fresh);
    expect((await call(listBranchesRoute, '/api/v1/branches', { jar: fresh })).status).toBe(200);

    // Next sign-in: password alone is not enough.
    const step1 = new Jar();
    const pw = await call(login, '/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: DEV_PASSWORD },
      jar: step1,
    });
    expect(pw.body.data).toMatchObject({ kind: 'two_factor_required', methods: ['totp'] });
    expect((await call(me, '/api/v1/auth/me', { jar: step1 })).status).toBe(401);
    expect(
      (
        await call(verify2fa, '/api/v1/auth/2fa/verify', {
          method: 'POST',
          jar: step1,
          body: { code: '123456' },
        })
      ).status,
    ).toBe(401);
    const ok = await call(verify2fa, '/api/v1/auth/2fa/verify', {
      method: 'POST',
      jar: step1,
      body: { code: totpCode(email) },
    });
    expect(ok.status).toBe(200);
    expect((await call(me, '/api/v1/auth/me', { jar: step1 })).body.data.twoFactorPending).toBe(
      false,
    );

    // A backup code works exactly once.
    const viaBackup = async () => {
      const j = new Jar();
      await call(login, '/api/v1/auth/login', {
        method: 'POST',
        body: { email, password: DEV_PASSWORD },
        jar: j,
      });
      return call(verify2fa, '/api/v1/auth/2fa/verify', {
        method: 'POST',
        jar: j,
        body: { backupCode: backupCodes[0] },
      });
    };
    expect((await viaBackup()).status).toBe(200);
    expect((await viaBackup()).status).toBe(401);
  });

  it('admins cannot turn two-factor off; other staff can opt in and out', async () => {
    const admin = await signInAdmin('branchadmin.khi@jobbank.local');
    const refused = await call(disable2fa, '/api/v1/account/2fa/disable', {
      method: 'POST',
      jar: admin,
      body: { password: DEV_PASSWORD },
    });
    expect(refused.status).toBe(403);

    const email = 'verifier.khi@jobbank.local';
    await resetTwoFactor(email);
    const jar = await signIn(email);
    expect((await call(me, '/api/v1/auth/me', { jar })).body.data.twoFactorPending).toBe(false);
    await enrollTwoFactor(email, jar);
    expect(
      (
        await call(disable2fa, '/api/v1/account/2fa/disable', {
          method: 'POST',
          jar,
          body: { password: DEV_PASSWORD },
        })
      ).status,
    ).toBe(200);
    const after = await call(login, '/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: DEV_PASSWORD },
    });
    expect(after.body.data.kind).toBe('signed_in');
  });
});

// ─── Branches ─────────────────────────────────────────────────────────

describe('branch management', () => {
  it('Super Admin creates (idempotently) and edits branches; codes are unique and permanent', async () => {
    const jar = await signInAdmin('superadmin@jobbank.local');
    const code = `T-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const key = crypto.randomUUID();
    const body = {
      code,
      name: 'Test Branch',
      city: 'Hyderabad',
      location: { lat: 25.396, lng: 68.3578 },
      matchRadius: { preferredM: 6000, maxM: 8000 },
    };
    const create = () =>
      call(createBranchRoute, '/api/v1/branches', {
        method: 'POST',
        jar,
        body,
        headers: { 'idempotency-key': key },
      });

    const first = await create();
    const retry = await create();
    expect(first.status).toBe(201);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(first.body.data).toMatchObject({
      code,
      staffCount: 0,
      location: { lat: 25.396, lng: 68.3578 },
      matchRadius: { preferredM: 6000, maxM: 8000, source: 'BRANCH' },
    });

    const dup = await call(createBranchRoute, '/api/v1/branches', {
      method: 'POST',
      jar,
      body,
      headers: { 'idempotency-key': crypto.randomUUID() },
    });
    expect(dup.status).toBe(409);

    const id = first.body.data.id;
    const renamed = await call(patchBranch, `/api/v1/branches/${id}`, {
      method: 'PATCH',
      jar,
      params: { id },
      body: { name: 'Test Branch Renamed', code: 'HACKED' },
    });
    // A partial update must not reset unrelated fields (regression: radius default leaked into PATCH).
    expect(renamed.body.data).toMatchObject({
      name: 'Test Branch Renamed',
      code,
      matchRadius: { maxM: 8000, source: 'BRANCH' },
    });

    // Re-saving identical values (the form sends every field) writes no audit row.
    const auditCount = async () =>
      (
        await db
          .select({ id: schema.auditLogs.id })
          .from(schema.auditLogs)
          .where(eq(schema.auditLogs.entityId, id))
      ).length;
    const rowsBefore = await auditCount();
    await call(patchBranch, `/api/v1/branches/${id}`, {
      method: 'PATCH',
      jar,
      params: { id },
      body: {
        name: 'Test Branch Renamed',
        city: 'Hyderabad',
        location: { lat: 25.396, lng: 68.3578 },
      },
    });
    expect(await auditCount()).toBe(rowsBefore);

    // Switching the branch back to the global radius removes its own policy.
    const inherited = await call(patchBranch, `/api/v1/branches/${id}`, {
      method: 'PATCH',
      jar,
      params: { id },
      body: { matchRadius: null },
    });
    expect(inherited.body.data.matchRadius.source).toBe('GLOBAL');

    await call(patchBranch, `/api/v1/branches/${id}`, {
      method: 'PATCH',
      jar,
      params: { id },
      body: { isActive: false },
    });
    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.entityId, id), eq(schema.auditLogs.action, 'branch.deactivate')),
      );
    expect(audit?.before).toEqual({ isActive: true });
  });

  it('rejects radius beyond the PRD 10 km cap, and non-Super-Admins', async () => {
    const jar = await signInAdmin('superadmin@jobbank.local');
    const tooFar = await call(createBranchRoute, '/api/v1/branches', {
      method: 'POST',
      jar,
      headers: { 'idempotency-key': crypto.randomUUID() },
      body: {
        code: 'TOO-FAR',
        name: 'X',
        city: 'Y',
        location: { lat: 24, lng: 67 },
        matchRadius: { preferredM: 8000, maxM: 15_000 },
      },
    });
    expect(tooFar.status).toBe(422);

    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const denied = await call(patchBranch, `/api/v1/branches/${KHI}`, {
      method: 'PATCH',
      jar: ba,
      params: { id: KHI },
      body: { name: 'Mine now' },
    });
    expect(denied.status).toBe(403);
  });
});

// ─── Staff invitations & scope ────────────────────────────────────────

describe('staff invitations', () => {
  it('Branch Admin invites staff into their branch; the invitee activates with a strong password', async () => {
    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const email = uniqueEmail('invitee');
    const invited = await call(inviteRoute, '/api/v1/users', {
      method: 'POST',
      jar: ba,
      headers: { 'idempotency-key': crypto.randomUUID() },
      body: { name: 'Nadia Invitee', email, title: null, role: 'STAFF', branchId: KHI },
    });
    expect(invited.status).toBe(201);
    expect(invited.body.data).toMatchObject({ emailSent: true, user: { status: 'INVITED' } });

    const mail = lastMailTo(email);
    expect(mail.subject).toMatch(/invited/i);
    const token = tokenFrom(mail.text);
    expect(token.length).toBeGreaterThan(30);
    const [stored] = await db
      .select()
      .from(schema.accountTokens)
      .where(eq(schema.accountTokens.userId, invited.body.data.user.id));
    expect(stored!.tokenHash).not.toContain(token);

    const preview = await call(lookupInvite, `/api/v1/auth/invitations/lookup?token=${token}`);
    expect(preview.body.data).toMatchObject({ name: 'Nadia Invitee', roles: [{ role: 'STAFF' }] });

    const weak = await call(acceptInvite, '/api/v1/auth/invitations/accept', {
      method: 'POST',
      body: { token, password: 'short' },
    });
    expect(weak.status).toBe(422);

    const jar = new Jar();
    const ok = await call(acceptInvite, '/api/v1/auth/invitations/accept', {
      method: 'POST',
      jar,
      body: { token, password: 'Strong-pass-123' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ kind: 'signed_in', homePath: '/staff' });
    expect(
      (await call(me, '/api/v1/auth/me', { jar })).body.data.branches.map(
        (b: { id: string }) => b.id,
      ),
    ).toEqual([KHI]);

    const again = await call(acceptInvite, '/api/v1/auth/invitations/accept', {
      method: 'POST',
      body: { token, password: 'Strong-pass-123' },
    });
    expect(again.status).toBe(400);
  });

  it('Branch Admins cannot invite outside their branch or above their role; duplicates are refused', async () => {
    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const invite = (body: object) =>
      call(inviteRoute, '/api/v1/users', {
        method: 'POST',
        jar: ba,
        headers: { 'idempotency-key': crypto.randomUUID() },
        body,
      });
    expect(
      (await invite({ name: 'X Y', email: uniqueEmail('x'), role: 'STAFF', branchId: LHR })).status,
    ).toBe(403);
    expect(
      (await invite({ name: 'X Y', email: uniqueEmail('x'), role: 'BRANCH_ADMIN', branchId: KHI }))
        .status,
    ).toBe(403);
    expect(
      (
        await invite({
          name: 'X Y',
          email: 'staff.khi@jobbank.local',
          role: 'STAFF',
          branchId: KHI,
        })
      ).status,
    ).toBe(409);
  });

  it('a resent invitation replaces the old link', async () => {
    const sa = await signInAdmin('superadmin@jobbank.local');
    const email = uniqueEmail('resend');
    const invited = await call(inviteRoute, '/api/v1/users', {
      method: 'POST',
      jar: sa,
      headers: { 'idempotency-key': crypto.randomUUID() },
      body: { name: 'Re Send', email, role: 'VERIFIER', branchId: LHR },
    });
    const firstToken = tokenFrom(lastMailTo(email).text);
    const id = invited.body.data.user.id;
    expect(
      (
        await call(resendInvite, `/api/v1/users/${id}/invitation`, {
          method: 'POST',
          jar: sa,
          params: { id },
        })
      ).status,
    ).toBe(200);
    const secondToken = tokenFrom(lastMailTo(email).text);
    expect(secondToken).not.toBe(firstToken);
    expect(
      (await call(lookupInvite, `/api/v1/auth/invitations/lookup?token=${firstToken}`)).status,
    ).toBe(400);
    expect(
      (await call(lookupInvite, `/api/v1/auth/invitations/lookup?token=${secondToken}`)).status,
    ).toBe(200);
  });

  it('staff lists are branch-scoped, and reading another branch is refused and audited', async () => {
    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const list = await call(listUsers, '/api/v1/users?pageSize=100', { jar: ba });
    expect(list.status).toBe(200);
    const branches = new Set(
      list.body.data.flatMap((u: { roles: { branchId: string }[] }) =>
        u.roles.map((r) => r.branchId),
      ),
    );
    expect(branches.has(LHR)).toBe(false);

    const [lhrStaff] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, 'staff.lhr@jobbank.local'));
    const denied = await call(getUser, `/api/v1/users/${lhrStaff!.id}`, {
      jar: ba,
      params: { id: lhrStaff!.id },
    });
    expect(denied.status).toBe(403);
    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.correlationId, denied.body.error.correlation_id));
    expect(audit).toMatchObject({
      action: 'access.scope_violation',
      entityType: 'user',
      entityId: lhrStaff!.id,
    });

    const sa = await signInAdmin('superadmin@jobbank.local');
    expect(
      (
        await call(getUser, `/api/v1/users/${lhrStaff!.id}`, {
          jar: sa,
          params: { id: lhrStaff!.id },
        })
      ).status,
    ).toBe(200);
  });
});

// ─── Roles, status, 2FA reset ─────────────────────────────────────────

describe('managing staff accounts', () => {
  it('Super Admin adds and removes roles; the only role cannot be removed', async () => {
    const sa = await signInAdmin('superadmin@jobbank.local');
    const { id } = await inviteAndActivate(sa, 'STAFF', KHI);

    const granted = await call(grantRoleRoute, `/api/v1/users/${id}/roles`, {
      method: 'POST',
      jar: sa,
      params: { id },
      body: { role: 'VERIFIER', branchId: LHR },
    });
    expect(granted.status).toBe(200);
    expect(granted.body.data.roles).toHaveLength(2);
    const duplicate = await call(grantRoleRoute, `/api/v1/users/${id}/roles`, {
      method: 'POST',
      jar: sa,
      params: { id },
      body: { role: 'VERIFIER', branchId: LHR },
    });
    expect(duplicate.status).toBe(409);

    const verifier = granted.body.data.roles.find((r: { role: string }) => r.role === 'VERIFIER');
    const removed = await call(revokeRoleRoute, '/x', {
      method: 'DELETE',
      jar: sa,
      params: { id, assignmentId: verifier.id },
    });
    expect(removed.body.data.roles).toHaveLength(1);
    const last = removed.body.data.roles[0];
    expect(
      (
        await call(revokeRoleRoute, '/x', {
          method: 'DELETE',
          jar: sa,
          params: { id, assignmentId: last.id },
        })
      ).status,
    ).toBe(409);
  });

  it('disabling signs the person out everywhere and blocks sign-in until re-enabled', async () => {
    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const person = await inviteAndActivate(ba, 'STAFF', KHI);
    expect((await call(me, '/api/v1/auth/me', { jar: person.jar })).status).toBe(200);

    const noReason = await call(setStatus, '/x', {
      method: 'PATCH',
      jar: ba,
      params: { id: person.id },
      body: { status: 'DISABLED', reason: '' },
    });
    expect(noReason.status).toBe(422);
    const disabled = await call(setStatus, '/x', {
      method: 'PATCH',
      jar: ba,
      params: { id: person.id },
      body: { status: 'DISABLED', reason: 'Left the organisation' },
    });
    expect(disabled.body.data.status).toBe('DISABLED');
    expect((await call(me, '/api/v1/auth/me', { jar: person.jar })).status).toBe(401);
    const blocked = await call(login, '/api/v1/auth/login', {
      method: 'POST',
      body: { email: person.email, password: DEV_PASSWORD },
    });
    expect(blocked.body.error.details).toEqual({ reason: 'ACCOUNT_DISABLED' });

    await call(setStatus, '/x', {
      method: 'PATCH',
      jar: ba,
      params: { id: person.id },
      body: { status: 'ACTIVE', reason: 'Rejoined' },
    });
    expect(
      (
        await call(login, '/api/v1/auth/login', {
          method: 'POST',
          body: { email: person.email, password: DEV_PASSWORD },
        })
      ).status,
    ).toBe(200);

    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.entityId, person.id), eq(schema.auditLogs.action, 'user.disable')),
      );
    expect(audit?.reason).toBe('Left the organisation');
  });

  it('Branch Admin cannot change admins or their own account', async () => {
    const ba = await signInAdmin('branchadmin.khi@jobbank.local');
    const [self] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, 'branchadmin.khi@jobbank.local'));
    const selfChange = await call(setStatus, '/x', {
      method: 'PATCH',
      jar: ba,
      params: { id: self!.id },
      body: { status: 'DISABLED', reason: 'Testing self' },
    });
    expect(selfChange.status).toBe(403);
  });

  it('resetting a lost authenticator signs them out and makes them enrol again', async () => {
    const sa = await signInAdmin('superadmin@jobbank.local');
    const person = await inviteAndActivate(sa, 'VERIFIER', LHR);
    await enrollTwoFactor(person.email, person.jar);
    const reset2fa = await call(reset2faRoute, '/x', {
      method: 'POST',
      jar: sa,
      params: { id: person.id },
      body: { reason: 'Lost phone' },
    });
    expect(reset2fa.body.data.twoFactorEnabled).toBe(false);
    expect((await call(me, '/api/v1/auth/me', { jar: person.jar })).status).toBe(401);
    const relogin = await call(login, '/api/v1/auth/login', {
      method: 'POST',
      body: { email: person.email, password: DEV_PASSWORD },
    });
    expect(relogin.body.data.kind).toBe('signed_in');
  });
});

// ─── Password reset & employer email codes ────────────────────────────

describe('password reset', () => {
  it('emails a single-use link, changes the password and signs out other sessions', async () => {
    const sa = await signInAdmin('superadmin@jobbank.local');
    const person = await inviteAndActivate(sa, 'STAFF', LHR);

    const before = mailOutbox.length;
    expect(
      (await call(forgot, '/x', { method: 'POST', body: { email: 'nobody@jobbank.test' } })).status,
    ).toBe(202);
    expect(mailOutbox.length).toBe(before);

    expect(
      (await call(forgot, '/x', { method: 'POST', body: { email: person.email } })).status,
    ).toBe(202);
    const token = tokenFrom(lastMailTo(person.email).text);
    const done = await call(reset, '/x', {
      method: 'POST',
      body: { token, password: 'Brand-new-pass-9' },
    });
    expect(done.status).toBe(200);
    expect((await call(me, '/api/v1/auth/me', { jar: person.jar })).status).toBe(401);
    expect(
      (
        await call(login, '/x', {
          method: 'POST',
          body: { email: person.email, password: DEV_PASSWORD },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call(login, '/x', {
          method: 'POST',
          body: { email: person.email, password: 'Brand-new-pass-9' },
        })
      ).status,
    ).toBe(200);
    expect(
      (await call(reset, '/x', { method: 'POST', body: { token, password: 'Another-pass-99' } }))
        .status,
    ).toBe(400);
  });
});

describe('employer email sign-in codes', () => {
  it('signs an employer in with an emailed code, and never sends codes to non-employers', async () => {
    const email = 'employer@jobbank.local';
    await resetTwoFactor(email);
    const req = await call(emailCodeRequest, '/x', { method: 'POST', body: { email } });
    expect(req.status).toBe(202);
    const code = lastMailTo(email).subject.match(/^(\d{6})/)?.[1];
    expect(code).toMatch(/^\d{6}$/);

    expect(
      (
        await call(emailCodeVerify, '/x', {
          method: 'POST',
          body: { email, code: code === '000000' ? '111111' : '000000' },
        })
      ).status,
    ).toBe(401);
    const jar = new Jar();
    const ok = await call(emailCodeVerify, '/x', { method: 'POST', jar, body: { email, code } });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ kind: 'signed_in', homePath: '/employer' });

    const before = mailOutbox.length;
    expect(
      (
        await call(emailCodeRequest, '/x', {
          method: 'POST',
          body: { email: 'staff.khi@jobbank.local' },
        })
      ).status,
    ).toBe(202);
    expect(mailOutbox.length).toBe(before);

    const [auditRow] = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, 'auth.email_code_requested'))
      .orderBy(desc(schema.auditLogs.id))
      .limit(1);
    expect(auditRow?.metadata).toMatchObject({ sent: false });
  });
});
