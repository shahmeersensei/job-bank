import { DEV_PASSWORD } from '@jobbank/db/seed/dev-data';
import * as OTPAuth from 'otpauth';
import postgres from 'postgres';
import { afterAll, expect } from 'vitest';
import { devOutbox } from '@/lib/sms/sms';

/**
 * Integration-test HTTP helpers: call App Router route handlers directly with a cookie jar,
 * and sign in like a browser would — including the two-factor step for admin roles.
 */

export const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

type Route = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/** Minimal cookie jar: keeps name=value pairs from Set-Cookie, drops cleared ones. */
export class Jar {
  private cookies = new Map<string, string>();

  absorb(response: Response) {
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attributes] = raw.split(';');
      const [name, ...value] = pair!.split('=');
      const cleared = attributes.some((a) => /max-age=0/i.test(a.trim())) || value.join('=') === '';
      if (cleared) this.cookies.delete(name!.trim());
      else this.cookies.set(name!.trim(), value.join('='));
    }
    return response;
  }

  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  jar?: Jar;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/** Response bodies are asserted field by field in tests, so they are left untyped. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponseBody = any;

export async function call(
  route: Route,
  path: string,
  options: CallOptions = {},
): Promise<{ status: number; body: ResponseBody }> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const cookie = options.jar?.header();
  if (cookie) headers.cookie = cookie;
  const response = await route(
    new Request(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    { params: Promise.resolve(options.params ?? {}) },
  );
  options.jar?.absorb(response);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** The test database's owner connection (for arranging state the API does not expose). */
export const owner = postgres(process.env.TEST_DATABASE_MIGRATOR_URL!, {
  max: 1,
  onnotice: () => {},
});
afterAll(() => owner.end());

/** TOTP secrets of accounts enrolled during this test file (email → base32 key). */
const totpSecrets = new Map<string, string>();

export function totpCode(email: string): string {
  const secret = totpSecrets.get(email);
  if (!secret) throw new Error(`no authenticator enrolled for ${email} in this test file`);
  return new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
  }).generate();
}

export function rememberTotp(email: string, base32: string) {
  totpSecrets.set(email, base32);
}

/** Removes any authenticator left over from earlier runs (the test DB persists). */
export async function resetTwoFactor(email: string) {
  await owner`DELETE FROM two_factors WHERE user_id = (SELECT id FROM users WHERE email = ${email})`;
  await owner`UPDATE users SET two_factor_enabled = false WHERE email = ${email}`;
  totpSecrets.delete(email);
}

// Route modules are imported lazily so this helper does not pull the whole app into every test.
const routes = {
  login: () => import('@/app/api/v1/auth/login/route').then((m) => m.POST),
  verify2fa: () => import('@/app/api/v1/auth/2fa/verify/route').then((m) => m.POST),
  enroll: () => import('@/app/api/v1/account/2fa/enroll/route').then((m) => m.POST),
  confirm: () => import('@/app/api/v1/account/2fa/confirm/route').then((m) => m.POST),
  otpRequest: () => import('@/app/api/v1/auth/otp/request/route').then((m) => m.POST),
  otpVerify: () => import('@/app/api/v1/auth/otp/verify/route').then((m) => m.POST),
};

/** Signs in with email + password; completes the authenticator step when the account has one. */
export async function signIn(email: string, password = DEV_PASSWORD): Promise<Jar> {
  const jar = new Jar();
  const res = await call(await routes.login(), '/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    jar,
  });
  expect(res.status, `login ${email}: ${JSON.stringify(res.body)}`).toBe(200);
  if (res.body.data.kind === 'two_factor_required') {
    const second = await call(await routes.verify2fa(), '/api/v1/auth/2fa/verify', {
      method: 'POST',
      body: { code: totpCode(email) },
      jar,
    });
    expect(second.status, `2fa ${email}: ${JSON.stringify(second.body)}`).toBe(200);
  }
  return jar;
}

/** Enrols an authenticator for an already signed-in session; returns the backup codes. */
export async function enrollTwoFactor(
  email: string,
  jar: Jar,
  password = DEV_PASSWORD,
): Promise<string[]> {
  const start = await call(await routes.enroll(), '/api/v1/account/2fa/enroll', {
    method: 'POST',
    body: { password },
    jar,
  });
  expect(start.status, JSON.stringify(start.body)).toBe(200);
  rememberTotp(email, start.body.data.manualKey);
  const done = await call(await routes.confirm(), '/api/v1/account/2fa/confirm', {
    method: 'POST',
    body: { code: totpCode(email) },
    jar,
  });
  expect(done.status, JSON.stringify(done.body)).toBe(200);
  return start.body.data.backupCodes;
}

/** Fresh admin session with two-factor enrolled (Super Admin / Branch Admin require it). */
export async function signInAdmin(email: string): Promise<Jar> {
  if (!totpSecrets.has(email)) {
    await resetTwoFactor(email);
    const jar = await signIn(email);
    await enrollTwoFactor(email, jar);
    return jar;
  }
  return signIn(email);
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}.${crypto.randomUUID().slice(0, 8)}@jobbank.test`;

/** A random, valid Pakistani mobile number (E.164) — the test database persists. */
export const randomPhone = () =>
  `+92345${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

/** Signs in (or signs up) an applicant by phone, reading the code from the dev SMS outbox. */
export async function signInApplicant(phone: string): Promise<Jar> {
  const jar = new Jar();
  const requested = await call(await routes.otpRequest(), '/api/v1/auth/otp/request', {
    method: 'POST',
    body: { phone },
  });
  expect(requested.status, JSON.stringify(requested.body)).toBe(202);
  const message = [...devOutbox].reverse().find((m) => m.to === phone);
  const code = message?.message.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`no SMS captured for ${phone}`);
  const verified = await call(await routes.otpVerify(), '/api/v1/auth/otp/verify', {
    method: 'POST',
    body: { phone, code },
    jar,
  });
  expect(verified.status, JSON.stringify(verified.body)).toBe(200);
  return jar;
}
