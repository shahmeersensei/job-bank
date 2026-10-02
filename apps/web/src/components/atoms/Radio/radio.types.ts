import type { ComponentProps, ReactNode } from 'react';
import type { RadioGroup } from 'radix-ui';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps extends ComponentProps<typeof RadioGroup.Root> {
  options: RadioOption[];
  invalid?: boolean;
}
