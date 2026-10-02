import 'server-only';
import { homePathFor, type Permission, type Role } from '@jobbank/shared';
import { schema } from '@jobbank/db';
import { APIError } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { recordAudit, type RequestContext } from '@/domains/shared/audit';
import {
  DomainError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@/domains/shared/errors';
import { maskEmail, maskPhone } from '@/domains/shared/masking';
import { enforceRateLimit } from '@/domains/shared/rate-limit';
import type { Actor } from '@/domains/shared/scope';
import { db } from '@/lib/db';
import { normalizePkMobile } from '@/lib/format/phone';
import { ACTIVE_BRANCH_COOKIE, loadActor, type SessionUser } from './actor';
import { getAuth, isPlaceholderEmail, SESSION_TTL_SECONDS } from './auth';
import { issueOtp, OTP_TTL_SECONDS } from './otp';

export const RESEND_AFTER_SECONDS = 60;

export class AccountBlockedError extends DomainError {
  constructor(reason: 'DISABLED' | 'INVITED') {
    super(
      'FORBIDDEN',
      403,
      reason === 'INVITED'
        ? 'Finish setting up your account using the invitation link we emailed you.'
        : 'This account has been disabled. Please contact your Job Bank branch.',
      { reason: reason === 'INVITED' ? 'ACCOUNT_INVITED' : 'ACCOUNT_DISABLED' },
    );
  }
}

export interface SignInResult {
  kind: 'signed_in';
  user: SessionUser;
  roles: Role[];
  homePath: string;
  /** Set-Cookie values to forward to the browser. */
  cookies: string[];
}

/** Password was right; an authenticator (or backup) code is needed to finish. */
export interface TwoFactorChallenge {
  kind: 'two_factor_required';
  methods: string[];
  cookies: string[];
}

/**
 * Better Auth throws APIError from more than one bundled copy of the class (better-auth vs
 * @better-auth/core), so `instanceof` alone is unreliable — also match on the error name.
 */
function isAuthApiError(error: unknown): error is Error & { body?: { code?: string } | undefined } {
  return error instanceof APIError || (error instanceof Error && error.name === 'APIError');
}

function apiErrorCode(error: unknown): string | undefined {
  return isAuthApiError(error) ? error.body?.code : undefined;
}

type UserRow = typeof schema.users.$inferSelect;

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: isPlaceholderEmail(row.email) ? null : row.email,
    phoneNumber: row.phoneNumber,
    title: row.title,
    twoFactorEnabled: row.twoFactorEnabled,
  };
}

async function rateLimitByIp(
  ctx: RequestContext,
  name: string,
  limit: number,
  windowSeconds: number,
) {
  if (ctx.ip) await enforceRateLimit(name, ctx.ip, { limit, windowSeconds });
}

function requirePkMobile(raw: string): string {
  const phone = normalizePkMobile(raw);
  if (!phone) {
    throw new ValidationError([
      { path: 'phone', message: 'Enter a valid Pakistani mobile number' },
    ]);
  }
  return phone;
}

async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(sql`lower(${schema.users.email})`, email.trim().toLowerCase()));
  return user;
}

/** Completes a successful sign-in: audit + response shape. */
async function signedIn(
  ctx: RequestContext,
  userId: string,
  method: string,
  cookies: string[],
): Promise<SignInResult> {
  const actor = await loadActor(userId);
  await recordAudit(
    { ...ctx, actor },
    { action: 'auth.login', entityType: 'user', entityId: userId, metadata: { method } },
  );
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  return {
    kind: 'signed_in',
    user: toSessionUser(row!),
    roles: [...actor.roles],
    homePath: homePathFor(actor.roles),
    cookies,
  };
}

// ─── Applicants: phone + SMS code ──────────────────────────────────────

