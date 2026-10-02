import { languagesSchema } from '@jobbank/shared';
import { saveMyLanguages } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/languages — replaces the applicant's languages spoken. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: languagesSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await saveMyLanguages({ ...ctx, actor: actor! }, body)),
});
