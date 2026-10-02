import { z } from 'zod';
import { verifyOtp } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/otp/verify — sign in (or register) an applicant with the SMS code. */
export const POST = apiHandler({
  auth: 'public',
  body: z.object({
    phone: z.string().min(10).max(20),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  }),
  handler: async ({ ctx, body, request }) => {
    const { cookies, ...result } = await verifyOtp(ctx, body.phone, body.code, request.headers);
    return { status: 200, data: result, cookies };
  },
});
