import { describe, expect, test } from 'bun:test';
import { FIXED_DT } from '../fixedTimestep.ts';
import {
  STAGE1_DECAY_RATE,
  STAGE1_LEVEL_TOLERANCE_DEG,
  STAGE1_RING_BONUS,
  STAGE1_START_PITCH_DEG,
  STAGE1_START_YAW_DEG,
  STAGE1_TARGET_TIME,
  STAGE1_TOTAL_RINGS,
  STAGE2_PICKUP_RADIUS,
  STAGE2_REQUIRED_CUBES,
  STAGE3_DECAY_RATE,
  STAGE3_LOCK_DISTANCE,
  STAGE3_LOCK_ERROR_DEG,
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

describe('Mission rule constants', () => {
  test('match the thresholds documented in the README feature matrix', () => {
    expect(STAGE1_LEVEL_TOLERANCE_DEG).toBe(4.5);
    expect(STAGE1_TARGET_TIME).toBe(4);
    expect(STAGE1_DECAY_RATE).toBe(0.5);
    expect(STAGE1_RING_BONUS).toBe(1);
    expect(STAGE1_TOTAL_RINGS).toBe(3);
    expect(STAGE2_PICKUP_RADIUS).toBe(5);
    expect(STAGE3_LOCK_DISTANCE).toBe(45);
    expect(STAGE3_LOCK_ERROR_DEG).toBe(8);
    expect(STAGE3_DECAY_RATE).toBe(0.6);
  });

  test('decay rates are slower than fill rates, so progress is forgiving', () => {
    for (const rate of [STAGE1_DECAY_RATE, STAGE3_DECAY_RATE]) {
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    }
  });

  test('passing every waypoint ring cannot finish Stage 1 on its own', () => {
    expect(STAGE1_TOTAL_RINGS * STAGE1_RING_BONUS).toBeLessThan(STAGE1_TARGET_TIME);
  });
});

describe('Stage 1: edge cases', () => {
  test('level check is symmetric in sign and treats pitch and yaw the same', () => {
    for (const v of [0, 1, 4.5, 4.51, 10]) {
      expect(isCraftLevel(v, 0)).toBe(isCraftLevel(-v, 0));
      expect(isCraftLevel(0, v)).toBe(isCraftLevel(0, -v));
      expect(isCraftLevel(v, 0)).toBe(isCraftLevel(0, v));
    }
  });

  test('both axes must be level at the same time', () => {
    expect(isCraftLevel(4, 5)).toBe(false);
    expect(isCraftLevel(5, 4)).toBe(false);
  });

  test('a zero-length step leaves the timer unchanged', () => {
    expect(stepStabilizationTimer(2, true, 0)).toBe(2);
    expect(stepStabilizationTimer(2, false, 0)).toBe(2);
  });

  test('a completed timer stays complete while the craft stays level', () => {
    const t = stepStabilizationTimer(STAGE1_TARGET_TIME, true, FIXED_DT);
    expect(t).toBe(STAGE1_TARGET_TIME);
    expect(isStabilizationComplete(t)).toBe(true);
  });

  test('wobbling off-level costs progress, so holding steady is faster', () => {
    // 2 s level, then 1 s off-level loses 0.5 s, so 2.5 s more are needed.
    let t = simulate(2, 0, (x, dt) => stepStabilizationTimer(x, true, dt));
    t = simulate(1, t, (x, dt) => stepStabilizationTimer(x, false, dt));
    expect(t).toBeCloseTo(1.5, 5);
    expect(isStabilizationComplete(simulate(2, t, (x, dt) => stepStabilizationTimer(x, true, dt)))).toBe(false);
    expect(isStabilizationComplete(simulate(2.6, t, (x, dt) => stepStabilizationTimer(x, true, dt)))).toBe(true);
  });

  test('ring bonuses stack and shorten the hold time', () => {
    const t = applyRingBonus(applyRingBonus(applyRingBonus(0)));
    expect(t).toBe(3);
    expect(isStabilizationComplete(simulate(1.05, t, (x, dt) => stepStabilizationTimer(x, true, dt)))).toBe(true);
  });

  test('timer stays within [0, target] under a long random input sequence', () => {
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    let t = 0;
    for (let i = 0; i < 5000; i++) {
      t = rand() < 0.05 ? applyRingBonus(t) : stepStabilizationTimer(t, rand() < 0.6, FIXED_DT);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(STAGE1_TARGET_TIME);
    }
  });
});

describe('Stage 2: edge cases', () => {
  test('a cube at distance 0 is in range', () => {
    expect(isEnergyCubeInRange(0)).toBe(true);
  });

  test('collecting more than the required cubes still counts as complete', () => {
    expect(isEnergyHarvestComplete(STAGE2_REQUIRED_CUBES + 1)).toBe(true);
  });
});

describe('Stage 3: edge cases', () => {
  test('distance and heading limits are both strict', () => {
    expect(isSatelliteAligned(STAGE3_LOCK_DISTANCE - 0.001, STAGE3_LOCK_ERROR_DEG - 0.001)).toBe(true);
    expect(isSatelliteAligned(STAGE3_LOCK_DISTANCE, STAGE3_LOCK_ERROR_DEG - 1)).toBe(false);
    expect(isSatelliteAligned(STAGE3_LOCK_DISTANCE - 1, STAGE3_LOCK_ERROR_DEG)).toBe(false);
  });

  test('pointing away from the relay fails even at close range', () => {
    expect(isSatelliteAligned(1, 180)).toBe(false);
  });

  test('lock timer is clamped to [0, lock time]', () => {
    expect(stepSatelliteLockTimer(STAGE3_LOCK_TIME, true, 1)).toBe(STAGE3_LOCK_TIME);
    expect(stepSatelliteLockTimer(0.1, false, 10)).toBe(0);
  });

  test('a full lock drains to zero after lock time ÷ decay rate seconds', () => {
    const t = simulate(STAGE3_LOCK_TIME / STAGE3_DECAY_RATE + 0.1, STAGE3_LOCK_TIME, (x, dt) =>
      stepSatelliteLockTimer(x, false, dt)
    );
    expect(t).toBe(0);
  });
});

describe('progressPercent', () => {
  test('returns whole numbers from 0 to 100', () => {
    expect(progressPercent(0, STAGE1_TARGET_TIME)).toBe(0);
    expect(progressPercent(1, STAGE1_TARGET_TIME)).toBe(25);
    expect(progressPercent(STAGE1_TARGET_TIME, STAGE1_TARGET_TIME)).toBe(100);
    expect(Number.isInteger(progressPercent(1.234, STAGE3_LOCK_TIME))).toBe(true);
  });

  test('caps at 100 when the value overshoots the target', () => {
    expect(progressPercent(10, STAGE1_TARGET_TIME)).toBe(100);
  });

  test('rounds to the nearest percent', () => {
    expect(progressPercent(0.004, 1)).toBe(0);
    expect(progressPercent(0.006, 1)).toBe(1);
    expect(progressPercent(0.994, 1)).toBe(99);
  });

  test('never decreases as the value grows', () => {
    let prev = -1;
    for (let v = 0; v <= STAGE3_LOCK_TIME + 0.5; v += FIXED_DT) {
      const p = progressPercent(v, STAGE3_LOCK_TIME);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe('Stage 1 start attitude', () => {
  test('the craft starts outside the level window, so Stage 1 needs input', () => {
    expect(isCraftLevel(STAGE1_START_PITCH_DEG, STAGE1_START_YAW_DEG)).toBe(false);
    expect(Math.abs(STAGE1_START_PITCH_DEG)).toBeGreaterThan(STAGE1_LEVEL_TOLERANCE_DEG);
    expect(Math.abs(STAGE1_START_YAW_DEG)).toBeGreaterThan(STAGE1_LEVEL_TOLERANCE_DEG);
  });

  test('waiting without input never completes Stage 1 while the craft stays tilted', () => {
    const level = isCraftLevel(STAGE1_START_PITCH_DEG, STAGE1_START_YAW_DEG);
    const t = simulate(10, 0, (x, dt) => stepStabilizationTimer(x, level, dt));
    expect(isStabilizationComplete(t)).toBe(false);
  });
});
