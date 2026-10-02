import type { InputProps } from '@/components/atoms/Input';

export interface CnicChange {
  /** 13 digits without dashes (storage format). */
  digits: string;
  /** Display format #####-#######-#. */
  formatted: string;
  complete: boolean;
}

export interface CNICInputProps extends Omit<
  InputProps,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  value?: string;
  onChange?: (change: CnicChange) => void;
}
