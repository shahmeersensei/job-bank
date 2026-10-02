import { getAuthState } from '@/domains/auth';
import type { Actor } from '../scope';

/**
 * Resolves the signed-in user for an API request from the session cookie.
 * Disabled/invited accounts resolve to null (→ 401), so they cannot call the API.
 */
export async function resolveActor(request: Request): Promise<Actor | null> {
  const state = await getAuthState(request.headers);
  return state.status === 'active' ? state.actor : null;
}
