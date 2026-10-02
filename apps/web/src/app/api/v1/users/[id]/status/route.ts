import { z } from 'zod';
import { setStaffStatus, statusChangeSchema } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

/** PATCH /api/v1/users/{id}/status — disable (signs out everywhere) or re-enable; reason required. */
export const PATCH = apiHandler({
  permission: 'user:manage',
  params: z.object({ id: z.uuid() }),
  body: statusChangeSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await setStaffStatus({ ...ctx, actor: actor! }, params.id, body)),
});
