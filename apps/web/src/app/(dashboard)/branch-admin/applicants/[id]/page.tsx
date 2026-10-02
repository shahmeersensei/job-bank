import { ApplicantDetailPage } from '../../../_components/applicants/applicant-pages';

export const metadata = { title: 'Applicant' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ApplicantDetailPage role="BRANCH_ADMIN" basePath="/branch-admin/applicants" params={params} />
  );
}
