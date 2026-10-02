import {
  createMasterDataItem,
  createMasterDataSchema,
  listMasterData,
  listMasterDataQuery,
} from '@/domains/settings';
import { apiHandler, created, ok } from '@/domains/shared/http';

/**
 * GET /api/v1/master-data?type=SKILL — one reference list, for any signed-in user (forms
 * need them). `includeInactive=true` only takes effect for master-data managers.
 */
export const GET = apiHandler({
  query: listMasterDataQuery,
  handler: async ({ actor, query }) => ok(await listMasterData(actor!, query)),
});

/** POST /api/v1/master-data — Super Admin adds an item (Idempotency-Key required). */
export const POST = apiHandler({
  permission: 'master_data:manage',
  idempotent: true,
  body: createMasterDataSchema,
  handler: async ({ ctx, actor, body }) => {
    const item = await createMasterDataItem({ ...ctx, actor: actor! }, body);
    return created(item, `/api/v1/master-data/${item.id}`);
  },
});
