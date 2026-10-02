import type { ComponentProps, ReactNode } from 'react';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  invalid?: boolean;
  /** Content inside the field before the text (icon, "+92" prefix…). */
  startAdornment?: ReactNode;
  /** Content inside the field after the text (icon, clear button, unit…). */
  endAdornment?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Classes for the outer wrapper (width, margins). `className` styles the <input>. */
  wrapperClassName?: string;
}
