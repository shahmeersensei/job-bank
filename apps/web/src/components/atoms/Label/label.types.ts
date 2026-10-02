import type { ComponentProps } from 'react';
import type { Label as RadixLabel } from 'radix-ui';

export interface LabelProps extends ComponentProps<typeof RadixLabel.Root> {
  /** Appends a visual required marker (the control itself carries `required`). */
  required?: boolean;
}
