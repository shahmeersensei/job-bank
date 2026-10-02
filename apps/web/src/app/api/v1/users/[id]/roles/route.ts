import { z } from 'zod';
import { grantRole, roleAssignmentSchema } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/users/{id}/roles — add a role (with branch for branch-scoped roles). */
export const POST = apiHandler({
  permission: 'user:manage',
  params: z.object({ id: z.uuid() }),
  body: roleAssignmentSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await grantRole({ ...ctx, actor: actor! }, params.id, body)),
});
