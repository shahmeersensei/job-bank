import { z } from 'zod';
import { requestOtp } from '@/domains/auth';
import { accepted, apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/otp/request — text a 6-digit sign-in code to an applicant's mobile. */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({ phone: z.string().min(10).max(20) }),
  handler: async ({ ctx, body }) => {
    const timing = await requestOtp(ctx, body.phone);
    return accepted({ message: 'We sent a 6-digit code to your phone.', ...timing });
  },
});
