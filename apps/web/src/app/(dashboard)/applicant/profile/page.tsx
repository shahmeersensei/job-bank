import { getMyProfile, listApplicantDocumentTypes } from '@/domains/applicant';
import { requireRole } from '@/domains/auth';
import { resolveMatchRadius } from '@/domains/settings';
import { profileLists } from '../../_components/applicants/lists';
import { ProfileWizard } from '../_components/ProfileWizard';
import { WIZARD_STEPS } from '../_components/wizard-steps';

export const metadata = { title: 'My profile' };

export default async function ApplicantProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { actor } = await requireRole('APPLICANT');
  const [profile, lists, documentTypes, { step }] = await Promise.all([
    getMyProfile(actor),
    profileLists(actor),
    listApplicantDocumentTypes(),
    searchParams,
  ]);
  const radius = await resolveMatchRadius({ branchId: profile?.branch?.id ?? null });
  const stepIndex = Math.max(
    0,
    WIZARD_STEPS.findIndex((s) => s.id === step),
  );
  return (
    <ProfileWizard
      initialProfile={profile}
      initialStep={stepIndex}
      lists={lists}
      documentTypes={documentTypes}
      maxRadiusM={radius.maxM}
    />
  );
}
