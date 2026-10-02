import { passwordSchema } from '@jobbank/shared';
import { z } from 'zod';
import { resetPassword } from '@/domains/auth';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/auth/password/reset — set a new password from an emailed link (signs out everywhere). */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({ token: z.string().min(20).max(200), password: passwordSchema }),
  handler: async ({ ctx, body }) => {
    await resetPassword(ctx, body.token, body.password);
    return ok({ message: 'Your password has been changed. Sign in with your new password.' });
  },
});
