'use client';

import { ChevronDown, Menu } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/Button';
import { Select } from '@/components/atoms/Select';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { cn } from '@/lib/utils/cn';
import type { TopBarProps } from './topBar.types';

export function TopBar({
  title,
  onMenuClick,
  branchSwitcher,
  user,
  userMenuItems = [],
  actions,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'border-border bg-surface/90 page-gutter sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b backdrop-blur',
        className,
      )}
    >
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="-ms-2 lg:hidden"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          <Menu />
        </Button>
      )}

      {title && (
        <div className="text-fg min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
      )}
      {!title && <div className="flex-1" />}

      {branchSwitcher && (
        <Select
          aria-label="Active branch"
          size="sm"
          wrapperClassName="w-auto max-w-44 sm:max-w-56"
          value={branchSwitcher.value}
          onChange={(event) => branchSwitcher.onChange(event.target.value)}
          options={branchSwitcher.branches.map((branch) => ({
            value: branch.id,
            label: branch.name,
          }))}
        />
      )}

      <div className="flex items-center gap-1">
        {actions}
        <ThemeToggle />
      </div>

      {user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="hover:bg-surface-muted focus-visible:focus-ring flex items-center gap-2 rounded-lg p-1"
              aria-label={`Account menu for ${user.name}`}
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="hidden text-start md:grid">
                <span className="text-fg max-w-40 truncate text-sm font-medium">{user.name}</span>
                <span className="text-fg-muted text-xs">{user.role}</span>
              </span>
              <ChevronDown className="text-fg-muted hidden size-4 md:block" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="border-border bg-surface shadow-popover z-40 min-w-52 rounded-xl border p-1"
            >
              <div className="px-3 py-2 md:hidden">
                <p className="text-fg truncate text-sm font-medium">{user.name}</p>
                <p className="text-fg-muted text-xs">{user.role}</p>
              </div>
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenu.Item
                    key={item.label}
                    onSelect={item.onSelect}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none',
                      'data-[highlighted]:bg-surface-muted',
                      item.tone === 'danger' ? 'text-danger' : 'text-fg',
                    )}
                  >
                    {Icon && <Icon className="size-4" aria-hidden="true" />}
                    {item.label}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  );
}
