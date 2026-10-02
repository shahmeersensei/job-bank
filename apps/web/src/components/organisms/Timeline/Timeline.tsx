import { Circle } from 'lucide-react';
import type { Tone } from '@/design-system/tokens';
import { formatDateTime, toIso } from '@/lib/format/date';
import { cn } from '@/lib/utils/cn';
import type { TimelineProps } from './timeline.types';

const markerTone: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-soft-fg',
  primary: 'bg-primary-soft text-primary-soft-fg',
  accent: 'bg-accent-soft text-accent-soft-fg',
  success: 'bg-success-soft text-success-soft-fg',
  warning: 'bg-warning-soft text-warning-soft-fg',
  danger: 'bg-danger-soft text-danger-soft-fg',
  info: 'bg-info-soft text-info-soft-fg',
};

/** Chronological history (audit trail, case progress). Pass items oldest → newest. */
export function Timeline({ items, label, className }: TimelineProps) {
  return (
    <ol aria-label={label} className={cn('grid', className)}>
      {items.map((item, index) => {
        const Icon = item.icon ?? Circle;
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!last && (
              <span className="bg-border absolute start-4 top-9 bottom-1 w-px" aria-hidden="true" />
            )}
            <span
              className={cn(
                'ring-surface grid size-8 shrink-0 place-items-center rounded-full ring-4',
                markerTone[item.tone ?? 'neutral'],
              )}
              aria-hidden="true"
            >
              <Icon className={cn('size-4', !item.icon && 'size-2.5 fill-current')} />
            </span>
            <div className="grid min-w-0 gap-0.5 pt-1">
              <p className="text-fg text-sm font-medium">{item.title}</p>
              {item.description && <div className="text-fg-muted text-sm">{item.description}</div>}
              <p className="text-fg-subtle text-xs">
                <time dateTime={toIso(item.timestamp)}>{formatDateTime(item.timestamp)}</time>
                {item.actor && <> · {item.actor}</>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
