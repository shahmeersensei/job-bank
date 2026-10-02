import { INTERNAL_ROLES, type Role } from '@jobbank/shared';
import { listBranches } from '@/domains/branch';
import { ValidationError } from '@/domains/shared/errors';
import { parseListQuery } from '@/domains/shared/pagination';
import { isSuperAdmin, type Actor } from '@/domains/shared/scope';
import { BRANCH_ADMIN_GRANTABLE, listStaff, staffFilters, STAFF_SORTABLE } from '@/domains/user';
import { StaffTable } from './StaffTable';

const listOptions = {
  sortable: STAFF_SORTABLE,
  defaultSort: { field: 'name' as const, direction: 'asc' as const },
  filters: staffFilters,
};

/** Server-rendered staff directory; filters live in the URL so views can be shared/bookmarked. */
export async function StaffDirectory({
  actor,
  searchParams,
}: {
  actor: Actor;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value) params.set(key, value);
  }
  let query;
  try {
    query = parseListQuery(params, listOptions);
  } catch (error) {
    // A hand-edited URL with bad filters falls back to the default view.
    if (!(error instanceof ValidationError)) throw error;
    query = parseListQuery(new URLSearchParams(), listOptions);
  }

  const [{ data, meta }, branches] = await Promise.all([
    listStaff(actor, query),
    listBranches(actor),
  ]);
  const canManage = actor.permissions.has('user:manage');
  const grantable: Role[] = !canManage
    ? []
    : isSuperAdmin(actor)
      ? [...INTERNAL_ROLES]
      : [...BRANCH_ADMIN_GRANTABLE];

  return (
    <StaffTable
      rows={data}
      meta={meta}
      sort={{ id: query.sort.field, direction: query.sort.direction }}
      branches={branches.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))}
      grantableRoles={grantable}
    />
  );
}
