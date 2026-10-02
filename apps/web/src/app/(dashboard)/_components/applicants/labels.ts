import {
  APPLICANT_STATUS_LABELS,
  IDENTITY_STATUS_LABELS,
  type ApplicantDocumentStatus,
  type ApplicantStatus,
  type IdentityStatus,
} from '@jobbank/shared';
import type { Tone } from '@/design-system/tokens';

type Pill = { label: string; tone: Tone };

export const APPLICANT_STATUS_PILL: Record<ApplicantStatus, Pill> = {
  DRAFT: { label: APPLICANT_STATUS_LABELS.DRAFT, tone: 'warning' },
  ACTIVE: { label: APPLICANT_STATUS_LABELS.ACTIVE, tone: 'success' },
  INACTIVE: { label: APPLICANT_STATUS_LABELS.INACTIVE, tone: 'neutral' },
  RESTRICTED: { label: APPLICANT_STATUS_LABELS.RESTRICTED, tone: 'danger' },
};

export const IDENTITY_PILL: Record<IdentityStatus, Pill> = {
  UNVERIFIED: { label: IDENTITY_STATUS_LABELS.UNVERIFIED, tone: 'neutral' },
  VERIFIED: { label: IDENTITY_STATUS_LABELS.VERIFIED, tone: 'success' },
  REJECTED: { label: IDENTITY_STATUS_LABELS.REJECTED, tone: 'danger' },
};

export const DOCUMENT_STATUS_PILL: Partial<Record<ApplicantDocumentStatus, Pill>> = {
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Not accepted', tone: 'danger' },
};
