import { createBranch, createBranchSchema, listBranches } from '@/domains/branch';
import { apiHandler, created, ok } from '@/domains/shared/http';

/** GET /api/v1/branches — branches visible to the caller (scoped). */
export const GET = apiHandler({
  permission: 'branch:read',
  handler: async ({ actor }) => ok(await listBranches(actor!)),
});

/** POST /api/v1/branches — Super Admin creates a branch (Idempotency-Key required). */
export const POST = apiHandler({
  permission: 'branch:manage',
  idempotent: true,
  body: createBranchSchema,
  handler: async ({ ctx, actor, body }) => {
    const branch = await createBranch({ ...ctx, actor: actor! }, body);
    return created(branch, `/api/v1/branches/${branch.id}`);
  },
});
