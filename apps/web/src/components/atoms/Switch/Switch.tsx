'use client';

import { Switch as RadixSwitch } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import type { SwitchProps } from './switch.types';

export function Switch({ label, description, className, id, ...props }: SwitchProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;

  const control = (
    <RadixSwitch.Root
      id={controlId}
      aria-describedby={descriptionId}
      className={cn(
        'bg-border-strong relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'focus-visible:focus-ring transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="shadow-card block size-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] rtl:data-[state=checked]:-translate-x-[22px]" />
    </RadixSwitch.Root>
  );

  if (!label) return control;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <label htmlFor={controlId} className="text-fg cursor-pointer text-sm font-medium">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-fg-muted text-sm">
            {description}
          </p>
        )}
      </div>
      {control}
    </div>
  );
}
