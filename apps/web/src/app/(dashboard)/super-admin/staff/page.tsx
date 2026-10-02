import { StaffListPage } from '../../_components/staff/staff-pages';

export const metadata = { title: 'Staff' };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StaffListPage role="SUPER_ADMIN" searchParams={searchParams} />;
}
