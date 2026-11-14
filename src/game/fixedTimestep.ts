/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Physics step size: the simulation always advances in 1/60 s increments. */
export const FIXED_DT = 1 / 60;

/** Longest frame delta accepted per frame, so a stall can't trigger a spiral of death. */
export const MAX_FRAME_DT = 0.05;

/**
 * Fixed-timestep accumulator. Feed it the real frame delta and it returns how
 * many FIXED_DT physics steps to run this frame, carrying the remainder over.
 * Damping, thrust and stage timers therefore behave the same at 30, 60, 144 or
 * 240 Hz.
 */
export class FixedTimestep {
  private accumulator = 0;

  advance(frameDt: number): number {
    const clamped = Math.min(Math.max(frameDt, 0), MAX_FRAME_DT);
    this.accumulator += clamped;

    let steps = 0;
    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      steps++;
    }
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
