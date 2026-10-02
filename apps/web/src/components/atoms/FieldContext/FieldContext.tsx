'use client';

import { createContext, useContext } from 'react';
import type { FieldContextValue, FieldControlProps } from './fieldContext.types';

export const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Merges a control's own props with the surrounding <FormField>, so inputs get the
 * right id, aria-invalid and aria-describedby without manual wiring.
 */
export function useFieldControl(props: FieldControlProps) {
  const field = useContext(FieldContext);
  const invalid = props.invalid ?? field?.invalid ?? false;
  const describedBy =
    [props['aria-describedby'], field?.hintId, invalid ? field?.errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return {
    id: props.id ?? field?.id,
    required: props.required ?? field?.required,
    disabled: props.disabled ?? field?.disabled,
    invalid,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
  };
}
