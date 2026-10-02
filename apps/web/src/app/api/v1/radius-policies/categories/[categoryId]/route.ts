import { radiusValueSchema } from '@jobbank/shared';
import { z } from 'zod';
import { clearRadiusPolicy, getRadiusOverview, setRadiusPolicy } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

const params = z.object({ categoryId: z.uuid() });

/** PUT /api/v1/radius-policies/categories/{categoryId} — Super Admin sets a job category's radius. */
export const PUT = apiHandler({
  permission: 'settings:manage',
  params,
  body: radiusValueSchema,
  handler: async ({ ctx, actor, params: p, body }) => {
    await setRadiusPolicy(
      { ...ctx, actor: actor! },
      { scope: 'CATEGORY', categoryId: p.categoryId },
      body,
    );
    return ok(await getRadiusOverview(actor!));
  },
});

/** DELETE /api/v1/radius-policies/categories/{categoryId} — remove the category override. */
export const DELETE = apiHandler({
  permission: 'settings:manage',
  params,
  handler: async ({ ctx, actor, params: p }) => {
    await clearRadiusPolicy(
      { ...ctx, actor: actor! },
      { scope: 'CATEGORY', categoryId: p.categoryId },
    );
    return ok(await getRadiusOverview(actor!));
  },
});
