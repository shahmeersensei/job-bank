import {
  MASTER_DATA_META,
  MASTER_DATA_PARENT,
  MASTER_DATA_TYPES,
  masterDataCodeSchema,
} from '@jobbank/shared';
import { describe, expect, it } from 'vitest';
import { HOLIDAY_SEED, MASTER_DATA_SEED } from '../src/seed/master-data';

describe('master data seed', () => {
  it('covers every type', () => {
    for (const type of MASTER_DATA_TYPES) expect(MASTER_DATA_SEED[type].length).toBeGreaterThan(0);
  });

  it('uses valid, unique codes and meta that matches each type schema', () => {
    for (const type of MASTER_DATA_TYPES) {
      const codes = MASTER_DATA_SEED[type].map((item) => item.code);
      expect(new Set(codes).size, `duplicate code in ${type}`).toBe(codes.length);
      for (const item of MASTER_DATA_SEED[type]) {
        expect(masterDataCodeSchema.parse(item.code), `${type}.${item.code}`).toBe(item.code);
        const meta = MASTER_DATA_META[type].safeParse(item.meta ?? {});
        expect(meta.success, `${type}.${item.code}: ${meta.error?.message}`).toBe(true);
      }
    }
  });

  it('points every child at an existing parent of the right type', () => {
    for (const type of MASTER_DATA_TYPES) {
      const rule = MASTER_DATA_PARENT[type];
      for (const item of MASTER_DATA_SEED[type]) {
        if (!rule) {
          expect(item.parent, `${type}.${item.code} cannot have a parent`).toBeUndefined();
          continue;
        }
        if (rule.required) expect(item.parent, `${type}.${item.code} needs a parent`).toBeDefined();
        if (item.parent) {
          expect(MASTER_DATA_SEED[rule.type].map((p) => p.code)).toContain(item.parent);
        }
      }
    }
  });

  it('seeds real calendar dates without duplicates', () => {
    const dates = HOLIDAY_SEED.map((h) => h.date);
    expect(new Set(dates).size).toBe(dates.length);
    for (const date of dates) {
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
  });
});
