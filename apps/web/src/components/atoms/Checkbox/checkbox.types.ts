import type { ComponentProps, ReactNode } from 'react';
import type { Checkbox as RadixCheckbox } from 'radix-ui';

export interface CheckboxProps extends ComponentProps<typeof RadixCheckbox.Root> {
  /** Inline label rendered next to the box (clickable). */
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}
