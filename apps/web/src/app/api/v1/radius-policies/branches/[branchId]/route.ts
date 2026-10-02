import { radiusValueSchema } from '@jobbank/shared';
import { z } from 'zod';
import { clearRadiusPolicy, getRadiusOverview, setRadiusPolicy } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

const params = z.object({ branchId: z.uuid() });

/**
 * PUT /api/v1/radius-policies/branches/{branchId} — the branch's own radius, within the
 * global max. Super Admin, or the Branch Admin of that branch.
 */
export const PUT = apiHandler({
  permission: 'settings:manage',
  params,
  body: radiusValueSchema,
  handler: async ({ ctx, actor, params: p, body }) => {
    await setRadiusPolicy(
      { ...ctx, actor: actor! },
      { scope: 'BRANCH', branchId: p.branchId },
      body,
    );
    return ok(await getRadiusOverview(actor!));
  },
});

/** DELETE /api/v1/radius-policies/branches/{branchId} — go back to the global radius. */
export const DELETE = apiHandler({
  permission: 'settings:manage',
  params,
  handler: async ({ ctx, actor, params: p }) => {
    await clearRadiusPolicy({ ...ctx, actor: actor! }, { scope: 'BRANCH', branchId: p.branchId });
    return ok(await getRadiusOverview(actor!));
  },
});
