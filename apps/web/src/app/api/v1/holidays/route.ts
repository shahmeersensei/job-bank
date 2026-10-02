import {
  createHoliday,
  createHolidaySchema,
  listHolidays,
  listHolidaysQuery,
} from '@/domains/settings';
import { apiHandler, created, ok } from '@/domains/shared/http';

/** GET /api/v1/holidays?year=2026 — public holidays used for working-day SLAs. */
export const GET = apiHandler({
  query: listHolidaysQuery,
  handler: async ({ query }) => ok(await listHolidays(query)),
});

/** POST /api/v1/holidays — Super Admin adds a holiday (Idempotency-Key required). */
export const POST = apiHandler({
  permission: 'master_data:manage',
  idempotent: true,
  body: createHolidaySchema,
  handler: async ({ ctx, actor, body }) => {
    const holiday = await createHoliday({ ...ctx, actor: actor! }, body);
    return created(holiday, `/api/v1/holidays/${holiday.id}`);
  },
});
