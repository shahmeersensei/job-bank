import 'server-only';
import type { Role } from '@jobbank/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuthState, type AuthState } from './actor';

type Active = Extract<AuthState, { status: 'active' }>;

/** Auth state for the current server render (deduplicated per request). */
export const getServerAuthState = cache(async (): Promise<AuthState> =>
  getAuthState(await headers()),
);

/**
 * Any signed-in, active user. Super Admins / Branch Admins without two-factor are sent to
 * set it up first (unless `allowTwoFactorPending`, used by the setup page itself).
 */
export async function requireSignedIn(
  options: { allowTwoFactorPending?: boolean } = {},
): Promise<Active> {
  const state = await getServerAuthState();
  if (state.status === 'anonymous') redirect('/login');
  if (state.status === 'blocked') redirect('/account-disabled');
  if (state.actor.twoFactorPending && !options.allowTwoFactorPending)
    redirect('/account/security?setup=required');
  return state;
}

/**
 * Server-component guard for role dashboards. Anonymous → /login, disabled/invited →
 * /account-disabled, 2FA required but missing → setup, wrong role → /forbidden.
 */
export async function requireRole(...roles: Role[]): Promise<Active> {
  const state = await requireSignedIn();
  if (!state.actor.roles.some((role) => roles.includes(role))) redirect('/forbidden');
  return state;
}
