import { z } from 'zod';
import { disableTwoFactor } from '@/domains/auth';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/account/2fa/disable — not allowed for Super Admin / Branch Admin. */
export const POST = apiHandler({
  body: z.object({ password: z.string().min(1).max(128) }),
  handler: async ({ ctx, actor, body, request }) => {
    await disableTwoFactor({ ...ctx, actor: actor! }, body.password, request.headers);
    return ok({ twoFactorEnabled: false });
  },
});
