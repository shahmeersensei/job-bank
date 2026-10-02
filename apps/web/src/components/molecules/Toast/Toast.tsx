'use client';

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/design-system/theme-provider';
import type { ToasterProps } from './toast.types';

/** Mount once in the root layout. Trigger with `toast.success('Saved')` etc. */
export function Toaster({ position = 'top-center' }: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position={position}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-border shadow-popover font-sans',
          description: 'text-fg-muted',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
