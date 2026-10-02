import { branchOptionsQuery } from '@jobbank/shared';
import { myBranchOptions } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';

/** GET /api/v1/applicants/me/branch-options?lat&lng — active branches, nearest first. */
export const GET = apiHandler({
  permission: 'applicant:self',
  query: branchOptionsQuery,
  handler: async ({ actor, query }) => ok(await myBranchOptions(actor!, query)),
});
