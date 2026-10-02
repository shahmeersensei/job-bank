'use client';

import { CircleAlert } from 'lucide-react';
import { useId, useMemo } from 'react';
import { FieldContext, type FieldContextValue } from '@/components/atoms/FieldContext';
import { Label } from '@/components/atoms/Label';
import { cn } from '@/lib/utils/cn';
import type { FormFieldProps } from './formField.types';

export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
  disabled = false,
  id,
  hideLabel = false,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = `${controlId}-error`;
  const invalid = Boolean(error);

  const context = useMemo<FieldContextValue>(
    () => ({ id: controlId, hintId, errorId, invalid, required, disabled }),
    [controlId, hintId, errorId, invalid, required, disabled],
  );

  return (
    <FieldContext.Provider value={context}>
      <div className={cn('grid gap-1.5', className)}>
        <Label htmlFor={controlId} required={required} className={cn(hideLabel && 'sr-only')}>
          {label}
        </Label>
        {children}
        {hint && (
          <p id={hintId} className="text-fg-muted text-sm">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-danger flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
