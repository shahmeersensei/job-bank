import 'server-only';
import { schema } from '@jobbank/db';
import { RADIUS_LIMITS, type RadiusValue, type ResolvedRadius } from '@jobbank/shared';
import { and, asc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { runCommand, type CommandScope, type RequestContext } from '@/domains/shared/audit';
import { ForbiddenError, NotFoundError, ValidationError } from '@/domains/shared/errors';
import {
  assertBranchAccess,
  assertPermission,
  branchScope,
  isSuperAdmin,
  type Actor,
} from '@/domains/shared/scope';
import { db, type DbExecutor } from '@/lib/db';
import { formatDistance } from '@/lib/format/distance';
import { resolveRadius } from './radius-resolution';

type SignedIn = RequestContext & { actor: Actor };

const p = schema.matchRadiusPolicies;

/** What a policy write targets. JOB scope arrives with jobs in M8. */
export const radiusTargetSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('GLOBAL') }),
  z.object({ scope: z.literal('BRANCH'), branchId: z.uuid() }),
  z.object({ scope: z.literal('CATEGORY'), categoryId: z.uuid() }),
]);
export type RadiusTarget = z.infer<typeof radiusTargetSchema>;

export interface RadiusPolicyView extends RadiusValue {
  id: string;
  scope: 'GLOBAL' | 'BRANCH' | 'CATEGORY';
  branchId: string | null;
  categoryId: string | null;
  /** Branch or category name, for display. */
  label: string;
  updatedAt: Date;
}

export interface RadiusOverview {
  global: RadiusValue;
  branches: RadiusPolicyView[];
  categories: RadiusPolicyView[];
}

function targetWhere(target: RadiusTarget) {
  switch (target.scope) {
    case 'GLOBAL':
      return eq(p.scope, 'GLOBAL');
    case 'BRANCH':
      return eq(p.branchId, target.branchId);
    case 'CATEGORY':
      return eq(p.categoryId, target.categoryId);
  }
}

/** The global radius (always present; PRD defaults if the row were ever missing). */
export async function globalPolicy(executor: DbExecutor = db): Promise<RadiusValue> {
  const [row] = await executor
    .select({ preferredM: p.preferredM, maxM: p.maxM })
    .from(p)
    .where(eq(p.scope, 'GLOBAL'));
  return row ?? { preferredM: RADIUS_LIMITS.defaultPreferredM, maxM: RADIUS_LIMITS.defaultMaxM };
}

/**
 * The radius that applies to a match (PRD rule 4): job → category → branch → global, capped
 * by the global max. M9 matching and M10 referral guards call this.
 */
export async function resolveMatchRadius(context: {
  branchId?: string | null;
  categoryId?: string | null;
}): Promise<ResolvedRadius> {
  const conditions = [eq(p.scope, 'GLOBAL')];
  if (context.branchId) conditions.push(eq(p.branchId, context.branchId));
  if (context.categoryId) conditions.push(eq(p.categoryId, context.categoryId));
  const rows = await db
    .select({ scope: p.scope, preferredM: p.preferredM, maxM: p.maxM })
    .from(p)
    .where(or(...conditions));
  return resolveRadius(
    Object.fromEntries(rows.map((r) => [r.scope, { preferredM: r.preferredM, maxM: r.maxM }])),
  );
}

export const previewRadiusQuery = z.object({
  branchId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});

/** Settings-page preview of resolution: which radius would apply to this branch + category. */
export async function previewRadius(
  actor: Actor,
  query: z.infer<typeof previewRadiusQuery>,
): Promise<ResolvedRadius> {
  assertPermission(actor, 'settings:manage');
  if (query.branchId) assertBranchAccess(actor, query.branchId);
  return resolveMatchRadius(query);
}

/** Effective radius per branch (branch policy, else global), for branch lists and forms. */
export async function branchRadii(
  branchIds: readonly string[],
): Promise<Map<string, ResolvedRadius>> {
  if (branchIds.length === 0) return new Map();
  const [global, rows] = await Promise.all([
    globalPolicy(),
    db
      .select({ branchId: p.branchId, preferredM: p.preferredM, maxM: p.maxM })
      .from(p)
      .where(inArray(p.branchId, [...branchIds])),
  ]);
  const byBranch = new Map(rows.map((r) => [r.branchId!, r]));
  return new Map(
    branchIds.map((id) => [id, resolveRadius({ GLOBAL: global, BRANCH: byBranch.get(id) })]),
  );
}

/** Global value plus the branch (scoped) and category overrides, for the settings pages. */
export async function getRadiusOverview(actor: Actor): Promise<RadiusOverview> {
  const b = schema.branches;
  const md = schema.masterData;
  const [global, branches, categories] = await Promise.all([
    globalPolicy(),
    db
      .select({
        id: p.id,
        scope: p.scope,
        branchId: p.branchId,
        categoryId: p.categoryId,
        preferredM: p.preferredM,
        maxM: p.maxM,
        updatedAt: p.updatedAt,
        label: b.name,
      })
      .from(p)
      .innerJoin(b, eq(b.id, p.branchId))
      .where(and(isNotNull(p.branchId), branchScope(actor, p.branchId)))
      .orderBy(asc(b.name)),
    db
      .select({
        id: p.id,
        scope: p.scope,
        branchId: p.branchId,
        categoryId: p.categoryId,
        preferredM: p.preferredM,
        maxM: p.maxM,
        updatedAt: p.updatedAt,
        label: md.label,
      })
      .from(p)
      .innerJoin(md, eq(md.id, p.categoryId))
      .orderBy(asc(md.label)),
  ]);
  return {
    global,
    branches: branches as RadiusPolicyView[],
    categories: categories as RadiusPolicyView[],
  };
}

