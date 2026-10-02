import { sixDigitCodeSchema } from '@jobbank/shared';
import { z } from 'zod';
import { verifySecondFactor } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/auth/2fa/verify — finish a password sign-in with an authenticator or backup code. */
export const POST = apiHandler({
  auth: 'public',
  allowTwoFactorPending: true,
  body: z
    .object({
      code: sixDigitCodeSchema.optional(),
      backupCode: z.string().trim().min(6).max(32).optional(),
      trustDevice: z.boolean().optional(),
    })
    .refine(
      (b) => Boolean(b.code) !== Boolean(b.backupCode),
      'Send either an authenticator code or a backup code',
    ),
  handler: async ({ ctx, body, request }) => {
    const { cookies, ...result } = await verifySecondFactor(ctx, body, request.headers);
    return { status: 200, data: result, cookies };
  },
});
