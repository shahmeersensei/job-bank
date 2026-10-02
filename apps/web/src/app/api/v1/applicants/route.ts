import { APPLICANT_SORTABLE, applicantFilters, listApplicants } from '@/domains/applicant';
import { apiHandler, ok } from '@/domains/shared/http';
import { parseListQuery } from '@/domains/shared/pagination';

/**
 * GET /api/v1/applicants — staff search, branch-scoped (?q name/CNIC/phone, status,
 * identityStatus, branchId, cityCode, areaCode, skillCode, sort, page).
 */
export const GET = apiHandler({
  permission: 'applicant:read',
  handler: async ({ actor, request }) => {
    const query = parseListQuery(new URL(request.url).searchParams, {
      sortable: APPLICANT_SORTABLE,
      defaultSort: { field: 'createdAt', direction: 'desc' },
      filters: applicantFilters,
    });
    const { data, meta } = await listApplicants(actor!, query);
    return ok(data, meta);
  },
});
