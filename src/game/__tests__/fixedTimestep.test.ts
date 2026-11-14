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
