import { skillsSchema } from '@jobbank/shared';
import { saveMySkills } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/skills — replaces the applicant's skills with level and years. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: skillsSchema,
  handler: async ({ ctx, actor, body }) => ok(await saveMySkills({ ...ctx, actor: actor! }, body)),
});
