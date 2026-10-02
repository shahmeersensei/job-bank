import { z } from 'zod';
import { myDocumentLink } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/applicants/me/documents/{id}/url — a 2-minute link to view own upload. */
export const GET = apiHandler({
  permission: 'applicant:self',
  params: z.object({ id: z.uuid() }),
  handler: async ({ actor, params }) => ok(await myDocumentLink(actor!, params.id)),
});
