import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Placeholder wordmark until official Saylani brand assets are supplied. */
export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="bg-primary text-primary-fg grid size-8 place-items-center rounded-lg"
        aria-hidden="true"
      >
        <BriefcaseBusiness className="size-4" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="text-fg block text-sm font-bold">Saylani</span>
          <span className="text-fg-muted block text-xs font-medium">Job Bank</span>
        </span>
      )}
      {compact && <span className="sr-only">Saylani Job Bank</span>}
    </span>
  );
}
