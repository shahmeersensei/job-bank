import { listSettings } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/settings — every global setting with its default and description. */
export const GET = apiHandler({
  permission: 'settings:manage',
  handler: async () => ok(await listSettings()),
});
