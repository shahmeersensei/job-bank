import { cn } from '@/lib/utils/cn';
import type { IconProps, IconSize } from './icon.types';

const sizes: Record<IconSize, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
};

export function Icon({ as: Component, size = 'md', label, className }: IconProps) {
  return (
    <Component
      className={cn('shrink-0', sizes[size], className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
    />
  );
}
