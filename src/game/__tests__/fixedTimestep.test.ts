import { describe, expect, test } from 'bun:test';
import { FIXED_DT, FixedTimestep, MAX_FRAME_DT } from '../fixedTimestep.ts';

function totalSteps(refreshHz: number, seconds: number): number {
  const ts = new FixedTimestep();
  let steps = 0;
  const frames = Math.round(refreshHz * seconds);
  for (let i = 0; i < frames; i++) steps += ts.advance(1 / refreshHz);
  return steps;
}

describe('FixedTimestep accumulator', () => {
  test('uses a 1/60 s step and a 0.05 s frame clamp', () => {
    expect(FIXED_DT).toBeCloseTo(1 / 60, 12);
    expect(MAX_FRAME_DT).toBe(0.05);
  });

  test('runs the same number of physics steps at 30, 60, 144 and 240 Hz', () => {
    for (const hz of [30, 60, 144, 240]) {
      const steps = totalSteps(hz, 10);
      expect(Math.abs(steps - 600)).toBeLessThanOrEqual(1);
    }
  });

  test('clamps long frames to avoid a spiral of death', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(2)).toBe(3); // 0.05 s / (1/60 s) = 3 steps, not 120
  });

  test('ignores negative deltas and resets cleanly', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(-1)).toBe(0);
    ts.advance(FIXED_DT * 0.9);
    ts.reset();
    expect(ts.advance(FIXED_DT * 0.5)).toBe(0);
  });
});

describe('FixedTimestep: remainder and edge cases', () => {
  test('carries leftover time into the next frame', () => {
    const ts = new FixedTimestep();
    expect(ts.advance(FIXED_DT * 0.6)).toBe(0); // 0.6 kept
    expect(ts.advance(FIXED_DT * 0.6)).toBe(1); // 1.2 -> 1 step, 0.2 kept
    expect(ts.advance(FIXED_DT * 0.6)).toBe(0); // 0.8 kept
    expect(ts.advance(FIXED_DT * 0.3)).toBe(1); // 1.1 -> 1 step
  });

  test('a zero delta runs no steps', () => {
    expect(new FixedTimestep().advance(0)).toBe(0);
  });

  test('a frame exactly at the clamp runs 3 steps', () => {
    expect(new FixedTimestep().advance(MAX_FRAME_DT)).toBe(3);
  });

  test('never exceeds the per-frame step budget, even with a carried remainder', () => {
    const maxSteps = Math.ceil(MAX_FRAME_DT / FIXED_DT);
    const ts = new FixedTimestep();
    ts.advance(FIXED_DT * 0.99);
    for (let i = 0; i < 50; i++) expect(ts.advance(5)).toBeLessThanOrEqual(maxSteps);
  });

  test('a long stall slows the simulation instead of exploding it', () => {
    const steps = new FixedTimestep().advance(1);
    expect(steps * FIXED_DT).toBeLessThanOrEqual(MAX_FRAME_DT + 1e-9);
  });

  test('irregular frame times add up to the same total as smooth ones', () => {
    const jitter = [0.01, 0.022, 0.016, 0.031, 0.008, 0.019, 0.013, 0.027, 0.015, 0.006];
    const ts = new FixedTimestep();
    let steps = 0;
    let total = 0;
    for (let r = 0; r < 100; r++) {
      for (const dt of jitter) {
        steps += ts.advance(dt);
        total += dt;
      }
    }
    expect(Math.abs(steps - total / FIXED_DT)).toBeLessThanOrEqual(1);
  });

  test('separate instances keep separate accumulators', () => {
    const a = new FixedTimestep();
    const b = new FixedTimestep();
    a.advance(FIXED_DT * 0.9);
    expect(b.advance(FIXED_DT * 0.2)).toBe(0);
    expect(a.advance(FIXED_DT * 0.2)).toBe(1);
  });

  test('identical input gives identical step counts (deterministic replay)', () => {
    const run = () => {
      const ts = new FixedTimestep();
      const out: number[] = [];
      for (let i = 0; i < 300; i++) out.push(ts.advance(0.004 + (i % 7) * 0.003));
      return out;
    };
    expect(run()).toEqual(run());
  });
});
