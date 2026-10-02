export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current page. */
  siblings?: number;
  /** When both are given, shows "Showing 21–40 of 312". */
  pageSize?: number;
  total?: number;
  className?: string;
}
