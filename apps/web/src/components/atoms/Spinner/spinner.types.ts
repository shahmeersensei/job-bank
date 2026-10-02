export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Announced to screen readers. Pass `null` when a parent already announces loading. */
  label?: string | null;
  className?: string;
}