export async function requestOtp(ctx: RequestContext, rawPhone: string) {
  const phone = requirePkMobile(rawPhone);
  await enforceRateLimit(
    'otp-resend',
    phone,
    { limit: 1, windowSeconds: RESEND_AFTER_SECONDS },
    'Please wait a minute before requesting another code.',
  );
  await enforceRateLimit(
    'otp-phone',
    phone,
    { limit: 5, windowSeconds: 3600 },
    'Too many codes requested for this number. Try again in an hour.',
  );
  await rateLimitByIp(ctx, 'otp-ip', 20, 3600);

  await issueOtp(phone, ctx.ip);
  await recordAudit(ctx, {
    action: 'auth.otp_requested',
    entityType: 'phone',
    metadata: { phoneMasked: maskPhone(phone) },
  });
  return { expiresInSeconds: OTP_TTL_SECONDS, resendAfterSeconds: RESEND_AFTER_SECONDS };
}

export async function verifyOtp(
  ctx: RequestContext,
  rawPhone: string,
  code: string,
  requestHeaders: Headers,
): Promise<SignInResult> {
  const phone = requirePkMobile(rawPhone);
  await rateLimitByIp(ctx, 'otp-verify-ip', 30, 900);

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.phoneNumber, phone));

  let result;
  try {
    result = await getAuth().api.verifyPhoneNumber({
      body: { phoneNumber: phone, code },
      headers: requestHeaders,
      returnHeaders: true,
    });
  } catch (error) {
    if (!isAuthApiError(error)) throw error;
    const reason = apiErrorCode(error);
    await recordAudit(ctx, {
      action: reason === 'ACCOUNT_DISABLED' ? 'auth.login_blocked' : 'auth.login_failed',
      entityType: 'user',
      entityId: existing?.id ?? null,
      metadata: { method: 'otp', reason: reason ?? 'INVALID_OTP', phoneMasked: maskPhone(phone) },
    });
    if (reason === 'ACCOUNT_DISABLED') throw new AccountBlockedError('DISABLED');
    if (reason === 'OTP_LOCKED') {
      throw new UnauthenticatedError('Too many incorrect attempts. Request a new code.');
    }
    throw new UnauthenticatedError('The code is incorrect or has expired.');
  }

  const userId = result.response.user.id;
  if (!existing) {
    await recordAudit(
      { ...ctx, actor: await loadActor(userId) },
      { action: 'auth.register_applicant', entityType: 'user', entityId: userId },
    );
  }
  return signedIn(ctx, userId, 'otp', result.headers.getSetCookie());
}

// ─── Staff & employers: email + password (+ authenticator app) ─────────

export async function loginWithPassword(
  ctx: RequestContext,
  rawEmail: string,
  password: string,
  requestHeaders: Headers,
): Promise<SignInResult | TwoFactorChallenge> {
  const email = rawEmail.trim().toLowerCase();
  await enforceRateLimit(
    'login-email',
    email,
    { limit: 5, windowSeconds: 900 },
    'Too many sign-in attempts. Try again in 15 minutes.',
  );
  await rateLimitByIp(ctx, 'login-ip', 30, 900);

  const user = await findUserByEmail(email);
  const failed = async (reason: string) => {
    await recordAudit(ctx, {
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user?.id ?? null,
      metadata: { method: 'password', reason, emailMasked: maskEmail(email) },
    });
    return new UnauthenticatedError('Incorrect email or password');
  };

  // Blocked accounts are only revealed to someone who knows the password.
  if (user && user.status !== 'ACTIVE') {
    const [account] = await db
      .select({ password: schema.accounts.password })
      .from(schema.accounts)
      .where(
        and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'credential')),
      );
    if (account?.password && (await verifyPassword({ hash: account.password, password }))) {
      await recordAudit(ctx, {
        action: 'auth.login_blocked',
        entityType: 'user',
        entityId: user.id,
        metadata: { method: 'password', reason: user.status },
      });
      throw new AccountBlockedError(user.status);
    }
    throw await failed('BAD_CREDENTIALS');
  }

  let result;
  try {
    result = await getAuth().api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: requestHeaders,
      returnHeaders: true,
    });
  } catch (error) {
    if (isAuthApiError(error)) throw await failed(apiErrorCode(error) ?? 'BAD_CREDENTIALS');
    throw error;
  }

  const response = result.response as
    { twoFactorRedirect: true; twoFactorMethods?: string[] } | { user: { id: string } };
  if ('twoFactorRedirect' in response) {
    await recordAudit(ctx, {
      action: 'auth.login_2fa_challenge',
      entityType: 'user',
      entityId: user?.id ?? null,
      metadata: { method: 'password' },
    });
    return {
      kind: 'two_factor_required',
      methods: response.twoFactorMethods ?? ['totp'],
      cookies: result.headers.getSetCookie(),
    };
  }
  return signedIn(ctx, response.user.id, 'password', result.headers.getSetCookie());
}

