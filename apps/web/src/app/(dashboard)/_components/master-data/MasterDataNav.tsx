'use client';

import { MASTER_DATA_TYPE_LABELS } from '@jobbank/shared';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/atoms';
import { cn } from '@/lib/utils/cn';
import { TYPE_GROUPS } from './labels';

export type ListKey = keyof typeof MASTER_DATA_TYPE_LABELS | 'HOLIDAYS';

const GROUPS: { title: string; items: { key: ListKey; label: string }[] }[] = [
  ...TYPE_GROUPS.map((g) => ({
    title: g.title,
    items: g.types.map((t) => ({ key: t as ListKey, label: MASTER_DATA_TYPE_LABELS[t] })),
  })),
  { title: 'Calendar', items: [{ key: 'HOLIDAYS', label: 'Public holidays' }] },
];

const href = (key: ListKey) => `/super-admin/master-data?type=${key}`;

/** List picker: a grouped side menu on wide screens, a select on phones. */
export function MasterDataNav({ current }: { current: ListKey }) {
  const router = useRouter();
  return (
    <>
      <div className="lg:hidden">
        <Select
          aria-label="Choose a list"
          value={current}
          onChange={(e) => router.push(href(e.target.value as ListKey))}
          options={GROUPS.flatMap((g) =>
            g.items.map((i) => ({ value: i.key, label: `${g.title} — ${i.label}` })),
          )}
        />
      </div>
      <nav aria-label="Master data lists" className="hidden gap-5 lg:grid">
        {GROUPS.map((group) => (
          <div key={group.title} className="grid gap-1">
            <p className="text-fg-subtle px-3 text-xs font-semibold tracking-wide uppercase">
              {group.title}
            </p>
            {group.items.map((item) => (
              <NextLink
                key={item.key}
                href={href(item.key)}
                aria-current={item.key === current ? 'page' : undefined}
                className={cn(
                  'focus-visible:focus-ring rounded-md px-3 py-1.5 text-sm transition-colors',
                  item.key === current
                    ? 'bg-primary-soft text-primary-soft-fg font-medium'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                )}
              >
                {item.label}
              </NextLink>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}
