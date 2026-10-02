import { transferApplicantSchema } from '@jobbank/shared';
import { z } from 'zod';
import { transferApplicant } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** POST /api/v1/applicants/{id}/transfer — Branch Admin / Super Admin move to another branch. */
export const POST = apiHandler({
  permission: 'applicant:transfer',
  params: z.object({ id: z.uuid() }),
  body: transferApplicantSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await transferApplicant({ ...ctx, actor: actor! }, params.id, body)),
});
