import { sixDigitCodeSchema } from '@jobbank/shared';
import { z } from 'zod';
import { verifyEmailCode } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/email-otp/verify — employers sign in with the emailed code. */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({ email: z.email().max(254), code: sixDigitCodeSchema }),
  handler: async ({ ctx, body, request }) => {
    const { cookies, ...result } = await verifyEmailCode(
      ctx,
      body.email,
      body.code,
      request.headers,
    );
    return { status: 200, data: result, cookies };
  },
});