/** Who may change which policy: global/category = Super Admin; branch = its admins too. */
function assertCanEdit(actor: Actor, target: RadiusTarget): void {
  assertPermission(actor, 'settings:manage');
  if (target.scope === 'BRANCH') {
    assertBranchAccess(actor, target.branchId, {
      entityType: 'match_radius_policy',
      entityId: target.branchId,
    });
    return;
  }
  if (!isSuperAdmin(actor)) {
    throw new ForbiddenError('Only Super Admin changes global and category radius');
  }
}

async function assertTargetExists(executor: DbExecutor, target: RadiusTarget): Promise<void> {
  if (target.scope === 'BRANCH') {
    const [row] = await executor
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(eq(schema.branches.id, target.branchId));
    if (!row) throw new NotFoundError('Branch', target.branchId);
  }
  if (target.scope === 'CATEGORY') {
    const md = schema.masterData;
    const [row] = await executor
      .select({ type: md.type, isActive: md.isActive })
      .from(md)
      .where(eq(md.id, target.categoryId));
    if (!row || row.type !== 'JOB_CATEGORY')
      throw new NotFoundError('Job category', target.categoryId);
  }
}

const auditTarget = (target: RadiusTarget) => ({
  entityType: 'match_radius_policy',
  entityId:
    target.scope === 'GLOBAL'
      ? 'GLOBAL'
      : target.scope === 'BRANCH'
        ? target.branchId
        : target.categoryId,
  branchId: target.scope === 'BRANCH' ? target.branchId : null,
  metadata: { scope: target.scope },
});

/**
 * Writes one policy inside an open command. Overrides must stay within the global max
 * ("Branch Admin can override within global limits"); the DB CHECK enforces 10 km.
 */
export async function writeRadiusPolicy(
  { tx, ctx, audit }: CommandScope,
  target: RadiusTarget,
  value: RadiusValue,
): Promise<void> {
  await assertTargetExists(tx, target);
  if (target.scope !== 'GLOBAL') {
    const global = await globalPolicy(tx);
    if (value.maxM > global.maxM) {
      throw new ValidationError([
        {
          path: 'maxM',
          message: `Must be within the global maximum of ${formatDistance(global.maxM)}`,
        },
      ]);
    }
  }
  const [before] = await tx
    .select({ preferredM: p.preferredM, maxM: p.maxM })
    .from(p)
    .where(targetWhere(target));
  const userId = ctx.actor?.userId ?? null;
  if (before) {
    await tx
      .update(p)
      .set({ preferredM: value.preferredM, maxM: value.maxM, updatedBy: userId })
      .where(targetWhere(target));
  } else {
    await tx.insert(p).values({
      scope: target.scope,
      branchId: target.scope === 'BRANCH' ? target.branchId : null,
      categoryId: target.scope === 'CATEGORY' ? target.categoryId : null,
      preferredM: value.preferredM,
      maxM: value.maxM,
      updatedBy: userId,
    });
  }
  audit({
    action: before ? 'radius_policy.update' : 'radius_policy.create',
    ...auditTarget(target),
    before: before ?? null,
    after: { preferredM: value.preferredM, maxM: value.maxM },
  });
}

/** Removes a branch or category override, so it inherits again (audited even if absent). */
export async function deleteRadiusPolicy(
  { tx, audit }: CommandScope,
  target: Exclude<RadiusTarget, { scope: 'GLOBAL' }>,
): Promise<boolean> {
  const [removed] = await tx
    .delete(p)
    .where(targetWhere(target))
    .returning({ preferredM: p.preferredM, maxM: p.maxM });
  audit({ action: 'radius_policy.delete', ...auditTarget(target), before: removed ?? null });
  return Boolean(removed);
}

export async function setRadiusPolicy(
  ctx: SignedIn,
  target: RadiusTarget,
  value: RadiusValue,
): Promise<void> {
  assertCanEdit(ctx.actor, target);
  await runCommand(ctx, (cmd) => writeRadiusPolicy(cmd, target, value));
}

export async function clearRadiusPolicy(
  ctx: SignedIn,
  target: Exclude<RadiusTarget, { scope: 'GLOBAL' }>,
): Promise<void> {
  assertCanEdit(ctx.actor, target);
  await runCommand(ctx, (cmd) => deleteRadiusPolicy(cmd, target));
}

/** Overrides above a (lowered) global max are capped at resolution time; flag them in the UI. */
export function exceedsGlobal(policy: RadiusValue, global: RadiusValue): boolean {
  return policy.maxM > global.maxM;
}
