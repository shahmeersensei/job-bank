'use client';

import { Check, Minus } from 'lucide-react';
import { Checkbox as RadixCheckbox } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { useFieldControl } from '../FieldContext';
import type { CheckboxProps } from './checkbox.types';

export function Checkbox({
  label,
  description,
  invalid,
  className,
  id,
  required,
  disabled,
  'aria-describedby': ariaDescribedBy,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const field = useFieldControl({
    id,
    invalid,
    required,
    disabled,
    'aria-describedby': [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined,
  });
  const controlId = field.id ?? generatedId;

  const box = (
    <RadixCheckbox.Root
      id={controlId}
      required={field.required}
      disabled={field.disabled}
      aria-invalid={field['aria-invalid']}
      aria-describedby={field['aria-describedby']}
      className={cn(
        'peer border-border-strong bg-surface grid size-5 shrink-0 place-items-center rounded-md border',
        'focus-visible:focus-ring transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-fg',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator>
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3.5" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (!label) return box;

  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">{box}</div>
      <div className="grid gap-0.5">
        <label
          htmlFor={controlId}
          className="text-fg cursor-pointer text-sm font-medium peer-disabled:cursor-not-allowed"
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-fg-muted text-sm">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
