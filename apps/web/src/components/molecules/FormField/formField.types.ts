import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  children: ReactNode;
  /** Helper text shown under the control and linked via aria-describedby. */
  hint?: ReactNode;
  /** Error message. Presence marks the control invalid and announces the message. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Custom control id; generated when omitted. */
  id?: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  className?: string;
}
