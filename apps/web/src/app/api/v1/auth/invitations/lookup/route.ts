import { z } from 'zod';
import { previewInvitation } from '@/domains/auth';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/auth/invitations/lookup?token= — who the invitation is for (does not use it up). */
export const GET = apiHandler({
  auth: 'public',
  query: z.object({ token: z.string().min(20).max(200) }),
  handler: async ({ query }) => ok(await previewInvitation(query.token)),
});
