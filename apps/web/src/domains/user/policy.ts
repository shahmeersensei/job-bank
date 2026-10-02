import { BRANCH_SCOPED_ROLES, INTERNAL_ROLES, type Role } from '@jobbank/shared';
import { hasPermission, isSuperAdmin, type Actor } from '@/domains/shared/scope';

export interface Assignment {
  role: Role;
  branchId: string | null;
}

/** Roles a Branch Admin may hand out, and only inside their own branch. */
export const BRANCH_ADMIN_GRANTABLE: readonly Role[] = ['VERIFIER', 'STAFF'];

/** true, or the reason the actor may not grant `role` at `branchId`. */
export function canGrantRole(actor: Actor, role: Role, branchId: string | null): true | string {
  if (!hasPermission(actor, 'user:manage')) return 'You cannot manage staff accounts';
  if (!INTERNAL_ROLES.includes(role)) return 'Only staff roles can be assigned here';
  const scoped = BRANCH_SCOPED_ROLES.includes(role);
  if (scoped && !branchId) return 'Choose the branch for this role';
  if (!scoped && branchId) return 'This role is not tied to a branch';
  if (isSuperAdmin(actor)) return true;
  if (!BRANCH_ADMIN_GRANTABLE.includes(role)) return 'Only a Super Admin can assign this role';
  if (!branchId || !actor.branchIds.includes(branchId)) {
    return 'You can only assign roles in your own branch';
  }
  return true;
}

/** Whether the actor can see this staff account at all. */
export function canSeeUser(actor: Actor, target: readonly Assignment[]): boolean {
  if (isSuperAdmin(actor)) return true;
  if (!hasPermission(actor, 'user:read')) return false;
  return target.some((a) => a.branchId !== null && actor.branchIds.includes(a.branchId));
}

/**
 * Whether the actor can change this account (status, profile, invitation, 2FA reset).
 * Branch Admins manage only Verifiers/Staff whose every role is inside their branches.
 */
export function canManageUser(
  actor: Actor,
  targetUserId: string,
  target: readonly Assignment[],
): true | string {
  if (!hasPermission(actor, 'user:manage')) return 'You cannot manage staff accounts';
  if (targetUserId === actor.userId) return 'You cannot change your own account here';
  if (isSuperAdmin(actor)) return true;
  const manageable =
    target.length > 0 &&
    target.every(
      (a) =>
        BRANCH_ADMIN_GRANTABLE.includes(a.role) &&
        a.branchId !== null &&
        actor.branchIds.includes(a.branchId),
    );
  return manageable ? true : 'Only a Super Admin can change this account';
}
