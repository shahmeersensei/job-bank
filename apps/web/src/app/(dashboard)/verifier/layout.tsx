import type { ReactNode } from 'react';
import { RoleLayout } from '../_components/role-layout';

export default function VerifierLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="VERIFIER">{children}</RoleLayout>;
}
