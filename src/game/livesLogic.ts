/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure rules for the heart-bar lives system. Scalars in, scalars out, so the
 * flight engine can call these inside the fixed-timestep loop without allocating.
 * These are gameplay values, not spacecraft data.
 */

export const MAX_LIVES = 3;
/** Seconds of invulnerability after a hit, so one crash cannot cost several hearts. */
export const INVULNERABLE_SECONDS = 1.5;
/** Share of speed kept after bouncing off an asteroid. */
export const RECOIL_RESTITUTION = 0.5;
/** Ship flashes this many times per second while invulnerable. */
export const FLASH_HZ = 8;

export function canTakeHit(invulnerableTimer: number): boolean {
  return invulnerableTimer <= 0;
}

export function loseLife(lives: number): number {
  return Math.max(0, lives - 1);
}

export function isOutOfLives(lives: number): boolean {
  return lives <= 0;
}

export function stepInvulnerability(timer: number, dt: number): number {
  return Math.max(0, timer - dt);
}

/** Hull gauge follows the hearts: 3 = 100%, 2 = 67%, 1 = 33%, 0 = 0%. */
export function hullPercentForLives(lives: number): number {
  return Math.round((Math.max(0, Math.min(MAX_LIVES, lives)) / MAX_LIVES) * 100);
}

/** True on the hidden half of each flash cycle while invulnerable. */
export function isFlashHidden(invulnerableTimer: number): boolean {
  return invulnerableTimer > 0 && Math.floor(invulnerableTimer * FLASH_HZ * 2) % 2 === 1;
}
