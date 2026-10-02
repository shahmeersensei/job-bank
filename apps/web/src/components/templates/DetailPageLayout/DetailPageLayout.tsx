import { ChevronRight } from 'lucide-react';
import NextLink from 'next/link';
import type { DetailPageLayoutProps } from './detailPageLayout.types';

export function DetailPageLayout({
  title,
  subtitle,
  breadcrumbs,
  status,
  actions,
  children,
  aside,
}: DetailPageLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="grid gap-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="text-fg-muted flex flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, index) => {
                const last = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {crumb.href && !last ? (
                      <NextLink
                        href={crumb.href}
                        className="hover:text-fg focus-visible:focus-ring rounded-sm hover:underline"
                      >
                        {crumb.label}
                      </NextLink>
                    ) : (
                      <span
                        aria-current={last ? 'page' : undefined}
                        className={last ? 'text-fg' : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                    {!last && <ChevronRight className="size-3.5" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-fg text-2xl font-semibold break-words">{title}</h1>
              {status}
            </div>
            {subtitle && <p className="text-fg-muted text-sm">{subtitle}</p>}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
          )}
        </div>
      </header>

      {aside ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 content-start gap-6">{children}</div>
          <aside className="grid content-start gap-6">{aside}</aside>
        </div>
      ) : (
        <div className="grid min-w-0 gap-6">{children}</div>
      )}
    </div>
  );
}
