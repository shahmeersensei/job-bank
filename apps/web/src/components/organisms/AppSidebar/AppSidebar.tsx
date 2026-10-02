'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { AppSidebarProps, NavItem } from './appSidebar.types';

export function isNavItemActive(item: Pick<NavItem, 'href' | 'exact'>, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({ sections, brand, footer, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <div className={cn('bg-surface flex h-full flex-col', className)}>
      {brand && (
        <div className="border-border flex h-16 shrink-0 items-center border-b px-4">{brand}</div>
      )}
      <nav aria-label="Main" className="relative flex-1 scrollbar-thin overflow-y-auto px-3 py-4">
        <div className="grid gap-6">
          {sections.map((section, sectionIndex) => (
            <div key={section.title ?? sectionIndex} className="grid gap-1">
              {section.title && (
                <p className="text-fg-subtle px-3 pb-1 text-xs font-semibold tracking-wide uppercase">
                  {section.title}
                </p>
              )}
              <ul className="grid gap-0.5">
                {section.items.map((item) => {
                  const active = isNavItemActive(item, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <NextLink
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'focus-visible:focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary-soft text-primary-soft-fg'
                            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-danger text-danger-fg numeric rounded-full px-1.5 py-0.5 text-xs font-semibold">
                            {item.badge > 99 ? '99+' : item.badge}
                            <span className="sr-only"> pending</span>
                          </span>
                        )}
                      </NextLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      {footer && <div className="border-border shrink-0 border-t p-3">{footer}</div>}
    </div>
  );
}
