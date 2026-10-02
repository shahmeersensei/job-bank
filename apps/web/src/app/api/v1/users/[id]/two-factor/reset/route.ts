import { z } from 'zod';
import { resetStaffTwoFactor } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/users/{id}/two-factor/reset — lost phone: remove their authenticator; reason required. */
export const POST = apiHandler({
  permission: 'user:manage',
  params: z.object({ id: z.uuid() }),
  body: z.object({ reason: z.string().trim().min(5).max(500) }),
  handler: async ({ ctx, actor, params, body }) =>
    ok(await resetStaffTwoFactor({ ...ctx, actor: actor! }, params.id, body.reason)),
});
