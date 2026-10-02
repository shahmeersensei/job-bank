'use client';

import { ROLE_LABELS, type Role } from '@jobbank/shared';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { toast } from '@/components/molecules';
import { DashboardLayout } from '@/components/templates';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { navigationFor } from './navigation';
import { useSignOut } from './SignOutButton';

const ALL_BRANCHES = '__all__';

export interface RoleShellProps {
  role: Role;
  user: { name: string };
  /** Branch names shown in the sidebar footer. */
  branchNames: string[];
  /** Super Admin only: every branch, for the scope switcher. */
  switchableBranches?: { id: string; name: string }[];
  activeBranchId?: string | null;
  /** Applicants have no password/2FA settings. */
  showSecurity?: boolean;
  children: ReactNode;
}

export function RoleShell({
  role,
  user,
  branchNames,
  switchableBranches,
  activeBranchId,
  showSecurity = true,
  children,
}: RoleShellProps) {
  const router = useRouter();
  const signOut = useSignOut();

  const switchBranch = async (value: string) => {
    try {
      await apiFetch('/api/v1/auth/scope', {
        method: 'PUT',
        body: { branchId: value === ALL_BRANCHES ? null : value },
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not switch branch');
    }
  };

  return (
    <DashboardLayout
      navigation={navigationFor(role)}
      sidebarFooter={
        <p className="text-fg-subtle px-3 text-xs">
          {switchableBranches
            ? 'All branches (oversight)'
            : branchNames.join(' · ') || ROLE_LABELS[role]}
        </p>
      }
      topBar={{
        user: { name: user.name, role: ROLE_LABELS[role] },
        userMenuItems: [
          ...(showSecurity
            ? [
                {
                  label: 'Security',
                  icon: ShieldCheck,
                  onSelect: () => router.push('/account/security'),
                },
              ]
            : []),
          {
            label: 'Sign out',
            icon: LogOut,
            tone: 'danger' as const,
            onSelect: () => void signOut(),
          },
        ],
        branchSwitcher: switchableBranches
          ? {
              branches: [{ id: ALL_BRANCHES, name: 'All branches' }, ...switchableBranches],
              value: activeBranchId ?? ALL_BRANCHES,
              onChange: (id) => void switchBranch(id),
            }
          : undefined,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
