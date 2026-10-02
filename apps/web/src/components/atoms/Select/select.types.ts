import type { ComponentProps } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  options?: SelectOption[];
  /** Adds a first, empty option (selectable only when not `required`). */
  placeholder?: string;
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  wrapperClassName?: string;
}
