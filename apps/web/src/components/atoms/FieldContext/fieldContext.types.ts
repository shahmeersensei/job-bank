export interface FieldContextValue {
  /** id of the form control — the label's htmlFor points here. */
  id: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

export interface FieldControlProps {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
}
