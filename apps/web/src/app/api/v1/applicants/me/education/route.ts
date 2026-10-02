import { educationSchema } from '@jobbank/shared';
import { saveMyEducation } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/education — replaces the applicant's education history. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: educationSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await saveMyEducation({ ...ctx, actor: actor! }, body)),
});
