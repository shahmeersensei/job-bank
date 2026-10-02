import type { Tone } from '@/design-system/tokens';
import { cn } from '@/lib/utils/cn';
import type { BadgeProps } from './badge.types';

const soft: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-soft-fg',
  primary: 'bg-primary-soft text-primary-soft-fg',
  accent: 'bg-accent-soft text-accent-soft-fg',
  success: 'bg-success-soft text-success-soft-fg',
  warning: 'bg-warning-soft text-warning-soft-fg',
  danger: 'bg-danger-soft text-danger-soft-fg',
  info: 'bg-info-soft text-info-soft-fg',
};

const solid: Record<Tone, string> = {
  neutral: 'bg-fg-muted text-surface',
  primary: 'bg-primary text-primary-fg',
  accent: 'bg-accent text-accent-fg',
  success: 'bg-success text-surface',
  warning: 'bg-warning text-surface',
  danger: 'bg-danger text-danger-fg',
  info: 'bg-info text-surface',
};

const outline: Record<Tone, string> = {
  neutral: 'border-border-strong text-fg-muted',
  primary: 'border-primary text-primary-soft-fg',
  accent: 'border-accent text-accent-soft-fg',
  success: 'border-success text-success-soft-fg',
  warning: 'border-warning text-warning-soft-fg',
  danger: 'border-danger text-danger-soft-fg',
  info: 'border-info text-info-soft-fg',
};

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap [&_svg]:size-3',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
        variant === 'soft' && soft[tone],
        variant === 'solid' && solid[tone],
        variant === 'outline' && ['border bg-transparent', outline[tone]],
        className,
      )}
      {...props}
    />
  );
}
