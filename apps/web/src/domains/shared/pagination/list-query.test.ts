import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../errors';
import { paginationMeta, parseListQuery } from './list-query';

const options = {
  sortable: ['createdAt', 'name'] as const,
  defaultSort: { field: 'createdAt' as const, direction: 'desc' as const },
  filters: {
    status: z
      .union([z.enum(['ACTIVE', 'INACTIVE']), z.array(z.enum(['ACTIVE', 'INACTIVE']))])
      .optional(),
    branchId: z.uuid().optional(),
  },
};

const parse = (qs: string) => parseListQuery(new URLSearchParams(qs), options);

describe('parseListQuery', () => {
  it('applies defaults', () => {
    expect(parse('')).toMatchObject({
      page: 1,
      pageSize: 20,
      offset: 0,
      sort: { field: 'createdAt', direction: 'desc' },
      q: undefined,
    });
  });

  it('parses paging, sort, search and filters (repeated keys become arrays)', () => {
    const q = parse(
      'page=3&pageSize=50&sort=name:asc&q=%20electrician%20&status=ACTIVE&status=INACTIVE',
    );
    expect(q).toMatchObject({
      page: 3,
      pageSize: 50,
      offset: 100,
      limit: 50,
      sort: { field: 'name', direction: 'asc' },
      q: 'electrician',
    });
    expect(q.filters).toEqual({ status: ['ACTIVE', 'INACTIVE'] });
  });

  it.each([
    'sort=password:asc',
    'sort=name',
    'pageSize=1000',
    'page=0',
    'status=DELETED',
    'unknownParam=1',
    'branchId=not-a-uuid',
  ])('rejects %s', (qs) => {
    expect(() => parse(qs)).toThrow(ValidationError);
  });

  it('builds pagination meta', () => {
    expect(paginationMeta({ page: 2, pageSize: 20 }, 45)).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      pageCount: 3,
    });
    expect(paginationMeta({ page: 1, pageSize: 20 }, 0)).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      pageCount: 0,
    });
  });
});
