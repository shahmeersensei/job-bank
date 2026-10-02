import { z } from 'zod';
import { requestPasswordReset } from '@/domains/auth';
import { accepted, apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/password/forgot — emails a reset link (same answer whether or not the email exists). */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({ email: z.email().max(254) }),
  handler: async ({ ctx, body }) => {
    await requestPasswordReset(ctx, body.email);
    return accepted({ message: 'If an account uses this email, a reset link is on its way.' });
  },
});
