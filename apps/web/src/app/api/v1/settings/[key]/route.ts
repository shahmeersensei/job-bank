import { z } from 'zod';
import { updateGlobalSetting } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/settings/{key} — Super Admin sets a global value (validated per key). */
export const PUT = apiHandler({
  permission: 'settings:manage',
  params: z.object({ key: z.string().max(80) }),
  body: z.object({ value: z.unknown() }),
  handler: async ({ ctx, actor, params, body }) =>
    ok(await updateGlobalSetting({ ...ctx, actor: actor! }, params.key, body.value)),
});
