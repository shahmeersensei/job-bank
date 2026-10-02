import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { apiHandler } from '@/domains/shared/http';
import { sqlClient } from '@/lib/db';
import { env } from '@/lib/env';
import { runHealthChecks } from '@/lib/health/checks';
import { getRedis } from '@/lib/redis/client';
import { s3, S3_BUCKET } from '@/lib/s3/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Raw (un-enveloped) body on purpose: load balancers and uptime monitors read it directly.
export const GET = apiHandler({
  auth: 'public',
  handler: async () => {
    const redis = getRedis();
    const result = await runHealthChecks(
      {
        database: async () => {
          await sqlClient`SELECT 1`;
        },
        postgis: async () => {
          const [row] = await sqlClient<
            { version: string }[]
          >`SELECT postgis_lib_version() AS version`;
          return row?.version;
        },
        storage: async () => {
          await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
        },
        redis: redis
          ? async () => {
              await redis.ping();
            }
          : null,
      },
      { version: process.env.APP_VERSION ?? '0.0.0', exposeErrors: env.NODE_ENV !== 'production' },
    );
    return Response.json(result, { status: result.status === 'ok' ? 200 : 503 });
  },
});
