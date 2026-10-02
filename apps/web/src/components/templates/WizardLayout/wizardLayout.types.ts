import type { ReactNode } from 'react';
import type { StepperStep } from '@/components/organisms/Stepper';

export interface WizardLayoutProps {
  title: string;
  description?: ReactNode;
  steps: StepperStep[];
  /** 0-based index of the active step. */
  current: number;
  onStepClick?: (index: number) => void;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  /** Label for the next button; the last step defaults to "Submit". */
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Spinner on the next button while saving the step. */
  saving?: boolean;
  /** Secondary action, e.g. "Save and finish later". */
  secondaryAction?: ReactNode;
}
