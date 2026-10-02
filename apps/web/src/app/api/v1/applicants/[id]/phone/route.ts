import { changePhoneSchema } from '@jobbank/shared';
import { z } from 'zod';
import { changeApplicantPhone } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/{id}/phone — account recovery: move the profile to a new number. */
export const PUT = apiHandler({
  permission: 'applicant:manage',
  params: z.object({ id: z.uuid() }),
  body: changePhoneSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await changeApplicantPhone({ ...ctx, actor: actor! }, params.id, body)),
});
