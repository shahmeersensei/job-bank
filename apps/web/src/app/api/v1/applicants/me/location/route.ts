import { applicantLocationSchema } from '@jobbank/shared';
import { setMyLocation } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** PUT /api/v1/applicants/me/location — home pin, address, city/area and chosen branch. */
export const PUT = apiHandler({
  permission: 'applicant:self',
  body: applicantLocationSchema,
  handler: async ({ ctx, actor, body }) => ok(await setMyLocation({ ...ctx, actor: actor! }, body)),
});
