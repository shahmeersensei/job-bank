import { staffStatusSchema } from '@jobbank/shared';
import { z } from 'zod';
import { staffSetApplicantStatus } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PATCH /api/v1/applicants/{id}/status — staff deactivate or reactivate, with a reason. */
export const PATCH = apiHandler({
  permission: 'applicant:manage',
  params: z.object({ id: z.uuid() }),
  body: staffStatusSchema,
  handler: async ({ ctx, actor, params, body }) =>
    ok(await staffSetApplicantStatus({ ...ctx, actor: actor! }, params.id, body)),
});
