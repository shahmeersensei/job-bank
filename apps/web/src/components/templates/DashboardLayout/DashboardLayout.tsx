'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { BrandMark } from '@/components/brand';
import { AppSidebar } from '@/components/organisms/AppSidebar';
import { TopBar } from '@/components/organisms/TopBar';
import type { DashboardLayoutProps } from './dashboardLayout.types';

export function DashboardLayout({
  navigation,
  topBar,
  children,
  sidebarFooter,
}: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="bg-surface text-fg shadow-popover sr-only z-50 rounded-lg px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="border-border sticky top-0 hidden h-dvh border-e lg:block">
        <AppSidebar sections={navigation} brand={<BrandMark />} footer={sidebarFooter} />
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-overlay fixed inset-0 z-50 lg:hidden" />
          <Dialog.Content className="border-border shadow-popover fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] border-e lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
            <AppSidebar
              sections={navigation}
              brand={
                <div className="flex w-full items-center justify-between">
                  <BrandMark />
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" aria-label="Close navigation">
                      <X />
                    </Button>
                  </Dialog.Close>
                </div>
              }
              footer={sidebarFooter}
              onNavigate={() => setDrawerOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-col">
        <TopBar {...topBar} onMenuClick={() => setDrawerOpen(true)} />
        <main id="main" tabIndex={-1} className="page-gutter flex-1 py-6 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
