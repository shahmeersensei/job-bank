import { StaffDetailPage } from '../../../_components/staff/staff-pages';

export const metadata = { title: 'Staff member' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffDetailPage role="SUPER_ADMIN" basePath="/super-admin/staff" params={params} />;
}
