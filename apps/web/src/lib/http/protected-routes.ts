/** Dashboard areas that need a session (role checks happen in each area's layout). */
export const PROTECTED_PREFIXES = [
  '/super-admin',
  '/branch-admin',
  '/verifier',
  '/staff',
  '/employer',
  '/applicant',
  '/account',
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
