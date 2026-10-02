import { z } from 'zod';
import { switchActiveBranch } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** PUT /api/v1/auth/scope — Super Admin picks one branch, or null for all branches. */
export const PUT = apiHandler({
  permission: 'scope:switch_branch',
  body: z.object({ branchId: z.uuid().nullable() }),
  handler: async ({ ctx, actor, body }) => {
    const cookie = await switchActiveBranch({ ...ctx, actor: actor! }, body.branchId);
    return { status: 200, data: { activeBranchId: body.branchId }, cookies: [cookie] };
  },
});
