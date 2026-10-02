'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils/cn';
import type { PageItem, PaginationProps } from './pagination.types';

/** First, last, current ± siblings, with ellipses in the gaps. */
export function getPageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  const totalSlots = siblings * 2 + 5; // first, last, current, 2×siblings, 2 ellipses
  if (pageCount <= totalSlots) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const start = Math.max(2, Math.min(page - siblings, pageCount - siblings * 2 - 2));
  const end = Math.min(pageCount - 1, Math.max(page + siblings, siblings * 2 + 3));

  const items: PageItem[] = [1];
  if (start > 2) items.push('ellipsis-start');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < pageCount - 1) items.push('ellipsis-end');
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
  pageSize,
  total,
  className,
}: PaginationProps) {
  if (pageCount <= 1 && total === undefined) return null;
  const items = getPageItems(page, Math.max(pageCount, 1), siblings);
  const from = pageSize && total ? (page - 1) * pageSize + 1 : 0;
  const to = pageSize && total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      {pageSize !== undefined && total !== undefined && (
        <p className="text-fg-muted numeric text-sm">
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total.toLocaleString('en-PK')}`}
        </p>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pagination">
          <ul className="flex items-center gap-1">
            <li>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft />
              </Button>
            </li>
            {items.map((item) =>
              typeof item === 'number' ? (
                <li key={item} className={cn(item !== page && 'hidden sm:block')}>
                  <Button
                    variant={item === page ? 'primary' : 'ghost'}
                    size="icon"
                    className="numeric size-9"
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? 'page' : undefined}
                    onClick={() => item !== page && onPageChange(item)}
                  >
                    {item}
                  </Button>
                </li>
              ) : (
                <li key={item} className="text-fg-subtle hidden px-1 sm:block" aria-hidden="true">
                  …
                </li>
              ),
            )}
            <li className="text-fg-muted numeric px-2 text-sm sm:hidden">
              {page} / {pageCount}
            </li>
            <li>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight />
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
