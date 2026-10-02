import { cn } from '@/lib/utils/cn';
import type { SkeletonProps } from './skeleton.types';

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="grid gap-2" aria-hidden="true" {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'bg-surface-sunken h-4 rounded-md motion-safe:animate-pulse',
              i === lines - 1 && 'w-2/3',
              className,
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn('bg-surface-sunken h-4 rounded-md motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}
