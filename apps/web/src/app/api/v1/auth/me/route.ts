import { describeMe, getAuthState } from '@/domains/auth';
import { apiHandler, ok } from '@/domains/shared/http';
import { UnauthenticatedError } from '@/domains/shared/errors';

/** GET /api/v1/auth/me — who am I: roles, permissions, branches, home page. */
export const GET = apiHandler({
  allowTwoFactorPending: true,
  handler: async ({ request }) => {
    const state = await getAuthState(request.headers);
    if (state.status !== 'active') throw new UnauthenticatedError();
    return ok(await describeMe(state.user, state.actor));
  },
});
