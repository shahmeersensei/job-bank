import { certificationsSchema } from '@jobbank/shared';
import { saveMyCertifications } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/certifications — replaces the applicant's certificates and courses. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: certificationsSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await saveMyCertifications({ ...ctx, actor: actor! }, body)),
});
