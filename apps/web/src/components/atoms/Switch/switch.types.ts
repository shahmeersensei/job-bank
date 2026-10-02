import type { ComponentProps, ReactNode } from 'react';
import type { Switch as RadixSwitch } from 'radix-ui';

export interface SwitchProps extends ComponentProps<typeof RadixSwitch.Root> {
  label?: ReactNode;
  description?: ReactNode;
}
