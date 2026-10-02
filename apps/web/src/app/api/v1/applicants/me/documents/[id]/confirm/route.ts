import { z } from 'zod';
import { confirmMyDocument } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/applicants/me/documents/{id}/confirm — step 2: verify the stored file. */
export const POST = apiHandler({
  permission: 'applicant:self',
  params: z.object({ id: z.uuid() }),
  handler: async ({ ctx, actor, params }) =>
    ok(await confirmMyDocument({ ...ctx, actor: actor! }, params.id)),
});
