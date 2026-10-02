import { z } from 'zod';
import { startTwoFactorEnrollment } from '@/domains/auth';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/account/2fa/enroll — confirm password, get QR code + backup codes. */
export const POST = apiHandler({
  allowTwoFactorPending: true,
  body: z.object({ password: z.string().min(1).max(128) }),
  handler: async ({ ctx, actor, body, request }) =>
    ok(await startTwoFactorEnrollment({ ...ctx, actor: actor! }, body.password, request.headers)),
});
