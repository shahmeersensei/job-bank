import { ApplicantListPage } from '../../_components/applicants/applicant-pages';

export const metadata = { title: 'Applicants' };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ApplicantListPage role="BRANCH_ADMIN" searchParams={searchParams} />;
}
