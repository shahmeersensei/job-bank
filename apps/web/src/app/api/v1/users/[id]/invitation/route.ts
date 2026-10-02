import { z } from 'zod';
import { resendInvitation } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/users/{id}/invitation — send a fresh invitation link (old links stop working). */
export const POST = apiHandler({
  permission: 'user:manage',
  params: z.object({ id: z.uuid() }),
  handler: async ({ ctx, actor, params }) =>
    ok(await resendInvitation({ ...ctx, actor: actor! }, params.id)),
});
