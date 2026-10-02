import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function BranchAdminLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="BRANCH_ADMIN">{children}</RoleLayout>;
}
