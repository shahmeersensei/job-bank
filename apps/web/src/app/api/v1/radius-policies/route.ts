import { getRadiusOverview } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/radius-policies — global radius plus branch (scoped) and category overrides. */
export const GET = apiHandler({
  permission: 'settings:manage',
  handler: async ({ actor }) => ok(await getRadiusOverview(actor!)),
});
