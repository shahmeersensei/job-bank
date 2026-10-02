import { z } from 'zod';
import { getStaffMember, staffProfileSchema, updateStaffProfile } from '@/domains/user';
import { apiHandler, ok } from '@/domains/shared/http';

const params = z.object({ id: z.uuid() });

export const GET = apiHandler({
  permission: 'user:read',
  params,
  handler: async ({ actor, params: p }) => ok(await getStaffMember(actor!, p.id)),
});

export const PATCH = apiHandler({
  permission: 'user:manage',
  params,
  body: staffProfileSchema,
  handler: async ({ ctx, actor, params: p, body }) =>
    ok(await updateStaffProfile({ ...ctx, actor: actor! }, p.id, body)),
});
