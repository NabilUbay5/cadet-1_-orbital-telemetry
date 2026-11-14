import { expect, test } from 'bun:test';
import { FLIGHT_EPHEMERIS } from '../../data/nasa/flightEphemeris.ts';
import { FlightTelemetryLog, type FlightLogSample } from '../flightTelemetryLog.ts';

const sample = (metSeconds: number): FlightLogSample => ({
  metSeconds, stage: 1, speedMps: 10, throttlePercent: 30, hullPercent: 90,
  oxygenPercent: 95, energyPercent: 70, pitchDeg: 2, yawDeg: 3, rollDeg: 4,
});

test('retains chronological recent samples after wrapping and records truncation', () => {
  const log = new FlightTelemetryLog(3);
  for (let i = 0; i < 5; i++) log.record(sample(i));
  const result = JSON.parse(log.serialize(FLIGHT_EPHEMERIS));
  expect(result.samples.map((row: FlightLogSample) => row.metSeconds)).toEqual([2, 3, 4]);
  expect(result.droppedSamples).toBe(2);
  expect(result.nasaReference.queryUrl).toBe(FLIGHT_EPHEMERIS.queryUrl);
  expect(result.samples[0].nasaReference.distanceKm).toBeGreaterThan(350000);
});

test('samples once per simulation second and forces a fresh terminal reading without duplication', () => {
  const log = new FlightTelemetryLog();
  const input = sample(0.1);
  log.record(input);
  input.speedMps = 500;
  log.record(sample(0.2));
  expect(log.shouldRecord(0.9)).toBe(false);
  expect(log.shouldRecord(1)).toBe(true);
  let result = JSON.parse(log.serialize(FLIGHT_EPHEMERIS));
  expect(result.samples).toHaveLength(1);
  expect(result.samples[0].speedMps).toBe(10);
  log.record({ ...sample(0.9), hullPercent: 0 }, true);
  result = JSON.parse(log.serialize(FLIGHT_EPHEMERIS));
  expect(result.samples).toHaveLength(1);
  expect(result.samples[0].hullPercent).toBe(0);
  log.record(sample(1));
  log.clear();
  expect(JSON.parse(log.serialize(FLIGHT_EPHEMERIS)).samples).toEqual([]);
  expect(log.shouldRecord(0)).toBe(true);
});

test('rejects invalid capacity and times; marks reference data unavailable past coverage', () => {
  expect(() => new FlightTelemetryLog(0)).toThrow();
  const log = new FlightTelemetryLog();
  log.record(sample(NaN));
  log.record(sample(-1));
  expect(JSON.parse(log.serialize(FLIGHT_EPHEMERIS)).samples).toHaveLength(0);
  log.record(sample(100000));
  log.record(sample(1));
  const result = JSON.parse(log.serialize(FLIGHT_EPHEMERIS));
  expect(result.samples).toHaveLength(1);
  expect(result.samples[0].nasaReference).toBeNull();
});
