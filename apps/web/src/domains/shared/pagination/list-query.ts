import type { PaginationMeta } from '@jobbank/shared';
import { z } from 'zod';
import { ValidationError } from '../errors';
import { zodIssues } from '../errors/to-response';

export type SortDirection = 'asc' | 'desc';

export interface ListQuery<S extends string, F> {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  sort: { field: S; direction: SortDirection };
  /** Free-text search (trimmed), or undefined. */
  q: string | undefined;
  filters: F;
}

export interface ListQueryOptions<S extends string, F extends z.ZodRawShape> {
  /** Whitelist of sortable fields — anything else is rejected (never interpolate user input). */
  sortable: readonly S[];
  defaultSort: { field: S; direction: SortDirection };
  filters?: F;
  maxPageSize?: number;
  defaultPageSize?: number;
}

/** URLSearchParams → plain object; repeated keys become arrays (?status=a&status=b). */
export function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    out[key] = values.length > 1 ? values : (values[0] ?? '');
  }
  return out;
}

/**
 * PRD §8 "pagination + filtering standards": ?page=&pageSize=&sort=field:dir&q=&<filters>.
 * Unknown parameters are rejected so typos fail loudly instead of silently returning everything.
 */
export function parseListQuery<S extends string, F extends z.ZodRawShape = Record<string, never>>(
  params: URLSearchParams,
  options: ListQueryOptions<S, F>,
): ListQuery<S, z.infer<z.ZodObject<F>>> {
  const maxPageSize = options.maxPageSize ?? 100;
  const sortPattern = new RegExp(
    `^(${options.sortable.map((s) => s.replace(/[^\w]/g, '')).join('|')}):(asc|desc)$`,
  );

  const schema = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(maxPageSize)
        .default(options.defaultPageSize ?? 20),
      sort: z
        .string()
        .regex(
          sortPattern,
          `sort must be one of ${options.sortable.map((s) => `${s}:asc|desc`).join(', ')}`,
        )
        .optional(),
      q: z
        .string()
        .trim()
        .max(200)
        .optional()
        .transform((v) => (v ? v : undefined)),
      ...(options.filters ?? ({} as F)),
    })
    .strict();

  const parsed = schema.safeParse(searchParamsToObject(params));
  if (!parsed.success)
    throw new ValidationError(zodIssues(parsed.error), 'Invalid list parameters');

  const { page, pageSize, sort, q, ...filters } = parsed.data as {
    page: number;
    pageSize: number;
    sort?: string;
    q?: string;
  } & Record<string, unknown>;

  const [field, direction] = sort
    ? (sort.split(':') as [S, SortDirection])
    : [options.defaultSort.field, options.defaultSort.direction];

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    sort: { field, direction },
    q,
    filters: filters as z.infer<z.ZodObject<F>>,
  };
}

export function paginationMeta(
  query: { page: number; pageSize: number },
  total: number,
): PaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    pageCount: Math.ceil(total / query.pageSize),
  };
}
