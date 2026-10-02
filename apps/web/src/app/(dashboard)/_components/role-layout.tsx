import { ROLE_PRIORITY, type Role } from '@jobbank/shared';
import type { ReactNode } from 'react';
import { describeMe, requireRole, requireSignedIn } from '@/domains/auth';
import { listBranches } from '@/domains/branch';
import { RoleShell } from './RoleShell';

async function Shell({
  role,
  state,
  children,
}: {
  role: Role;
  state: Awaited<ReturnType<typeof requireSignedIn>>;
  children: ReactNode;
}) {
  const { user, actor } = state;
  const me = await describeMe(user, actor);
  const switchable =
    role === 'SUPER_ADMIN' && !actor.twoFactorPending
      ? (await listBranches({ ...actor, activeBranchId: null })).map((b) => ({
          id: b.id,
          name: b.name,
        }))
      : undefined;
  return (
    <RoleShell
      role={role}
      user={{ name: user.name }}
      branchNames={me.branches.map((b) => b.name)}
      switchableBranches={switchable}
      activeBranchId={actor.activeBranchId}
      showSecurity={!actor.roles.every((r) => r === 'APPLICANT')}
    >
      {children}
    </RoleShell>
  );
}

/** Server layout for a role area: authoritative session + role (+ 2FA) check, then the shell. */
export async function RoleLayout({ role, children }: { role: Role; children: ReactNode }) {
  const state = await requireRole(role);
  return (
    <Shell role={role} state={state}>
      {children}
    </Shell>
  );
}

/** Layout for pages any signed-in user can open (account settings), shown in their main role's shell. */
export async function AccountLayout({ children }: { children: ReactNode }) {
  const state = await requireSignedIn({ allowTwoFactorPending: true });
  const role = ROLE_PRIORITY.find((r) => state.actor.roles.includes(r)) ?? 'APPLICANT';
  return (
    <Shell role={role} state={state}>
      {children}
    </Shell>
  );
}
