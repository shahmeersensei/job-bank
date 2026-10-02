import { permissionsFor, type Role } from '@jobbank/shared';
import type { Actor } from '@/domains/shared/scope';

/** Builds an Actor whose permissions always match its roles (same as production). */
export function makeActor(
  overrides: Partial<Omit<Actor, 'permissions'>> & { roles?: readonly Role[] } = {},
): Actor {
  const roles = overrides.roles ?? ['STAFF'];
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    branchIds: [],
    activeBranchId: null,
    companyId: null,
    applicantId: null,
    twoFactorPending: false,
    ...overrides,
    roles,
    permissions: permissionsFor(roles),
  };
}
