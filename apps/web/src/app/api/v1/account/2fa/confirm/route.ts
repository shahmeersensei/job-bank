import { sixDigitCodeSchema } from '@jobbank/shared';
import { z } from 'zod';
import { confirmTwoFactorEnrollment } from '@/domains/auth';
import { apiHandler } from '@/domains/shared/http';

/** POST /api/v1/account/2fa/confirm — first code from the app turns two-factor on. */
export const POST = apiHandler({
  allowTwoFactorPending: true,
  body: z.object({ code: sixDigitCodeSchema }),
  handler: async ({ ctx, actor, body, request }) => {
    const cookies = await confirmTwoFactorEnrollment(
      { ...ctx, actor: actor! },
      body.code,
      request.headers,
    );
    return { status: 200, data: { twoFactorEnabled: true }, cookies };
  },
});
