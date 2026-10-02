import { updatePersonalSchema } from '@jobbank/shared';
import { getMyProfile, updateMyPersonal } from '@/domains/applicant';
import { NotFoundError } from '@/domains/shared/errors';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/applicants/me — own profile with completeness; 404 before registering. */
export const GET = apiHandler({
  permission: 'applicant:self',
  handler: async ({ actor }) => {
    const profile = await getMyProfile(actor!);
    if (!profile) throw new NotFoundError('Applicant profile');
    return ok(profile);
  },
});

/** PATCH /api/v1/applicants/me — personal details (identity fields lock once verified). */
export const PATCH = apiHandler({
  permission: 'applicant:self',
  body: updatePersonalSchema,
  handler: async ({ ctx, actor, body }) =>
    ok(await updateMyPersonal({ ...ctx, actor: actor! }, body)),
});
