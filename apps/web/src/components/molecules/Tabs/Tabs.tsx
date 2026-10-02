'use client';

import { Tabs as RadixTabs } from 'radix-ui';
import { cn } from '@/lib/utils/cn';
import type { TabsProps } from './tabs.types';

export function Tabs({ items, value, defaultValue, onValueChange, label, className }: TabsProps) {
  return (
    <RadixTabs.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={cn('grid min-w-0 gap-4', className)}
    >
      <RadixTabs.List
        aria-label={label}
        className="relative flex scrollbar-none gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)]"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'text-fg-muted inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium',
              'hover:text-fg focus-visible:focus-ring rounded-t-md transition-colors disabled:opacity-50',
              'data-[state=active]:border-primary data-[state=active]:text-fg',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="bg-surface-muted text-fg-muted numeric rounded-full px-1.5 py-0.5 text-xs">
                {item.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:focus-ring rounded-md"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
