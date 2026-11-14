/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure, allocation-free mission rules shared by the flight engine and the unit
 * tests. Every function takes and returns scalars so it can run inside the
 * fixed-timestep hot path without creating garbage.
 */

// Stage 1: Ground School — gyro stabilization
export const STAGE1_LEVEL_TOLERANCE_DEG = 4.5;
export const STAGE1_TARGET_TIME = 4.0;
export const STAGE1_DECAY_RATE = 0.5;
export const STAGE1_RING_BONUS = 1.0;
export const STAGE1_TOTAL_RINGS = 3;

// Stage 2: Orbital Entry — energy cube harvest
export const STAGE2_REQUIRED_CUBES = 3;
export const STAGE2_PICKUP_RADIUS = 5.0;

// Stage 3: Deep Space — satellite alignment
export const STAGE3_LOCK_DISTANCE = 45;
export const STAGE3_LOCK_ERROR_DEG = 8.0;
export const STAGE3_LOCK_TIME = 3.0;
export const STAGE3_DECAY_RATE = 0.6;

/** True when pitch and yaw are both within the ±4.5° stabilization window. */
export function isCraftLevel(pitchDeg: number, yawDeg: number): boolean {
  return Math.abs(pitchDeg) <= STAGE1_LEVEL_TOLERANCE_DEG && Math.abs(yawDeg) <= STAGE1_LEVEL_TOLERANCE_DEG;
}

/** Advances the stabilization timer: fills while level, decays at half speed otherwise. */
export function stepStabilizationTimer(timer: number, isLevel: boolean, dt: number): number {
  if (isLevel) return Math.min(STAGE1_TARGET_TIME, timer + dt);
  return Math.max(0, timer - dt * STAGE1_DECAY_RATE);
}

/** Passing a waypoint ring grants a +1 s calibration boost, capped at the target. */
export function applyRingBonus(timer: number): number {
  return Math.min(STAGE1_TARGET_TIME, timer + STAGE1_RING_BONUS);
}

export function isStabilizationComplete(timer: number): boolean {
  return timer >= STAGE1_TARGET_TIME;
}

export function isEnergyCubeInRange(distance: number): boolean {
  return distance < STAGE2_PICKUP_RADIUS;
}

export function isEnergyHarvestComplete(collected: number): boolean {
  return collected >= STAGE2_REQUIRED_CUBES;
}

/** True when the craft is close enough to the relay and pointed at it. */
export function isSatelliteAligned(distance: number, alignErrorDeg: number): boolean {
  return distance < STAGE3_LOCK_DISTANCE && alignErrorDeg < STAGE3_LOCK_ERROR_DEG;
}

/** Advances the satellite lock timer: fills while aligned, decays at 0.6× otherwise. */
export function stepSatelliteLockTimer(timer: number, aligned: boolean, dt: number): number {
  if (aligned) return Math.min(STAGE3_LOCK_TIME, timer + dt);
  return Math.max(0, timer - dt * STAGE3_DECAY_RATE);
}

export function isSatelliteLockComplete(timer: number): boolean {
  return timer >= STAGE3_LOCK_TIME;
}

/** Converts a timer into a 0–100 progress percentage. */
export function progressPercent(value: number, target: number): number {
  return Math.min(100, Math.round((value / target) * 100));
}
