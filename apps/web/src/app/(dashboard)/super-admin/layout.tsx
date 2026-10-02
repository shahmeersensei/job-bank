import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="SUPER_ADMIN">{children}</RoleLayout>;
}
