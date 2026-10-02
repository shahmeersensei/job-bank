import { z } from 'zod';
import { removeMyDocument } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** DELETE /api/v1/applicants/me/documents/{id} — remove an optional document (kept for audit). */
export const DELETE = apiHandler({
  permission: 'applicant:self',
  params: z.object({ id: z.uuid() }),
  handler: async ({ ctx, actor, params }) =>
    ok(await removeMyDocument({ ...ctx, actor: actor! }, params.id)),
});
