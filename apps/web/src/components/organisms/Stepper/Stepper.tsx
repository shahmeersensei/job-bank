'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StepperProps } from './stepper.types';

export function Stepper({ steps, current, onStepClick, className }: StepperProps) {
  const active = steps[current];
  const percent = steps.length > 1 ? Math.round((current / (steps.length - 1)) * 100) : 100;
  // Long wizards (e.g. the 7-step applicant profile): only the current step shows its label,
  // so the markers still fit; the other labels stay available to screen readers and on hover.
  const dense = steps.length > 5;

  return (
    <nav aria-label="Progress" className={cn('@container', className)}>
      {/* Narrow containers: compact summary + progress bar (container query, not viewport). */}
      <div className="grid gap-2 @2xl:hidden">
        <p className="text-fg-muted text-sm">
          Step <span className="text-fg numeric font-semibold">{current + 1}</span> of{' '}
          <span className="numeric">{steps.length}</span>
          {active && (
            <>
              {' '}
              · <span className="text-fg font-medium">{active.label}</span>
            </>
          )}
        </p>
        <div className="bg-surface-sunken h-1.5 overflow-hidden rounded-full" aria-hidden="true">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start @2xl:flex">
        {steps.map((step, index) => {
          const status = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
          const clickable = status === 'complete' && onStepClick;
          const marker = (
            <span
              className={cn(
                'numeric grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold',
                status === 'complete' && 'border-primary bg-primary text-primary-fg',
                status === 'current' && 'border-primary bg-surface text-primary-soft-fg',
                status === 'upcoming' && 'border-border-strong bg-surface text-fg-subtle',
              )}
              aria-hidden="true"
              title={dense ? step.label : undefined}
            >
              {status === 'complete' ? <Check className="size-4" strokeWidth={3} /> : index + 1}
            </span>
          );
          const text = (
            <span
              className={cn(
                'grid min-w-0 gap-0.5 text-start',
                dense && status !== 'current' && 'sr-only',
              )}
            >
              <span
                className={cn(
                  'text-sm font-medium break-words',
                  status === 'upcoming' ? 'text-fg-muted' : 'text-fg',
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-fg-subtle text-xs">{step.description}</span>
              )}
              <span className="sr-only">
                {status === 'complete'
                  ? '(completed)'
                  : status === 'current'
                    ? '(current step)'
                    : ''}
              </span>
            </span>
          );

          return (
            <li
              key={step.id}
              aria-current={status === 'current' ? 'step' : undefined}
              className="flex min-w-0 flex-1 items-start gap-3 last:flex-none"
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(index)}
                  className="focus-visible:focus-ring flex min-w-0 items-start gap-3 rounded-md"
                >
                  {marker}
                  {text}
                </button>
              ) : (
                <div className="flex min-w-0 items-start gap-3">
                  {marker}
                  {text}
                </div>
              )}
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    'mx-2 mt-4 h-0.5 min-w-6 flex-1',
                    index < current ? 'bg-primary' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
