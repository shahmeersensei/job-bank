import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { distanceMeters, haversineMeters, toGeography, withinRadius } from './index';

const JOB_SITE = { lat: 24.8607, lng: 67.0011 };
/** Point `km` kilometres due north of the job site (1° latitude ≈ 110.77 km here). */
const north = (km: number) => ({ lat: JOB_SITE.lat + km / 110.77, lng: JOB_SITE.lng });

describe('PostGIS helpers against the real database', () => {
  it('agrees with haversine to within 0.5%', async () => {
    const target = { lat: 24.9204, lng: 67.0932 };
    const [row] = await db.execute<{ m: number }>(
      sql`SELECT ${distanceMeters(toGeography(JOB_SITE), toGeography(target))} AS m`,
    );
    const postgis = Number(row?.m);
    expect(Math.abs(postgis - haversineMeters(JOB_SITE, target)) / postgis).toBeLessThan(0.005);
  });

  it('applies the PRD radius rule: 7.9 km and 9.5 km are in range, 10.1 km is not', async () => {
    const check = async (km: number) => {
      const [row] = await db.execute<{ inside: boolean }>(
        sql`SELECT ${withinRadius(toGeography(JOB_SITE), toGeography(north(km)), 10_000)} AS inside`,
      );
      return row?.inside;
    };
    expect(await check(7.9)).toBe(true);
    expect(await check(9.5)).toBe(true);
    expect(await check(10.1)).toBe(false);
  });
});
