import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { haversineMeters, toGeography, withinRadius } from './index';

const KARACHI_SADDAR = { lat: 24.8556, lng: 67.0228 };
const KARACHI_GULSHAN = { lat: 24.9204, lng: 67.0932 };

describe('geospatial helpers', () => {
  it('computes great-circle distances', () => {
    expect(haversineMeters(KARACHI_SADDAR, KARACHI_SADDAR)).toBe(0);
    // ≈ 10.2 km between Saddar and Gulshan-e-Iqbal.
    expect(haversineMeters(KARACHI_SADDAR, KARACHI_GULSHAN)).toBeGreaterThan(10_000);
    expect(haversineMeters(KARACHI_SADDAR, KARACHI_GULSHAN)).toBeLessThan(10_400);
    // Karachi → Lahore ≈ 1,030 km.
    expect(haversineMeters(KARACHI_SADDAR, { lat: 31.5204, lng: 74.3587 }) / 1000).toBeCloseTo(
      1030,
      -1,
    );
  });

  it('builds parameterised PostGIS SQL (lng first) and validates input', () => {
    const query = new PgDialect().sqlToQuery(toGeography(KARACHI_SADDAR));
    expect(query.sql).toBe('ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography');
    expect(query.params).toEqual([67.0228, 24.8556]);
    expect(() => toGeography({ lat: 95, lng: 0 })).toThrow(RangeError);
    expect(() =>
      withinRadius(toGeography(KARACHI_SADDAR), toGeography(KARACHI_GULSHAN), -1),
    ).toThrow(RangeError);
  });
});
