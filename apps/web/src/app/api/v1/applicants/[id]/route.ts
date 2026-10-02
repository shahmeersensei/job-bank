import { staffEditApplicantSchema } from '@jobbank/shared';
import { z } from 'zod';
import { getApplicantForStaff, staffUpdateApplicant } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

const params = z.object({ id: z.uuid() });

/** GET /api/v1/applicants/{id} — full profile for staff in the applicant's branch. */
export const GET = apiHandler({
  permission: 'applicant:read',
  params,
  handler: async ({ actor, params: p }) => ok(await getApplicantForStaff(actor!, p.id)),
});

/** PATCH /api/v1/applicants/{id} — staff correct personal details, with a reason. */
export const PATCH = apiHandler({
  permission: 'applicant:manage',
  params,
  body: staffEditApplicantSchema,
  handler: async ({ ctx, actor, params: p, body }) =>
    ok(await staffUpdateApplicant({ ...ctx, actor: actor! }, p.id, body)),
});
