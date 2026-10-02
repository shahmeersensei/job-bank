'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Pagination } from '@/components/molecules/Pagination';
import { cn } from '@/lib/utils/cn';
import type { DataTableColumn, DataTableProps, SortState } from './dataTable.types';

const hide = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;
const align = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

function cellClass<T>(column: DataTableColumn<T>) {
  return cn(
    align[column.align ?? 'start'],
    column.hideBelow && hide[column.hideBelow],
    column.className,
  );
}

export function nextSort(current: SortState | null | undefined, columnId: string): SortState {
  if (current?.id === columnId) {
    return { id: columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { id: columnId, direction: 'asc' };
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  sort,
  onSortChange,
  loading = false,
  empty,
  onRowClick,
  toolbar,
  pagination,
  className,
}: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className={cn('grid min-w-0 gap-3', className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}

      <div className="border-border bg-surface relative scrollbar-thin overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-muted">
            <tr>
              {columns.map((column) => {
                const active = sort?.id === column.id;
                const ariaSort = column.sortable
                  ? active
                    ? sort?.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined;
                const SortIcon = !active
                  ? ArrowUpDown
                  : sort?.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'text-fg-muted px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
                      cellClass(column),
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(nextSort(sort, column.id))}
                        className="hover:text-fg focus-visible:focus-ring inline-flex items-center gap-1 rounded-sm uppercase"
                      >
                        {column.header}
                        <SortIcon
                          className={cn('size-3.5', !active && 'opacity-40')}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {loading &&
              Array.from({ length: Math.min(pagination?.pageSize ?? 5, 10) }, (_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((column) => (
                    <td key={column.id} className={cn('px-4 py-3.5', cellClass(column))}>
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' && event.target === event.currentTarget)
                            onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick &&
                      'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:focus-ring cursor-pointer',
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.id} className={cn('text-fg px-4 py-3', cellClass(column))}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            {showEmpty && (
              <tr>
                <td colSpan={columns.length}>
                  {empty ?? <EmptyState compact title="No records found" />}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
