import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid min-w-0 scroll-mt-20 gap-4">
      <div className="border-border grid gap-1 border-b pb-2">
        <h2 id={`${id}-title`} className="text-fg text-xl font-semibold">
          {title}
        </h2>
        {description && <p className="text-fg-muted text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function Demo({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="border-border bg-surface shadow-card grid min-w-0 gap-3 rounded-xl border p-4">
      <h3 className="text-fg-muted text-sm font-semibold">{title}</h3>
      <div className={cn('min-w-0', className)}>{children}</div>
    </div>
  );
}
