import { describe, expect, test } from 'bun:test';
import {
  STICK_DEADZONE,
  isTouchFirstDevice,
  knobOffset,
  nextTouchMode,
  parseTouchMode,
  shouldShowTouchControls,
  stickVector,
  touchLayout,
} from '../touchControls.ts';

describe('stickVector', () => {
  test('centre and deadzone give no input', () => {
    expect(stickVector(0, 0, 60)).toEqual({ x: 0, y: 0 });
    expect(stickVector(60 * STICK_DEADZONE * 0.9, 0, 60)).toEqual({ x: 0, y: 0 });
  });

  test('reaches full deflection at the rim and stays inside the unit circle beyond it', () => {
    const rim = stickVector(60, 0, 60);
    expect(rim.x).toBeCloseTo(1, 6);
    expect(rim.y).toBeCloseTo(0, 6);
    const far = stickVector(300, -300, 60);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(1, 6);
    expect(far.x).toBeGreaterThan(0);
    expect(far.y).toBeLessThan(0);
  });

  test('keeps direction and grows smoothly after the deadzone', () => {
    let prev = 0;
    for (let d = 0; d <= 60; d += 3) {
      const v = stickVector(d, d, 60);
      const len = Math.hypot(v.x, v.y);
      expect(len).toBeGreaterThanOrEqual(prev - 1e-9);
      if (len > 0) expect(v.x).toBeCloseTo(v.y, 9);
      prev = len;
    }
  });

  test('bad input is ignored', () => {
    expect(stickVector(10, 10, 0)).toEqual({ x: 0, y: 0 });
    expect(stickVector(Number.NaN, 4, 60)).toEqual({ x: 0, y: 0 });
  });
});

describe('knobOffset', () => {
  test('follows the thumb inside the ring and stops at the rim', () => {
    expect(knobOffset(10, -5, 50)).toEqual({ x: 10, y: -5 });
    const out = knobOffset(0, 200, 50);
    expect(out.x).toBeCloseTo(0, 9);
    expect(out.y).toBeCloseTo(50, 9);
  });
});

describe('when to show the controller', () => {
  test('auto shows it on touch-first devices only', () => {
    expect(shouldShowTouchControls('auto', true, 5)).toBe(true);
    expect(shouldShowTouchControls('auto', false, 0)).toBe(false);
    expect(shouldShowTouchControls('auto', false, 10)).toBe(false); // touch laptop with a mouse
  });

  test('the lobby toggle forces it on or off', () => {
    expect(shouldShowTouchControls('on', false, 0)).toBe(true);
    expect(shouldShowTouchControls('off', true, 5)).toBe(false);
  });

  test('the toggle cycles auto, on, off and parses saved values', () => {
    expect(nextTouchMode('auto')).toBe('on');
    expect(nextTouchMode('on')).toBe('off');
    expect(nextTouchMode('off')).toBe('auto');
    expect(parseTouchMode('on')).toBe('on');
    expect(parseTouchMode('nonsense')).toBe('auto');
    expect(parseTouchMode(null)).toBe('auto');
  });
});

describe('isTouchFirstDevice', () => {
  const base = { coarsePointer: false, maxTouchPoints: 0, platform: '', userAgent: '' };
  test('phones and tablets with a finger as the main pointer', () => {
    expect(isTouchFirstDevice({ ...base, coarsePointer: true, maxTouchPoints: 5, platform: 'Linux armv8l' })).toBe(true);
  });
  test('an iPad with a trackpad or Magic Keyboard (fine pointer, Mac platform, multi-touch)', () => {
    expect(isTouchFirstDevice({ ...base, maxTouchPoints: 5, platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(true);
  });
  test('a real Mac, a desktop and a touchscreen Windows laptop stay keyboard-first', () => {
    expect(isTouchFirstDevice({ ...base, platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(false);
    expect(isTouchFirstDevice({ ...base, platform: 'Win32' })).toBe(false);
    expect(isTouchFirstDevice({ ...base, maxTouchPoints: 10, platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe(false);
  });
});

describe('touchLayout', () => {
  const screens: Array<[string, number, number]> = [
    ['small phone portrait', 320, 568],
    ['small phone landscape', 568, 320],
    ['phone portrait', 390, 844],
    ['phone landscape', 844, 390],
    ['tablet portrait', 820, 1180],
    ['tablet landscape', 1366, 1024],
  ];

  for (const [name, w, h] of screens) {
    test(`${name}: targets stay at least 44 px and both clusters fit across`, () => {
      const l = touchLayout(w, h);
      expect(l.secondary).toBeGreaterThanOrEqual(44);
      expect(l.primary).toBeGreaterThan(l.secondary);
      expect(l.stick).toBeGreaterThanOrEqual(96);
      expect(l.margin * 2 + l.stick + l.gap + l.primary + l.secondary + l.gap * 2).toBeLessThanOrEqual(w);
      expect(l.orientation).toBe(w >= h ? 'landscape' : 'portrait');
    });
  }

  test('tablets get bigger controls than phones, up to a cap', () => {
    expect(touchLayout(1366, 1024).stick).toBeGreaterThan(touchLayout(390, 844).stick);
    expect(touchLayout(3000, 2000).stick).toBeLessThanOrEqual(190);
  });
});
