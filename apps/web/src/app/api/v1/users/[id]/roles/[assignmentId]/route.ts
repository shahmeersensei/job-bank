import { z } from 'zod';
import { revokeRole } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

/** DELETE /api/v1/users/{id}/roles/{assignmentId} — remove one role assignment. */
export const DELETE = apiHandler({
  permission: 'user:manage',
  params: z.object({ id: z.uuid(), assignmentId: z.uuid() }),
  handler: async ({ ctx, actor, params }) =>
    ok(await revokeRole({ ...ctx, actor: actor! }, params.id, params.assignmentId)),
});
