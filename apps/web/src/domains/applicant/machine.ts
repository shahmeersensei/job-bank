import {
  APPLICANT_STATUSES,
  type ApplicantStatus,
  type ProfileSectionId,
  type Role,
} from '@jobbank/shared';
import { defineMachine } from '@/domains/shared/state-machine';

export type ApplicantEvent = 'ACTIVATE' | 'DEACTIVATE' | 'REACTIVATE';

export interface ApplicantMachineContext {
  /** Sections still blocking activation (from computeCompleteness). */
  activationMissing: readonly ProfileSectionId[];
}

const SECTION_NAMES: Record<ProfileSectionId, string> = {
  personal: 'personal details',
  location: 'home location and branch',
  skills: 'skills',
  education: 'education',
  experience: 'work experience',
  preferences: 'job preferences',
  documents: 'required documents (CNIC front and back)',
  languages: 'languages',
};

/**
 * Applicant profile lifecycle: DRAFT → ACTIVE (automatically, once personal details, the
 * location pin + branch and the required documents are in) ⇄ INACTIVE. RESTRICTED is set by
 * the blacklist module (M14). Only ACTIVE profiles with a pin can be matched (M9).
 */
export const applicantMachine = defineMachine<
  ApplicantStatus,
  ApplicantEvent,
  ApplicantMachineContext,
  Role
>({
  name: 'applicant profile',
  states: APPLICANT_STATUSES,
  transitions: [
    {
      from: 'DRAFT',
      event: 'ACTIVATE',
      to: 'ACTIVE',
      guard: ({ activationMissing }) =>
        activationMissing.length === 0 ||
        `Complete your ${activationMissing.map((id) => SECTION_NAMES[id]).join(', ')} first`,
    },
    {
      from: 'ACTIVE',
      event: 'DEACTIVATE',
      to: 'INACTIVE',
      actors: ['APPLICANT', 'STAFF', 'BRANCH_ADMIN'],
    },
    {
      from: 'INACTIVE',
      event: 'REACTIVATE',
      to: 'ACTIVE',
      actors: ['APPLICANT', 'STAFF', 'BRANCH_ADMIN'],
    },
  ],
});
