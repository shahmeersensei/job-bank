import { z } from 'zod';
import { requestEmailCode } from '@/domains/auth';
import { accepted, apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/email-otp/request — employers: email me a sign-in code. */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({ email: z.email().max(254) }),
  handler: async ({ ctx, body }) => {
    const timing = await requestEmailCode(ctx, body.email);
    return accepted({
      message: 'If this email belongs to an employer account, a code is on its way.',
      ...timing,
    });
  },
});
