import { describe, expect, test } from 'bun:test';
import { FIXED_DT } from '../fixedTimestep.ts';
import {
  STAGE1_TARGET_TIME,
  STAGE2_REQUIRED_CUBES,
  STAGE3_LOCK_TIME,
  applyRingBonus,
  isCraftLevel,
  isEnergyCubeInRange,
  isEnergyHarvestComplete,
  isSatelliteAligned,
  isSatelliteLockComplete,
  isStabilizationComplete,
  progressPercent,
  stepSatelliteLockTimer,
  stepStabilizationTimer,
} from '../missionLogic.ts';

/** Runs a timer step function for `seconds` of simulated time at the fixed physics rate. */
function simulate(
  seconds: number,
  start: number,
  step: (timer: number, dt: number) => number
): number {
  let timer = start;
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) timer = step(timer, FIXED_DT);
  return timer;
}

describe('Stage 1: gyro stabilization', () => {
  test('level window is ±4.5° on both pitch and yaw (inclusive)', () => {
    expect(isCraftLevel(0, 0)).toBe(true);
    expect(isCraftLevel(4.5, -4.5)).toBe(true);
    expect(isCraftLevel(4.51, 0)).toBe(false);
    expect(isCraftLevel(0, -4.51)).toBe(false);
  });

  test('completes after holding level for the 4 s target', () => {
    const almost = simulate(STAGE1_TARGET_TIME - 0.1, 0, (t, dt) => stepStabilizationTimer(t, true, dt));
    expect(isStabilizationComplete(almost)).toBe(false);

    const done = simulate(STAGE1_TARGET_TIME + 0.1, 0, (t, dt) => stepStabilizationTimer(t, true, dt));
    expect(isStabilizationComplete(done)).toBe(true);
    expect(done).toBe(STAGE1_TARGET_TIME); // clamped, never overshoots
  });

  test('decays at half rate when off-level and never goes negative', () => {
    const decayed = simulate(1, 2, (t, dt) => stepStabilizationTimer(t, false, dt));
    expect(decayed).toBeCloseTo(1.5, 5);

    const floored = simulate(10, 1, (t, dt) => stepStabilizationTimer(t, false, dt));
    expect(floored).toBe(0);
  });

  test('waypoint rings add +1 s, capped at the target', () => {
    expect(applyRingBonus(0)).toBe(1);
    expect(applyRingBonus(3.5)).toBe(STAGE1_TARGET_TIME);
    expect(isStabilizationComplete(applyRingBonus(3))).toBe(true);
  });
});

describe('Stage 2: energy cube collection', () => {
  test('pickup radius is strictly under 5 m', () => {
    expect(isEnergyCubeInRange(4.99)).toBe(true);
    expect(isEnergyCubeInRange(5)).toBe(false);
  });

  test('requires all 3 cubes', () => {
    expect(STAGE2_REQUIRED_CUBES).toBe(3);
    expect(isEnergyHarvestComplete(0)).toBe(false);
    expect(isEnergyHarvestComplete(2)).toBe(false);
    expect(isEnergyHarvestComplete(3)).toBe(true);
  });

  test('progress reports thirds as whole percentages', () => {
    expect(progressPercent(1, STAGE2_REQUIRED_CUBES)).toBe(33);
    expect(progressPercent(2, STAGE2_REQUIRED_CUBES)).toBe(67);
    expect(progressPercent(3, STAGE2_REQUIRED_CUBES)).toBe(100);
  });
});

describe('Stage 3: satellite alignment', () => {
  test('lock requires distance < 45 m and heading error < 8°', () => {
    expect(isSatelliteAligned(44.9, 7.9)).toBe(true);
    expect(isSatelliteAligned(45, 0)).toBe(false);
    expect(isSatelliteAligned(10, 8)).toBe(false);
  });

  test('completes after holding alignment for 3 s', () => {
    const almost = simulate(STAGE3_LOCK_TIME - 0.1, 0, (t, dt) => stepSatelliteLockTimer(t, true, dt));
    expect(isSatelliteLockComplete(almost)).toBe(false);

    const done = simulate(STAGE3_LOCK_TIME + 0.1, 0, (t, dt) => stepSatelliteLockTimer(t, true, dt));
    expect(isSatelliteLockComplete(done)).toBe(true);
    expect(progressPercent(done, STAGE3_LOCK_TIME)).toBe(100);
  });

  test('lock decays at 0.6× when alignment is lost', () => {
    const decayed = simulate(1, 2, (t, dt) => stepSatelliteLockTimer(t, false, dt));
    expect(decayed).toBeCloseTo(1.4, 5);
  });
});
