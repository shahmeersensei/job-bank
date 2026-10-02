import { PgDialect } from 'drizzle-orm/pg-core';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { makeActor } from '@/test/factories';
import { ScopeViolationError } from '../errors';
import {
  assertBranchAccess,
  branchScope,
  canAccessBranch,
  visibleBranches,
  type Actor,
} from './scope';

const jobs = pgTable('jobs', {
  id: uuid().primaryKey(),
  branchId: uuid('branch_id'),
  title: text(),
});
const dialect = new PgDialect();
const render = (sql: ReturnType<typeof branchScope>) => {
  if (!sql) return undefined;
  const { sql: text, params } = dialect.sqlToQuery(sql);
  return { sql: text, params };
};

const actor = (overrides: Parameters<typeof makeActor>[0]): Actor =>
  makeActor({ userId: 'u-1', roles: ['STAFF'], branchIds: ['b-1'], ...overrides });

describe('branch scoping (PRD rule 1)', () => {
  it('restricts branch staff to their branches', () => {
    const staff = actor({ branchIds: ['b-1', 'b-2'] });
    expect(render(branchScope(staff, jobs.branchId))).toEqual({
      sql: '"jobs"."branch_id" in ($1, $2)',
      params: ['b-1', 'b-2'],
    });
    expect(canAccessBranch(staff, 'b-2')).toBe(true);
    expect(canAccessBranch(staff, 'b-9')).toBe(false);
    expect(() => assertBranchAccess(staff, 'b-9')).toThrow(ScopeViolationError);
    expect(() => assertBranchAccess(staff, null)).toThrow(ScopeViolationError);
  });

  it('gives an actor with no branches nothing — never everything', () => {
    expect(render(branchScope(actor({ branchIds: [] }), jobs.branchId))).toEqual({
      sql: 'false',
      params: [],
    });
  });

  it('lets Super Admin see all branches, or only the one picked in the switcher', () => {
    const superAdmin = actor({ roles: ['SUPER_ADMIN'], branchIds: [] });
    expect(visibleBranches(superAdmin)).toBe('all');
    expect(branchScope(superAdmin, jobs.branchId)).toBeUndefined();
    const switched = actor({ roles: ['SUPER_ADMIN'], branchIds: [], activeBranchId: 'b-7' });
    expect(render(branchScope(switched, jobs.branchId))).toEqual({
      sql: '"jobs"."branch_id" in ($1)',
      params: ['b-7'],
    });
  });

  it('ignores activeBranchId for non-super-admins', () => {
    expect(visibleBranches(actor({ activeBranchId: 'b-99' }))).toEqual(['b-1']);
  });
});
