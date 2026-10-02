'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Stepper } from '@/components/organisms/Stepper';
import type { WizardLayoutProps } from './wizardLayout.types';

export function WizardLayout({
  title,
  description,
  steps,
  current,
  onStepClick,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  saving,
  secondaryAction,
}: WizardLayoutProps) {
  const isLast = current === steps.length - 1;
  const step = steps[current];

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-fg text-2xl font-semibold">{title}</h1>
        {description && <p className="text-fg-muted text-sm">{description}</p>}
      </header>

      {/* Descriptions are shown as the form heading below, so the stepper stays compact. */}
      <Stepper
        steps={steps.map(({ id, label }) => ({ id, label }))}
        current={current}
        onStepClick={onStepClick}
      />

      <form
        noValidate
        className="border-border bg-surface shadow-card grid gap-6 rounded-xl border p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!nextDisabled && !saving) onNext();
        }}
      >
        {step && (
          <div className="grid gap-1">
            <h2 className="text-fg text-lg font-semibold">{step.label}</h2>
            {step.description && <p className="text-fg-muted text-sm">{step.description}</p>}
          </div>
        )}

        {children}

        <div className="border-border flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {current > 0 && onBack && (
              <Button
                variant="secondary"
                onClick={onBack}
                disabled={saving}
                leftIcon={<ArrowLeft />}
              >
                Back
              </Button>
            )}
            {secondaryAction}
          </div>
          <Button
            type="submit"
            loading={saving}
            disabled={nextDisabled}
            rightIcon={isLast ? undefined : <ArrowRight />}
          >
            {nextLabel ?? (isLast ? 'Submit' : 'Continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}
