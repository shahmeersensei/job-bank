import { preferencesSchema } from '@jobbank/shared';
import { saveMyPreferences } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/preferences — replaces the applicant's job preferences. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: preferencesSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await saveMyPreferences({ ...ctx, actor: actor! }, body)),
});
