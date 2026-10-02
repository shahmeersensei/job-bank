import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="EMPLOYER">{children}</RoleLayout>;
}
