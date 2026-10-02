import 'server-only';
import QRCode from 'qrcode';
import { recordAudit, type RequestContext } from '@/domains/shared/audit';
import { ForbiddenError, UnauthenticatedError } from '@/domains/shared/errors';
import type { Actor } from '@/domains/shared/scope';
import { requiresTwoFactor } from './actor';
import { getAuth } from './auth';

type SignedIn = RequestContext & { actor: Actor };

export interface EnrollmentStart {
  /** SVG markup generated server-side from the otpauth:// URI. */
  qrSvg: string;
  /** Base32 key for people who cannot scan (typed into the authenticator app). */
  manualKey: string;
  /** One-time recovery codes — shown once, the user must store them. */
  backupCodes: string[];
}

function authApiMessage(error: unknown): string | undefined {
  return error instanceof Error && error.name === 'APIError' ? error.message : undefined;
}

/** Step 1: confirm the password, create an (unverified) secret, return QR + backup codes. */
export async function startTwoFactorEnrollment(
  ctx: SignedIn,
  password: string,
  requestHeaders: Headers,
): Promise<EnrollmentStart> {
  let enabled: Awaited<ReturnType<ReturnType<typeof getAuth>['api']['enableTwoFactor']>>;
  try {
    enabled = await getAuth().api.enableTwoFactor({ body: { password }, headers: requestHeaders });
  } catch (error) {
    if (authApiMessage(error)) throw new UnauthenticatedError('Incorrect password');
    throw error;
  }
  // Only the authenticator-app (TOTP) method is configured, so a URI is always returned.
  if (!('totpURI' in enabled)) throw new Error('Two-factor plugin did not return a TOTP setup');
  const result = enabled;
  const manualKey = new URL(result.totpURI).searchParams.get('secret') ?? '';
  const qrSvg = await QRCode.toString(result.totpURI, { type: 'svg', margin: 1, width: 200 });
  await recordAudit(ctx, {
    action: 'auth.2fa_enrollment_started',
    entityType: 'user',
    entityId: ctx.actor.userId,
  });
  return { qrSvg, manualKey, backupCodes: result.backupCodes };
}

/** Step 2: the first correct code from the app turns two-factor on. */
export async function confirmTwoFactorEnrollment(
  ctx: SignedIn,
  code: string,
  requestHeaders: Headers,
): Promise<string[]> {
  try {
    const result = await getAuth().api.verifyTOTP({
      body: { code },
      headers: requestHeaders,
      returnHeaders: true,
    });
    await recordAudit(ctx, {
      action: 'auth.2fa_enabled',
      entityType: 'user',
      entityId: ctx.actor.userId,
    });
    return result.headers.getSetCookie();
  } catch (error) {
    if (authApiMessage(error))
      throw new UnauthenticatedError(
        'That code is not correct. Check the time on your phone and try again.',
      );
    throw error;
  }
}

/** Optional for most roles; Super Admin and Branch Admin must keep it on. */
export async function disableTwoFactor(
  ctx: SignedIn,
  password: string,
  requestHeaders: Headers,
): Promise<void> {
  if (requiresTwoFactor(ctx.actor.roles)) {
    throw new ForbiddenError(
      'Two-factor authentication is required for your role and cannot be turned off.',
    );
  }
  try {
    await getAuth().api.disableTwoFactor({ body: { password }, headers: requestHeaders });
  } catch (error) {
    if (authApiMessage(error)) throw new UnauthenticatedError('Incorrect password');
    throw error;
  }
  await recordAudit(ctx, {
    action: 'auth.2fa_disabled',
    entityType: 'user',
    entityId: ctx.actor.userId,
  });
}