/** Second step after a password: authenticator-app code, or a one-time backup code. */
export async function verifySecondFactor(
  ctx: RequestContext,
  input: { code?: string; backupCode?: string; trustDevice?: boolean },
  requestHeaders: Headers,
): Promise<SignInResult> {
  await rateLimitByIp(ctx, 'two-factor-ip', 30, 900);
  let result;
  try {
    result = input.backupCode
      ? await getAuth().api.verifyBackupCode({
          body: { code: input.backupCode, trustDevice: input.trustDevice },
          headers: requestHeaders,
          returnHeaders: true,
        })
      : await getAuth().api.verifyTOTP({
          body: { code: input.code ?? '', trustDevice: input.trustDevice },
          headers: requestHeaders,
          returnHeaders: true,
        });
  } catch (error) {
    if (!isAuthApiError(error)) throw error;
    await recordAudit(ctx, {
      action: 'auth.login_failed',
      entityType: 'user',
      metadata: {
        method: input.backupCode ? 'backup_code' : 'totp',
        reason: apiErrorCode(error) ?? 'INVALID',
      },
    });
    if (apiErrorCode(error) === 'INVALID_TWO_FACTOR_COOKIE') {
      throw new UnauthenticatedError('Your sign-in expired. Enter your password again.');
    }
    throw new UnauthenticatedError('That code is not correct.');
  }
  const userId = (result.response as { user: { id: string } }).user.id;
  return signedIn(
    ctx,
    userId,
    input.backupCode ? 'password+backup_code' : 'password+totp',
    result.headers.getSetCookie(),
  );
}

// ─── Employers: code emailed to them ───────────────────────────────────

/** Only active employers without an authenticator app may use emailed codes. */
async function emailCodeEligible(email: string): Promise<UserRow | null> {
  const user = await findUserByEmail(email);
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    user.twoFactorEnabled ||
    isPlaceholderEmail(user.email)
  ) {
    return null;
  }
  const [role] = await db
    .select({ role: schema.userRoles.roleCode })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, user.id), eq(schema.userRoles.roleCode, 'EMPLOYER')));
  return role ? user : null;
}

/** Always answers the same way, so it cannot be used to discover registered emails. */
export async function requestEmailCode(ctx: RequestContext, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  await enforceRateLimit(
    'email-code-resend',
    email,
    { limit: 1, windowSeconds: RESEND_AFTER_SECONDS },
    'Please wait a minute before requesting another code.',
  );
  await enforceRateLimit('email-code', email, { limit: 5, windowSeconds: 3600 });
  await rateLimitByIp(ctx, 'email-code-ip', 20, 3600);

  const user = await emailCodeEligible(email);
  if (user) {
    await getAuth().api.sendVerificationOTP({ body: { email: user.email, type: 'sign-in' } });
  }
  await recordAudit(ctx, {
    action: 'auth.email_code_requested',
    entityType: 'user',
    entityId: user?.id ?? null,
    metadata: { emailMasked: maskEmail(email), sent: Boolean(user) },
  });
  return { expiresInSeconds: 300, resendAfterSeconds: RESEND_AFTER_SECONDS };
}

