import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="STAFF">{children}</RoleLayout>;
}
