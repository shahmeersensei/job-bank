'use client';

import type { Tone } from '@/design-system/tokens';
import { cn } from '@/lib/utils/cn';
import type { KanbanBoardProps } from './kanbanBoard.types';

const accent: Record<Tone, string> = {
  neutral: 'border-t-border-strong',
  primary: 'border-t-primary',
  accent: 'border-t-accent',
  success: 'border-t-success',
  warning: 'border-t-warning',
  danger: 'border-t-danger',
  info: 'border-t-info',
};

export function KanbanBoard<T>({
  columns,
  getItemId,
  renderCard,
  onCardClick,
  label,
  emptyLabel = 'Nothing here',
  className,
}: KanbanBoardProps<T>) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        'focus-visible:focus-ring relative flex min-w-0 snap-x snap-mandatory scrollbar-thin gap-4 overflow-x-auto pb-2',
        className,
      )}
    >
      {columns.map((column) => {
        const headingId = `kanban-${column.id}`;
        return (
          <section
            key={column.id}
            aria-labelledby={headingId}
            className={cn(
              'border-border bg-surface-muted flex w-[min(18rem,85vw)] shrink-0 snap-start flex-col rounded-xl border border-t-4',
              accent[column.tone ?? 'neutral'],
            )}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <h3 id={headingId} className="text-fg text-sm font-semibold">
                {column.title}
              </h3>
              <span className="bg-surface text-fg-muted numeric rounded-full px-2 py-0.5 text-xs font-medium">
                {column.items.length}
              </span>
            </header>
            <ul className="grid gap-2 px-2 pb-2">
              {column.items.length === 0 && (
                <li className="border-border text-fg-subtle rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                  {emptyLabel}
                </li>
              )}
              {column.items.map((item) => (
                <li key={getItemId(item)}>
                  {onCardClick ? (
                    <button
                      type="button"
                      onClick={() => onCardClick(item)}
                      className="border-border bg-surface shadow-card hover:border-border-strong focus-visible:focus-ring w-full rounded-lg border p-3 text-start transition-colors"
                    >
                      {renderCard(item)}
                    </button>
                  ) : (
                    <div className="border-border bg-surface shadow-card rounded-lg border p-3">
                      {renderCard(item)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
