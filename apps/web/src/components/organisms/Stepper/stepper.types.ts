export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** 0-based index of the active step. */
  current: number;
  /** Lets users jump back to completed steps. */
  onStepClick?: (index: number) => void;
  className?: string;
}
