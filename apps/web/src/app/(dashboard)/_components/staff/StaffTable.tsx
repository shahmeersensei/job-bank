'use client';

import { INTERNAL_ROLES, ROLE_LABELS, type PaginationMeta, type Role } from '@jobbank/shared';
import { ShieldCheck, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Avatar, Badge, Select, StatusPill } from '@/components/atoms';
import { EmptyState, SearchBar } from '@/components/molecules';
import { DataTable, type SortState } from '@/components/organisms';
import type { StaffListItem } from '@/domains/user';
import { formatDateTime } from '@/lib/format/date';
import { InviteStaffDialog, type BranchOption } from './InviteStaffDialog';
import { STATUS_PILL } from './labels';

interface Props {
  rows: StaffListItem[];
  meta: PaginationMeta;
  sort: SortState;
  branches: BranchOption[];
  /** Roles the viewer may invite; empty hides the invite button. */
  grantableRoles: Role[];
}

export function StaffTable({ rows, meta, sort, branches, grantableRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <DataTable<StaffListItem>
      caption="Staff"
      rows={rows}
      getRowId={(r) => r.id}
      sort={sort}
      onSortChange={(s) => update({ sort: `${s.id}:${s.direction}` })}
      onRowClick={(r) => router.push(`${pathname}/${r.id}`)}
      toolbar={
        <>
          <SearchBar
            className="w-full sm:max-w-xs"
            defaultValue={params.get('q') ?? ''}
            onSearch={(q) => update({ q: q || null })}
            placeholder="Search name or email…"
            label="Search staff"
          />
          <Select
            aria-label="Filter by role"
            size="md"
            wrapperClassName="w-full sm:w-44"
            value={params.get('role') ?? ''}
            onChange={(e) => update({ role: e.target.value || null })}
            placeholder="All roles"
            options={INTERNAL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
          />
          <Select
            aria-label="Filter by status"
            wrapperClassName="w-full sm:w-36"
            value={params.get('status') ?? ''}
            onChange={(e) => update({ status: e.target.value || null })}
            placeholder="Any status"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INVITED', label: 'Invited' },
              { value: 'DISABLED', label: 'Disabled' },
            ]}
          />
          {branches.length > 1 && (
            <Select
              aria-label="Filter by branch"
              wrapperClassName="w-full sm:w-52"
              value={params.get('branchId') ?? ''}
              onChange={(e) => update({ branchId: e.target.value || null })}
              placeholder="All branches"
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          {grantableRoles.length > 0 && (
            <InviteStaffDialog
              grantableRoles={grantableRoles}
              branches={branches}
              basePath={pathname}
            />
          )}
        </>
      }
      empty={
        <EmptyState
          icon={Users}
          title="No staff found"
          description="Try clearing the filters, or invite someone."
        />
      }
      pagination={{
        page: meta.page,
        pageCount: meta.pageCount,
        pageSize: meta.pageSize,
        total: meta.total,
        onPageChange: (p) => update({ page: String(p) }),
      }}
      columns={[
        {
          id: 'name',
          header: 'Name',
          sortable: true,
          cell: (r) => (
            <div className="flex items-center gap-3">
              <Avatar name={r.name} size="sm" />
              <div className="grid min-w-0">
                <span className="truncate font-medium">{r.name}</span>
                <span className="text-fg-subtle truncate text-xs">{r.email}</span>
              </div>
            </div>
          ),
        },
        {
          id: 'roles',
          header: 'Roles',
          hideBelow: 'md',
          cell: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.roles.map((a) => (
                <Badge
                  key={a.id}
                  size="sm"
                  tone={
                    a.role === 'SUPER_ADMIN' || a.role === 'BRANCH_ADMIN' ? 'accent' : 'neutral'
                  }
                >
                  {ROLE_LABELS[a.role]}
                  {a.branchName ? ` · ${a.branchName.split(' — ')[0]}` : ''}
                </Badge>
              ))}
            </div>
          ),
        },
        {
          id: 'twoFactor',
          header: '2FA',
          hideBelow: 'lg',
          cell: (r) =>
            r.twoFactorEnabled ? (
              <ShieldCheck className="text-success size-4" aria-label="Two-factor on" />
            ) : (
              <span className="text-fg-subtle text-xs">Off</span>
            ),
        },
        {
          id: 'lastLoginAt',
          header: 'Last sign-in',
          sortable: true,
          hideBelow: 'sm',
          cell: (r) =>
            r.lastLoginAt ? (
              formatDateTime(r.lastLoginAt)
            ) : (
              <span className="text-fg-subtle">Never</span>
            ),
        },
        { id: 'status', header: 'Status', cell: (r) => <StatusPill {...STATUS_PILL[r.status]} /> },
      ]}
    />
  );
}
