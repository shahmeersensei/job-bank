import { z } from 'zod';

export const dependencyStatusSchema = z.object({
  status: z.enum(['up', 'down', 'disabled']),
  latencyMs: z.number().nonnegative().optional(),
  detail: z.string().optional(),
});

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  time: z.iso.datetime(),
  dependencies: z.object({
    database: dependencyStatusSchema,
    postgis: dependencyStatusSchema,
    storage: dependencyStatusSchema,
    redis: dependencyStatusSchema,
  }),
});

export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
