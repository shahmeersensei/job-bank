import type { Permission, Role } from '@jobbank/shared';
import { inArray, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ForbiddenError, ScopeViolationError } from '../errors';

/**
 * The authenticated user as seen by domain code. Built from the session in M3.
 * Every repository method receives the Actor (via RequestContext) and must apply scope.
 */
export interface Actor {
  userId: string;
  roles: readonly Role[];
  /** Union of the permissions granted by all roles (see ROLE_PERMISSIONS). */
  permissions: ReadonlySet<Permission>;
  /** Branches this user is assigned to (branch-scoped roles). */
  branchIds: readonly string[];
  /** Super Admin's branch switcher; null = "all branches". Ignored for other roles. */
  activeBranchId: string | null;
  /** Employer users: the company they act for. */
  companyId: string | null;
  /** Applicant users: their applicant profile. */
  applicantId: string | null;
  /**
   * True for roles that require two-factor authentication (Super Admin, Branch Admin)
   * until an authenticator app is enrolled. The API refuses most calls meanwhile.
   */
  twoFactorPending: boolean;
}

export function hasRole(actor: Actor, ...roles: readonly Role[]): boolean {
  return actor.roles.some((role) => roles.includes(role));
}

export function hasPermission(actor: Actor, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

export function assertPermission(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor, permission)) throw new ForbiddenError();
}

export function isSuperAdmin(actor: Actor): boolean {
  return actor.roles.includes('SUPER_ADMIN');
}

export function assertRole(actor: Actor, ...roles: readonly Role[]): void {
  if (!hasRole(actor, ...roles)) throw new ForbiddenError();
}

/** Branches the actor may see right now, or 'all' for an unrestricted Super Admin. */
export function visibleBranches(actor: Actor): readonly string[] | 'all' {
  if (isSuperAdmin(actor)) return actor.activeBranchId ? [actor.activeBranchId] : 'all';
  return actor.branchIds;
}

export function canAccessBranch(actor: Actor, branchId: string | null | undefined): boolean {
  if (isSuperAdmin(actor)) return true;
  return branchId != null && actor.branchIds.includes(branchId);
}

/**
 * Throws ScopeViolationError (403) when a record belongs to another branch. The API layer
 * writes an `access.scope_violation` audit row for every such attempt.
 */
export function assertBranchAccess(
  actor: Actor,
  branchId: string | null | undefined,
  target: { entityType: string; entityId?: string } = {
    entityType: 'branch',
    entityId: branchId ?? undefined,
  },
): void {
  if (!canAccessBranch(actor, branchId)) {
    throw new ScopeViolationError(undefined, { ...target, branchId: branchId ?? null });
  }
}

/**
 * WHERE condition restricting `column` (a branch_id column) to the actor's branches.
 * Never returns "no condition" for non-super-admins: an actor with no branches sees nothing.
 */
export function branchScope(actor: Actor, column: AnyPgColumn): SQL | undefined {
  const branches = visibleBranches(actor);
  if (branches === 'all') return undefined;
  if (branches.length === 0) return sql`false`;
  return inArray(column, [...branches]);
}
