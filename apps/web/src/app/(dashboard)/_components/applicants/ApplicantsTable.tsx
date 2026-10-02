'use client';

import { APPLICANT_STATUSES, IDENTITY_STATUSES, type PaginationMeta } from '@jobbank/shared';
import { Contact } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, StatusPill } from '@/components/atoms';
import { EmptyState, SearchBar } from '@/components/molecules';
import { DataTable, type SortState } from '@/components/organisms';
import type { SelectOption } from '@/components/atoms';
import type { ApplicantListItem } from '@/domains/applicant';
import { formatDate } from '@/lib/format/date';
import { APPLICANT_STATUS_PILL, IDENTITY_PILL } from './labels';

interface Props {
  rows: ApplicantListItem[];
  meta: PaginationMeta;
  sort: SortState;
  /** Shown only when the viewer can see more than one branch. */
  branches: SelectOption[];
  skills: SelectOption[];
}

export function ApplicantsTable({ rows, meta, sort, branches, skills }: Props) {
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
    <DataTable<ApplicantListItem>
      caption="Applicants"
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
            placeholder="Name, CNIC or mobile…"
            label="Search applicants"
          />
          <Select
            aria-label="Filter by status"
            wrapperClassName="w-full sm:w-44"
            value={params.get('status') ?? ''}
            onChange={(e) => update({ status: e.target.value || null })}
            placeholder="Any status"
            options={APPLICANT_STATUSES.map((s) => ({
              value: s,
              label: APPLICANT_STATUS_PILL[s].label,
            }))}
          />
          <Select
            aria-label="Filter by identity check"
            wrapperClassName="w-full sm:w-48"
            value={params.get('identityStatus') ?? ''}
            onChange={(e) => update({ identityStatus: e.target.value || null })}
            placeholder="Any identity status"
            options={IDENTITY_STATUSES.map((s) => ({ value: s, label: IDENTITY_PILL[s].label }))}
          />
          <Select
            aria-label="Filter by skill"
            wrapperClassName="w-full sm:w-56"
            value={params.get('skillCode') ?? ''}
            onChange={(e) => update({ skillCode: e.target.value || null })}
            placeholder="Any skill"
            options={skills}
          />
          {branches.length > 1 && (
            <Select
              aria-label="Filter by branch"
              wrapperClassName="w-full sm:w-52"
              value={params.get('branchId') ?? ''}
              onChange={(e) => update({ branchId: e.target.value || null })}
              placeholder="All branches"
              options={branches}
            />
          )}
        </>
      }
      empty={
        <EmptyState
          icon={Contact}
          title="No applicants found"
          description="Try clearing the filters or searching by CNIC or mobile number."
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
          id: 'fullName',
          header: 'Name',
          sortable: true,
          cell: (r) => (
            <div className="grid min-w-0">
              <span className="truncate font-medium">{r.fullName}</span>
              <span className="text-fg-subtle numeric truncate text-xs">
                {r.cnicMasked}
                {r.phoneMasked ? ` · ${r.phoneMasked}` : ''}
              </span>
            </div>
          ),
        },
        {
          id: 'area',
          header: 'Area',
          hideBelow: 'md',
          cell: (r) =>
            r.areaLabel || r.cityLabel ? (
              [r.areaLabel, r.cityLabel].filter(Boolean).join(', ')
            ) : (
              <span className="text-fg-subtle">No location yet</span>
            ),
        },
        ...(branches.length > 1
          ? [
              {
                id: 'branch',
                header: 'Branch',
                hideBelow: 'lg' as const,
                cell: (r: ApplicantListItem) =>
                  r.branchName ?? <span className="text-fg-subtle">Not chosen</span>,
              },
            ]
          : []),
        {
          id: 'profileCompleteness',
          header: 'Profile',
          sortable: true,
          hideBelow: 'sm',
          cell: (r) => <span className="numeric">{r.profileCompleteness}%</span>,
        },
        {
          id: 'identity',
          header: 'Identity',
          hideBelow: 'md',
          cell: (r) => <StatusPill {...IDENTITY_PILL[r.identityStatus]} />,
        },
        {
          id: 'createdAt',
          header: 'Registered',
          sortable: true,
          hideBelow: 'lg',
          cell: (r) => formatDate(r.createdAt),
        },
        {
          id: 'status',
          header: 'Status',
          cell: (r) => <StatusPill {...APPLICANT_STATUS_PILL[r.status]} />,
        },
      ]}
    />
  );
}
