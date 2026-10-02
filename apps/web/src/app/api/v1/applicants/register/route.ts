import { registerApplicantSchema } from '@jobbank/shared';
import { registerApplicant } from '@/domains/applicant';
import { apiHandler, created } from '@/domains/shared/http';

/**
 * POST /api/v1/applicants/register — first wizard step for a phone-signed-in applicant
 * (Idempotency-Key required). 409 CNIC_TAKEN names the branch to contact for recovery.
 */
export const POST = apiHandler({
  permission: 'applicant:self',
  idempotent: true,
  body: registerApplicantSchema,
  handler: async ({ ctx, actor, body }) =>
    created(await registerApplicant({ ...ctx, actor: actor! }, body), '/api/v1/applicants/me'),
});
