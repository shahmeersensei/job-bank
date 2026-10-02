import type { InputProps } from '@/components/atoms/Input';

export type DateTimeMode = 'date' | 'datetime' | 'time';

export interface DateTimePickerProps extends Omit<
  InputProps,
  'type' | 'value' | 'onChange' | 'min' | 'max'
> {
  mode?: DateTimeMode;
  /** Local wall-clock value in the native input format ("2026-10-01", "2026-10-01T14:30", "14:30"). */
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
}
