import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

/** WGS84 coordinate. `lng` is X, `lat` is Y — PostGIS order is (lng, lat). */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export const SRID_WGS84 = 4326;

const EWKB_SRID_FLAG = 0x20000000;
const WKB_POINT = 1;

export function assertValidGeoPoint(point: GeoPoint): void {
  const { lat, lng } = point;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`Invalid latitude ${lat}; expected -90..90`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new RangeError(`Invalid longitude ${lng}; expected -180..180`);
  }
}

/**
 * Parses the hex (E)WKB string PostgreSQL returns for a geography/geometry POINT.
 * Handles both byte orders and an optional SRID header; Z/M coordinates are ignored.
 */
export function parseEwkbPoint(hex: string): GeoPoint {
  const buf = Buffer.from(hex, 'hex');
  if (buf.length < 21) throw new Error('EWKB value too short for a POINT');

  const littleEndian = buf.readUInt8(0) === 1;
  const u32 = (o: number) => (littleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const f64 = (o: number) => (littleEndian ? buf.readDoubleLE(o) : buf.readDoubleBE(o));

  const typeWord = u32(1);
  // EWKB carries flags in the high bits; ISO WKB encodes Z/M as +1000/+2000/+3000.
  const baseType = (typeWord & 0x0fffffff) % 1000;
  if (baseType !== WKB_POINT) throw new Error(`Expected a POINT, got WKB type ${baseType}`);

  const offset = typeWord & EWKB_SRID_FLAG ? 9 : 5;
  return { lng: f64(offset), lat: f64(offset + 8) };
}

/** PostGIS `geography(Point, 4326)` column. Distances on it are geodesic metres. */
export const geographyPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return `geography(Point, ${SRID_WGS84})`;
  },
  toDriver(point) {
    assertValidGeoPoint(point);
    return sql`ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), ${sql.raw(String(SRID_WGS84))})::geography`;
  },
  fromDriver(value) {
    return parseEwkbPoint(value);
  },
});
