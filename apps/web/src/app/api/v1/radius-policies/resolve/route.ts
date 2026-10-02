import { previewRadius, previewRadiusQuery } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/radius-policies/resolve?branchId=&categoryId= — which radius would apply. */
export const GET = apiHandler({
  permission: 'settings:manage',
  query: previewRadiusQuery,
  handler: async ({ actor, query }) => ok(await previewRadius(actor!, query)),
});
