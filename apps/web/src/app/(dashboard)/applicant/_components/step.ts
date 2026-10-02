'use client';

import { useEffect } from 'react';
import type { ApplicantProfile } from '@/domains/applicant';
import type { ProfileLists } from '../../_components/applicants/lists';

/** Saves the step; resolves to the saved profile, or null to stay (errors are shown). */
export type StepSave = () => Promise<ApplicantProfile | null>;

export interface StepProps {
  profile: ApplicantProfile | null;
  lists: ProfileLists;
  /** The wizard calls the bound function when the applicant presses Continue. */
  bindSave: (save: StepSave) => void;
}

/** Keeps the wizard's Continue button pointed at this step's latest save function. */
export function useStepSave(bindSave: StepProps['bindSave'], save: StepSave) {
  // Block body on purpose: a returned value would become the effect's cleanup.
  useEffect(() => {
    bindSave(save);
  });
}

/** Empty strings from inputs become null; numbers are parsed. */
export const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim());
export const numberOrNull = (value: string) =>
  value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value);
