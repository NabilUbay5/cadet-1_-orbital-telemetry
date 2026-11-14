import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { FLIGHT_EPHEMERIS } from '../../data/nasa/flightEphemeris.ts';
import { parseHorizonsVectors, sampleEphemeris } from '../horizonsEphemeris.ts';

describe('NASA orbital reference', () => {
  test('bundled vectors exactly match the retained NASA API response', () => {
    const response = JSON.parse(readFileSync(new URL('../../../data/nasa/horizons-flight-raw.json', import.meta.url), 'utf8')) as {
      result: string; signature: { source: string; version: string };
    };
    expect(response.signature.source).toContain('NASA/JPL Horizons');
    expect(response.signature.version).toBe(FLIGHT_EPHEMERIS.apiVersion);
    expect(parseHorizonsVectors(response.result)).toEqual([...FLIGHT_EPHEMERIS.samples]);
  });

  test('bundled geometric states retain explicit source, units, frame and time scale', () => {
    const url = new URL(FLIGHT_EPHEMERIS.queryUrl);
    expect(url.hostname).toBe('ssd.jpl.nasa.gov');
    expect(url.searchParams.get('VEC_CORR')).toBe("'NONE'");
    expect(url.searchParams.get('TIME_TYPE')).toBe("'TDB'");
    expect(FLIGHT_EPHEMERIS.frame).toBe('ICRF equatorial');
    expect(FLIGHT_EPHEMERIS.units).toBe('km, km/s');
    expect(FLIGHT_EPHEMERIS.samples).toHaveLength(145);
    for (const row of FLIGHT_EPHEMERIS.samples) expect(row.every(Number.isFinite)).toBe(true);
    const first = FLIGHT_EPHEMERIS.samples[0];
    const reading = sampleEphemeris(FLIGHT_EPHEMERIS, 0)!;
    expect(reading.distanceKm).toBeCloseTo(Math.hypot(first[1], first[2], first[3]), 8);
    expect(reading.speedKmS).toBeCloseTo(Math.hypot(first[4], first[5], first[6]), 8);
    expect(reading.distanceKm).toBeGreaterThan(350000);
    expect(reading.distanceKm).toBeLessThan(410000);
  });

  test('interpolates withheld NASA states with less than one metre of range error', () => {
    const coarse = { ...FLIGHT_EPHEMERIS, samples: FLIGHT_EPHEMERIS.samples.filter((_, i) => i % 2 === 0) };
    for (let i = 1; i < FLIGHT_EPHEMERIS.samples.length - 1; i += 2) {
      const row = FLIGHT_EPHEMERIS.samples[i];
      const met = (row[0] - FLIGHT_EPHEMERIS.samples[0][0]) * 86400;
      const reading = sampleEphemeris(coarse, met)!;
      expect(Math.abs(reading.distanceKm - Math.hypot(row[1], row[2], row[3]))).toBeLessThan(0.001);
      expect(Math.abs(reading.speedKmS - Math.hypot(row[4], row[5], row[6]))).toBeLessThan(0.000001);
    }
  });

  test('stops at coverage boundaries instead of showing invented values', () => {
    const samples = FLIGHT_EPHEMERIS.samples;
    const end = (samples[samples.length - 1][0] - samples[0][0]) * 86400;
    expect(sampleEphemeris(FLIGHT_EPHEMERIS, end)).not.toBeNull();
    for (const invalid of [-1, NaN, Infinity, end + 1]) expect(sampleEphemeris(FLIGHT_EPHEMERIS, invalid)).toBeNull();
    expect(sampleEphemeris({ ...FLIGHT_EPHEMERIS, samples: [] }, 0)).toBeNull();
  });

  test('rejects error responses, malformed numbers and duplicate epochs', () => {
    expect(() => parseHorizonsVectors('Horizons error')).toThrow();
    const table = (rows: string) => `$$SOE\n${rows}\n$$EOE`;
    expect(() => parseHorizonsVectors(table('1,date,1,2,3,4,5,6,\n2,date,,2,3,4,5,6,'))).toThrow();
    expect(() => parseHorizonsVectors(table('1,date,1,2,3,4,5,6,\n1,date,1,2,3,4,5,6,'))).toThrow();
    expect(() => parseHorizonsVectors(table('1,date,1,2,3,4,5,6,\n2,date,n.a.,2,3,4,5,6,'))).toThrow();
    expect(parseHorizonsVectors(table('1,date,1,2,3,4,5,6,\n2,date,2,3,4,5,6,7,'))).toHaveLength(2);
  });
});
