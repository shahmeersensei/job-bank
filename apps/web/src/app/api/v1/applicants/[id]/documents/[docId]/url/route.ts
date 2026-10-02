import { z } from 'zod';
import { staffDocumentLink } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/applicants/{id}/documents/{docId}/url — 2-minute view link; every view is audited. */
export const GET = apiHandler({
  permission: 'applicant:read',
  params: z.object({ id: z.uuid(), docId: z.uuid() }),
  handler: async ({ ctx, actor, params }) =>
    ok(await staffDocumentLink({ ...ctx, actor: actor! }, params.id, params.docId)),
});
