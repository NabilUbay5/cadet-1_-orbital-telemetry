import { describe, expect, test } from 'bun:test';
import {
  isTelemetryUpdateDue,
  TELEMETRY_UPDATE_INTERVAL_MS,
} from '../telemetrySchedule.ts';

describe('telemetry update scheduling', () => {
  test('publishes the first update and then waits for the configured interval', () => {
    expect(isTelemetryUpdateDue(0, Number.NEGATIVE_INFINITY)).toBe(true);
    expect(isTelemetryUpdateDue(44, 0)).toBe(false);
    expect(isTelemetryUpdateDue(TELEMETRY_UPDATE_INTERVAL_MS, 0)).toBe(true);
  });
});
