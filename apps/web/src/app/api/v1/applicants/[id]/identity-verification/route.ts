import { identityVerificationSchema } from '@jobbank/shared';
import { z } from 'zod';
import { verifyApplicantIdentity } from '@/domains/applicant';
import { apiHandler, created } from '@/domains/shared/http';

/** POST /api/v1/applicants/{id}/identity-verification — record a staff identity check. */
export const POST = apiHandler({
  permission: 'applicant:verify_identity',
  params: z.object({ id: z.uuid() }),
  body: identityVerificationSchema,
  handler: async ({ ctx, actor, params, body }) =>
    created(await verifyApplicantIdentity({ ...ctx, actor: actor! }, params.id, body)),
});
