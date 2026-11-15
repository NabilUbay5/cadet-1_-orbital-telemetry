/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure helpers for the on-screen touch controller: joystick maths, when to show
 * the controller, and how big to draw it for a given screen. No DOM access, so
 * everything here runs in bun:test.
 */

export type TouchMode = 'auto' | 'on' | 'off';
export const TOUCH_MODES: readonly TouchMode[] = ['auto', 'on', 'off'];
export const TOUCH_MODE_STORAGE_KEY = 'cadet-1-touch-controls';

/** Share of the stick radius treated as centre, so a resting thumb does not drift. */
export const STICK_DEADZONE = 0.12;

export interface StickVector { x: number; y: number }

/**
 * Converts a thumb offset from the stick centre (CSS pixels, y down) into a
 * vector inside the unit circle. The deadzone is removed and the remaining
 * travel rescaled, so the output still reaches 1 at the rim.
 */
export function stickVector(dx: number, dy: number, radius: number, deadzone = STICK_DEADZONE): StickVector {
  if (!(radius > 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const length = Math.hypot(dx, dy) / radius;
  if (length <= deadzone) return { x: 0, y: 0 };
  const scaled = Math.min(1, (length - deadzone) / (1 - deadzone));
  const k = scaled / length;
  return { x: (dx / radius) * k, y: (dy / radius) * k };
}

/** Where to draw the thumb knob, clamped to the base ring. */
export function knobOffset(dx: number, dy: number, radius: number): StickVector {
  const length = Math.hypot(dx, dy);
  if (length <= radius || length === 0) return { x: dx, y: dy };
  return { x: (dx / length) * radius, y: (dy / length) * radius };
}

/** Show the controller on touch-first devices in auto mode; the lobby toggle can force it either way. */
export function shouldShowTouchControls(mode: TouchMode, coarsePointer: boolean, maxTouchPoints: number): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return coarsePointer && maxTouchPoints > 0;
}

export interface DeviceSignals {
  /** matchMedia('(pointer: coarse)'): the main pointer is a finger. */
  coarsePointer: boolean;
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
}

/**
 * Touch-first means a phone or tablet, not a touchscreen laptop. iPadOS reports a
 * desktop Mac and a fine pointer once a trackpad or Magic Keyboard is attached, so
 * it is recognised by "Mac platform with multi-touch" (real Macs have no touch points).
 */
export function isTouchFirstDevice(d: DeviceSignals): boolean {
  if (!(d.maxTouchPoints > 0)) return false;
  if (d.coarsePointer) return true;
  if (/iPad|iPhone|Android.*Mobile/i.test(d.userAgent)) return true;
  return /Mac/i.test(d.platform) && d.maxTouchPoints > 1;
}

export function nextTouchMode(mode: TouchMode): TouchMode {
  return TOUCH_MODES[(TOUCH_MODES.indexOf(mode) + 1) % TOUCH_MODES.length];
}

export function parseTouchMode(value: string | null): TouchMode {
  return value === 'on' || value === 'off' ? value : 'auto';
}

export interface TouchLayout {
  orientation: 'portrait' | 'landscape';
  /** Joystick base diameter in CSS pixels. */
  stick: number;
  /** Diameter of the main BOOST button. */
  primary: number;
  /** Diameter of the THRUST, BRAKE and SCAN buttons. */
  secondary: number;
  /** Gap from the screen edges (before safe-area insets). */
  margin: number;
  /** Gap between buttons. */
  gap: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Sizes the controller from the viewport. Everything scales with the short side,
 * with floors that keep touch targets at least 48 px and caps so tablets do not
 * get comically large controls. The two clusters never overlap: the stick and the
 * button group together stay within the screen width.
 */
export function touchLayout(width: number, height: number): TouchLayout {
  const w = Math.max(1, width), h = Math.max(1, height);
  const short = Math.min(w, h);
  const orientation = w >= h ? 'landscape' : 'portrait';
  const margin = clamp(Math.round(short * 0.04), 12, 32);
  const gap = clamp(Math.round(short * 0.025), 8, 18);
  let stick = clamp(Math.round(short * (orientation === 'portrait' ? 0.34 : 0.3)), 112, 190);
  let primary = clamp(Math.round(short * 0.17), 64, 104);
  let secondary = clamp(Math.round(short * 0.12), 48, 76);
  // Buttons sit in a 2x2 grid; make sure stick + grid + margins fit across.
  const needed = () => margin * 2 + stick + gap + primary + secondary + gap * 2;
  while (needed() > w && stick > 96) stick -= 4;
  while (needed() > w && secondary > 44) { secondary -= 2; primary = Math.max(secondary + 8, primary - 2); }
  return { orientation, stick, primary, secondary, margin, gap };
}
