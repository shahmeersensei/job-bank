'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useFieldControl } from '../FieldContext';
import { controlBase } from '../Input';
import type { SelectProps } from './select.types';

const heights = { sm: 'h-8 text-sm', md: 'h-10 text-sm', lg: 'h-12 text-base' } as const;

export function Select({
  options,
  placeholder,
  invalid,
  size = 'md',
  className,
  wrapperClassName,
  children,
  id,
  required,
  disabled,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps) {
  const field = useFieldControl({
    id,
    invalid,
    required,
    disabled,
    'aria-describedby': ariaDescribedBy,
  });

  return (
    <div className={cn(controlBase, 'relative flex items-center', heights[size], wrapperClassName)}>
      <select
        id={field.id}
        required={field.required}
        disabled={field.disabled}
        aria-invalid={field['aria-invalid']}
        aria-describedby={field['aria-describedby']}
        className={cn(
          'h-full w-full cursor-pointer appearance-none bg-transparent ps-3 pe-9 outline-none disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled={field.required}>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        className="text-fg-muted pointer-events-none absolute end-3 size-4"
        aria-hidden="true"
      />
    </div>
  );
}
