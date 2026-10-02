'use client';

import { Label as RadixLabel } from 'radix-ui';
import { cn } from '@/lib/utils/cn';
import type { LabelProps } from './label.types';

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <RadixLabel.Root className={cn('text-fg text-sm font-medium', className)} {...props}>
      {children}
      {required && (
        <span className="text-danger ms-0.5" aria-hidden="true">
          *
        </span>
      )}
    </RadixLabel.Root>
  );
}
