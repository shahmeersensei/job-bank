import {
  inviteStaff,
  inviteStaffSchema,
  listStaff,
  staffFilters,
  STAFF_SORTABLE,
} from '@/domains/user';
import { apiHandler, created, ok } from '@/domains/shared/http';
import { parseListQuery } from '@/domains/shared/pagination';

/** GET /api/v1/users — staff accounts the caller may see (?q, role, status, branchId, sort, page). */
export const GET = apiHandler({
  permission: 'user:read',
  handler: async ({ actor, request }) => {
    const query = parseListQuery(new URL(request.url).searchParams, {
      sortable: STAFF_SORTABLE,
      defaultSort: { field: 'name', direction: 'asc' },
      filters: staffFilters,
    });
    const { data, meta } = await listStaff(actor!, query);
    return ok(data, meta);
  },
});

/** POST /api/v1/users — invite a staff member by email (Idempotency-Key required). */
export const POST = apiHandler({
  permission: 'user:manage',
  idempotent: true,
  body: inviteStaffSchema,
  handler: async ({ ctx, actor, body }) => {
    const result = await inviteStaff({ ...ctx, actor: actor! }, body);
    return created(result, `/api/v1/users/${result.user.id}`);
  },
});
