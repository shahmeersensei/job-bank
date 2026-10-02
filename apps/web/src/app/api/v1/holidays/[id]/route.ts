import { z } from 'zod';
import { updateHoliday, updateHolidaySchema } from '@/domains/settings';
import { apiHandler, ok } from '@/domains/shared/http';

/** PATCH /api/v1/holidays/{id} — rename, move or (de)activate a holiday. */
export const PATCH = apiHandler({
  permission: 'master_data:manage',
  params: z.object({ id: z.uuid() }),
  body: updateHolidaySchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await updateHoliday({ ...ctx, actor: actor! }, params.id, body)),
});
