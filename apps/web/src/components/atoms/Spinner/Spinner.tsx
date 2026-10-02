import { cn } from '@/lib/utils/cn';
import type { SpinnerProps, SpinnerSize } from './spinner.types';

const sizes: Record<SpinnerSize, string> = { sm: 'size-4', md: 'size-5', lg: 'size-8' };

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  const svg = (
    <svg
      className={cn('animate-spin text-current', sizes[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  if (label === null) return svg;
  return (
    <span role="status" className="inline-flex">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
