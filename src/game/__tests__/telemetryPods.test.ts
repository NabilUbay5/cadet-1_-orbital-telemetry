import { describe, expect, test } from 'bun:test';
import { TELEMETRY_POD_PICKUP_RADIUS, TelemetryPodTracker } from '../telemetryPods.ts';

describe('TelemetryPodTracker', () => {
  test('collects each pod once, rejects out-of-range pickups, and resets collection state', () => {
    const pods = [{ collected: false }, { collected: false }, { collected: false }];
    const tracker = new TelemetryPodTracker();

    expect(tracker.collect(pods[0], TELEMETRY_POD_PICKUP_RADIUS)).toBe(false);
    expect(tracker.collect(pods[0], TELEMETRY_POD_PICKUP_RADIUS - 0.1)).toBe(true);
    expect(tracker.collect(pods[0], 0)).toBe(false);
    expect(tracker.count).toBe(1);

    expect(tracker.collect(pods[1], 0)).toBe(true);
    expect(tracker.count).toBe(2);
    tracker.reset(pods);

    expect(tracker.count).toBe(0);
    expect(pods.every((pod) => !pod.collected)).toBe(true);
    expect(tracker.collect(pods[0], 0)).toBe(true);
    expect(tracker.count).toBe(1);
  });

  test('does not collect at invalid distances', () => {
    const tracker = new TelemetryPodTracker();
    const pod = { collected: false };

    expect(tracker.collect(pod, Number.NaN)).toBe(false);
    expect(tracker.collect(pod, Number.POSITIVE_INFINITY)).toBe(false);
    expect(tracker.count).toBe(0);
  });
});
