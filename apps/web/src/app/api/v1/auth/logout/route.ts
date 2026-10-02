import { logout } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/logout — ends the session (safe to call when already signed out). */
export const POST = apiHandler({
  allowTwoFactorPending: true,
  auth: 'public',
  handler: async ({ ctx, request }) => {
    const cookies = await logout(ctx, request.headers);
    return { status: 204, cookies };
  },
});
