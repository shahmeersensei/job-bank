import { cn } from '@/lib/utils/cn';
import type { KeyValueProps } from './keyValue.types';

const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' } as const;

export function KeyValue({ items, columns = 2, className }: KeyValueProps) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', grid[columns], className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn('grid min-w-0 gap-0.5', item.wide && 'sm:col-span-full')}
        >
          <dt className="text-fg-subtle text-xs font-medium tracking-wide uppercase">
            {item.label}
          </dt>
          <dd className="text-fg text-sm break-words">
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-fg-subtle">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
