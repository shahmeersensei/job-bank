import {
  BRANCH_SCOPED_ROLES,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLES,
} from '@jobbank/shared';
import { and, eq, notInArray } from 'drizzle-orm';
import type { Database } from '../client';
import { permissions, rolePermissions, roles } from '../schema';
import type { SeedStep } from '../scripts/seed';

/** Syncs roles + permissions from @jobbank/shared (adds, updates and removes). Safe in production. */
export const referenceData: SeedStep = {
  name: 'roles & permissions',
  async run(db: Database) {
    await db.transaction(async (tx) => {
      for (const code of ROLES) {
        await tx
          .insert(roles)
          .values({
            code,
            name: ROLE_LABELS[code],
            isBranchScoped: BRANCH_SCOPED_ROLES.includes(code),
          })
          .onConflictDoUpdate({
            target: roles.code,
            set: { name: ROLE_LABELS[code], isBranchScoped: BRANCH_SCOPED_ROLES.includes(code) },
          });
      }
      for (const [code, description] of Object.entries(PERMISSIONS)) {
        await tx
          .insert(permissions)
          .values({ code, description })
          .onConflictDoUpdate({ target: permissions.code, set: { description } });
      }
      for (const role of ROLES) {
        const granted = [...ROLE_PERMISSIONS[role]];
        await tx
          .delete(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleCode, role),
              notInArray(rolePermissions.permissionCode, granted),
            ),
          );
        await tx
          .insert(rolePermissions)
          .values(granted.map((permissionCode) => ({ roleCode: role, permissionCode })))
          .onConflictDoNothing();
      }
      await tx.delete(permissions).where(notInArray(permissions.code, Object.keys(PERMISSIONS)));
    });
  },
};
