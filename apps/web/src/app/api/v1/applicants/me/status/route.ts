import { selfStatusSchema } from '@jobbank/shared';
import { setMyStatus } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PATCH /api/v1/applicants/me/status — pause (INACTIVE) or resume (ACTIVE) own profile. */
export const PATCH = apiHandler({
  permission: 'applicant:self',
  body: selfStatusSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await setMyStatus({ ...ctx, actor: actor! }, body.status)),
});