export async function verifyEmailCode(
  ctx: RequestContext,
  rawEmail: string,
  code: string,
  requestHeaders: Headers,
): Promise<SignInResult> {
  const email = rawEmail.trim().toLowerCase();
  await rateLimitByIp(ctx, 'email-code-verify-ip', 30, 900);
  const invalid = new UnauthenticatedError('The code is incorrect or has expired.');

  const user = await emailCodeEligible(email);
  if (!user) throw invalid;

  let result;
  try {
    result = await getAuth().api.signInEmailOTP({
      body: { email: user.email, otp: code },
      headers: requestHeaders,
      returnHeaders: true,
    });
  } catch (error) {
    if (!isAuthApiError(error)) throw error;
    await recordAudit(ctx, {
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      metadata: { method: 'email_code', reason: apiErrorCode(error) ?? 'INVALID_OTP' },
    });
    if (apiErrorCode(error) === 'TOO_MANY_ATTEMPTS') {
      throw new UnauthenticatedError('Too many incorrect attempts. Request a new code.');
    }
    throw invalid;
  }
  return signedIn(ctx, user.id, 'email_code', result.headers.getSetCookie());
}

// ─── Session ───────────────────────────────────────────────────────────

export function cookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export async function logout(ctx: RequestContext, requestHeaders: Headers): Promise<string[]> {
  let cookies: string[] = [];
  try {
    const result = await getAuth().api.signOut({ headers: requestHeaders, returnHeaders: true });
    cookies = result.headers.getSetCookie();
  } catch {
    // No valid session — still clear our cookies below.
  }
  if (ctx.actor) {
    await recordAudit(ctx, {
      action: 'auth.logout',
      entityType: 'user',
      entityId: ctx.actor.userId,
    });
  }
  return [...cookies, cookie(ACTIVE_BRANCH_COOKIE, '', 0)];
}

/** Ends every session a user has (password reset, disable, 2FA reset). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Super Admin branch switcher. null = oversight of all branches. Audited (PRD M15). */
export async function switchActiveBranch(
  ctx: RequestContext & { actor: Actor },
  branchId: string | null,
): Promise<string> {
  if (branchId) {
    const [branch] = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.id, branchId), eq(schema.branches.isActive, true)));
    if (!branch) throw new NotFoundError('Branch', branchId);
  }
  await recordAudit(ctx, {
    action: 'auth.scope_switch',
    entityType: 'branch',
    entityId: branchId,
    branchId,
    before: { activeBranchId: ctx.actor.activeBranchId },
    after: { activeBranchId: branchId },
  });
  return branchId
    ? cookie(ACTIVE_BRANCH_COOKIE, branchId, SESSION_TTL_SECONDS)
    : cookie(ACTIVE_BRANCH_COOKIE, '', 0);
}

export interface MeView {
  user: SessionUser;
  roles: Role[];
  permissions: Permission[];
  branches: { id: string; code: string; name: string }[];
  activeBranchId: string | null;
  homePath: string;
  twoFactorPending: boolean;
}

export async function describeMe(user: SessionUser, actor: Actor): Promise<MeView> {
  const branches = actor.branchIds.length
    ? await db
        .select({ id: schema.branches.id, code: schema.branches.code, name: schema.branches.name })
        .from(schema.branches)
        .where(inArray(schema.branches.id, [...actor.branchIds]))
        .orderBy(schema.branches.name)
    : [];
  return {
    user,
    roles: [...actor.roles],
    permissions: [...actor.permissions].sort(),
    branches,
    activeBranchId: actor.activeBranchId,
    homePath: homePathFor(actor.roles),
    twoFactorPending: actor.twoFactorPending,
  };
}
