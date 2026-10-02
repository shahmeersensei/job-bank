import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function ApplicantLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="APPLICANT">{children}</RoleLayout>;
}
