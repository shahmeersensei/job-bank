import { passwordSchema } from '@jobbank/shared';
import { z } from 'zod';
import { acceptInvitation } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/invitations/accept — set a password, activate the account, sign in. */
export const POST = apiHandler({
  auth: 'public',
  allowTwoFactorPending: true,
  body: z.object({ token: z.string().min(20).max(200), password: passwordSchema }),
  handler: async ({ ctx, body, request }) => {
    const { cookies, ...result } = await acceptInvitation(
      ctx,
      body.token,
      body.password,
      request.headers,
    );
    return { status: 200, data: result, cookies };
  },
});
