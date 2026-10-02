export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once when every box is filled. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  /** Group label read by screen readers. */
  label?: string;
  className?: string;
}
