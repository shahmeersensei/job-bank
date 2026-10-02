import { radiusValueSchema } from '@jobbank/shared';
import { getRadiusOverview, setRadiusPolicy } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/radius-policies/global — Super Admin sets the global radius (≤ 10 km). */
export const PUT = apiHandler({
  permission: 'settings:manage',
  body: radiusValueSchema,
  handler: async ({ ctx, actor, body }) => {
    await setRadiusPolicy({ ...ctx, actor: actor! }, { scope: 'GLOBAL' }, body);
    return ok(await getRadiusOverview(actor!));
  },
});
