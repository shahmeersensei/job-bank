import type { Tone } from '@/design-system/tokens';
import { cn } from '@/lib/utils/cn';
import { Badge } from '../Badge';
import type { StatusPillProps } from './statusPill.types';

const dot: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function StatusPill({ label, tone, pulse = false, className }: StatusPillProps) {
  return (
    <Badge tone={tone} size="sm" className={cn('gap-1.5', className)}>
      <span className="relative flex size-2" aria-hidden="true">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              dot[tone],
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', dot[tone])} />
      </span>
      {label}
    </Badge>
  );
}
