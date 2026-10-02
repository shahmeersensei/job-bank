import type { ComponentProps } from 'react';

export interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
  /** Shows "used / max" under the field when maxLength is set. */
  showCount?: boolean;
}
