'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils/cn';
import type { ModalProps } from './modal.types';

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/** Accessible dialog for forms (focus trap, Esc to close, labelled by its title). */
export function Modal({
  title,
  description,
  children,
  trigger,
  open,
  onOpenChange,
  size = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="bg-overlay fixed inset-0 z-60" />
        <Dialog.Content
          className={cn(
            'border-border bg-surface shadow-popover fixed top-1/2 left-1/2 z-60 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-1/2 gap-4 overflow-y-auto rounded-xl border p-5',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <Dialog.Title className="text-fg text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-fg-muted text-sm">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-me-2 -mt-1 size-8" aria-label="Close">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
