import { describe, expect, it } from 'vitest';
import { assertValidGeoPoint, parseEwkbPoint } from '../src/types/geography';

function pointHex({
  lng,
  lat,
  srid,
  littleEndian = true,
}: {
  lng: number;
  lat: number;
  srid?: number;
  littleEndian?: boolean;
}): string {
  const buf = Buffer.alloc(1 + 4 + (srid ? 4 : 0) + 16);
  const u32 = (v: number, o: number) =>
    littleEndian ? buf.writeUInt32LE(v, o) : buf.writeUInt32BE(v, o);
  const f64 = (v: number, o: number) =>
    littleEndian ? buf.writeDoubleLE(v, o) : buf.writeDoubleBE(v, o);

  buf.writeUInt8(littleEndian ? 1 : 0, 0);
  u32(1 | (srid ? 0x20000000 : 0), 1);
  if (srid) u32(srid, 5);
  const offset = srid ? 9 : 5;
  f64(lng, offset);
  f64(lat, offset + 8);
  return buf.toString('hex');
}

describe('parseEwkbPoint', () => {
  it('parses the exact hex PostGIS returns for a geography point', () => {
    // SELECT ST_SetSRID(ST_MakePoint(67.0011, 24.8607), 4326)::geography  — Karachi
    expect(parseEwkbPoint('0101000020E6100000A301BC0512C05040CEAACFD556DC3840')).toEqual({
      lng: 67.0011,
      lat: 24.8607,
    });
  });

  it.each([
    { name: 'little-endian with SRID', srid: 4326, littleEndian: true },
    { name: 'big-endian with SRID', srid: 4326, littleEndian: false },
    { name: 'plain WKB without SRID', srid: undefined, littleEndian: true },
  ])('round-trips $name', ({ srid, littleEndian }) => {
    const hex = pointHex({ lng: 73.0479, lat: 33.6844, srid, littleEndian });
    expect(parseEwkbPoint(hex)).toEqual({ lng: 73.0479, lat: 33.6844 });
  });

  it('rejects non-point geometries and truncated input', () => {
    const lineString = '0102000020E6100000';
    expect(() => parseEwkbPoint(lineString.padEnd(42, '0'))).toThrow(/Expected a POINT/);
    expect(() => parseEwkbPoint('0101')).toThrow(/too short/);
  });
});

describe('assertValidGeoPoint', () => {
  it('accepts valid coordinates', () => {
    expect(() => assertValidGeoPoint({ lat: 24.86, lng: 67 })).not.toThrow();
  });

  it.each([
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: Number.NaN, lng: 0 },
  ])('rejects %j', (point) => {
    expect(() => assertValidGeoPoint(point)).toThrow(RangeError);
  });
});
