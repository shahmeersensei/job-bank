import { z } from 'zod';
import { updateMasterDataItem, updateMasterDataSchema } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** PATCH /api/v1/master-data/{id} — edit or (de)activate an item. Type and code are permanent. */
export const PATCH = apiHandler({
  permission: 'master_data:manage',
  params: z.object({ id: z.uuid() }),
  body: updateMasterDataSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await updateMasterDataItem({ ...ctx, actor: actor! }, params.id, body)),
});
