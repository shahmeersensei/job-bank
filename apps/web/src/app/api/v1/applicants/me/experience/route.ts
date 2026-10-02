import { experienceSchema } from '@jobbank/shared';
import { saveMyExperience } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/experience — replaces the applicant's work experience (or "no experience"). */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: experienceSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await saveMyExperience({ ...ctx, actor: actor! }, body)),
});
