import { assertValidGeoPoint, type GeoPoint } from '@jobbank/db';
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export type { GeoPoint };

/** A literal WGS84 point as a PostGIS geography value. */
export function toGeography(point: GeoPoint): SQL {
  assertValidGeoPoint(point);
  return sql`ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography`;
}

/** Geodesic distance in metres between two geography expressions/columns. */
export function distanceMeters(a: SQLWrapper, b: SQLWrapper): SQL<number> {
  return sql<number>`ST_Distance(${a}, ${b})`.mapWith(Number);
}

/**
 * True when the two geographies are within `meters` of each other. Uses the GiST
 * index on geography columns, so always prefer this over `distanceMeters(...) <= x`.
 */
export function withinRadius(a: SQLWrapper, b: SQLWrapper, meters: number): SQL<boolean> {
  if (!Number.isFinite(meters) || meters < 0) throw new RangeError(`Invalid radius ${meters}`);
  return sql<boolean>`ST_DWithin(${a}, ${b}, ${meters})`;
}

const EARTH_MEAN_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance on a sphere. Within ~0.5% of PostGIS' spheroidal result — use it
 * for UI hints and tests only; matching and referral guards must use PostGIS.
 */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
