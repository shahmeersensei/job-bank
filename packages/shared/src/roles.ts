/** PRD §4 user roles. Permissions per role are seeded in M3. */
export const ROLES = [
  'SUPER_ADMIN',
  'BRANCH_ADMIN',
  'VERIFIER',
  'STAFF',
  'EMPLOYER',
  'APPLICANT',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles whose authority is limited to the branch(es) they are assigned to. */
export const BRANCH_SCOPED_ROLES: readonly Role[] = ['BRANCH_ADMIN', 'VERIFIER', 'STAFF'];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  BRANCH_ADMIN: 'Branch Admin',
  VERIFIER: 'Verification Officer',
  STAFF: 'Job Bank Staff',
  EMPLOYER: 'Employer',
  APPLICANT: 'Applicant',
};

/** Must enrol an authenticator app before using the system (decided in M4). */
export const TWO_FACTOR_REQUIRED_ROLES: readonly Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN'];

/** Roles that manage staff accounts and can be invited (applicants/employers self-register). */
export const INTERNAL_ROLES: readonly Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'VERIFIER', 'STAFF'];
