import type { ReactNode } from 'react';
import type { PaginationProps } from '@/components/molecules/Pagination';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  id: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server-side sort; clicking the header calls onSortChange. */
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Hide on narrow screens to keep the table readable on phones. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Accessible name for the table (visually hidden). */
  caption: string;
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  loading?: boolean;
  /** Shown when rows is empty and not loading. */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Filters / search / bulk actions rendered above the table. */
  toolbar?: ReactNode;
  pagination?: Omit<PaginationProps, 'className'>;
  className?: string;
}
