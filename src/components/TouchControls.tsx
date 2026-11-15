/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { knobOffset, stickVector, touchLayout, type TouchLayout } from '../game/touchControls.ts';

interface TouchControlsProps {
  /** Analog steer, x right and y down, each in [-1, 1]. */
  onSteer: (x: number, y: number) => void;
  /** Hold a virtual key, e.g. 'KeyW' for thrust. */
  onKey: (code: string, down: boolean) => void;
  onScan: () => void;
}

interface Placement { layout: TouchLayout; lift: number }

/** Capture keeps a thumb's moves on its own control; failing to capture must never drop the press. */
function capture(el: Element, pointerId: number) {
  try { el.setPointerCapture(pointerId); } catch { /* pointer already gone */ }
}

/** Measures the screen and the HUD's bottom bar so the clusters never sit on top of it. */
function measure(): Placement {
  const w = window.innerWidth, h = window.innerHeight;
  const layout = touchLayout(w, h);
  const bar = document.querySelector('.hud-controls')?.getBoundingClientRect();
  let lift = 0;
  if (bar && bar.height > 0) {
    const leftCluster = layout.margin + layout.stick;
    const rightCluster = layout.margin + layout.primary + layout.secondary + layout.gap * 2;
    const blocksLeft = bar.left < leftCluster + layout.gap;
    const blocksRight = bar.right > w - rightCluster - layout.gap;
    if (blocksLeft || blocksRight) lift = Math.max(0, h - bar.top) + layout.gap;
  }
  return { layout, lift };
}

const HOLD_BUTTONS = [
  { code: 'KeyW', label: 'THRUST', area: 'thrust' },
  { code: 'KeyS', label: 'BRAKE', area: 'brake' },
  { code: 'ShiftLeft', label: 'BOOST', area: 'boost' },
] as const;

/**
 * On-screen controller for phones and tablets: an analog joystick on the left
 * and THRUST / BRAKE / BOOST / SCAN on the right. Uses Pointer Events with
 * pointer capture, so each thumb is tracked on its own and both hands can act
 * at once. Everything has touch-action: none, so the browser never turns a
 * steer into a scroll, zoom or rubber-band.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({ onSteer, onKey, onScan }) => {
  const [place, setPlace] = useState<Placement>(() => measure());
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stickPointer = useRef<number | null>(null);
  const centre = useRef({ x: 0, y: 0 });
  const held = useRef(new Set<string>());
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  // Re-measure on resize, rotation and on-screen keyboard / browser bar changes.
  useEffect(() => {
    const update = () => setPlace(measure());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    // The HUD bar mounts in the same render and settles a moment later; follow its size.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    const watchBar = () => {
      const bar = document.querySelector('.hud-controls');
      if (bar && observer) observer.observe(bar);
      update();
    };
    const settle = window.setTimeout(watchBar, 50);
    const late = window.setTimeout(update, 600);
    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(late);
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  // Block Safari pinch gestures and page bounce while the controller is up.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.documentElement.classList.add('touch-flight');
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.documentElement.classList.remove('touch-flight');
    };
  }, []);

  // Never leave the ship steering or thrusting after the controller goes away.
  useEffect(() => () => {
    onSteer(0, 0);
    for (const code of held.current) onKey(code, false);
    held.current.clear();
  }, [onSteer, onKey]);

  const moveKnob = (dx: number, dy: number) => {
    const r = place.layout.stick / 2;
    const k = knobOffset(dx, dy, r);
    if (knobRef.current) knobRef.current.style.transform = `translate(${k.x}px, ${k.y}px)`;
    const v = stickVector(dx, dy, r);
    onSteer(v.x, v.y);
  };

  const releaseStick = () => {
    stickPointer.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    onSteer(0, 0);
  };

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null) return;
    e.preventDefault();
    stickPointer.current = e.pointerId;
    capture(e.currentTarget, e.pointerId);
    const rect = baseRef.current!.getBoundingClientRect();
    centre.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    moveKnob(e.clientX - centre.current.x, e.clientY - centre.current.y);
  };
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointer.current) return;
    moveKnob(e.clientX - centre.current.x, e.clientY - centre.current.y);
  };
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === stickPointer.current) releaseStick();
  };

  const press = useCallback((code: string, down: boolean) => {
    if (down === held.current.has(code)) return;
    if (down) held.current.add(code); else held.current.delete(code);
    onKey(code, down);
    setPressed((p) => ({ ...p, [code]: down }));
  }, [onKey]);

  const holdHandlers = (code: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      capture(e.currentTarget, e.pointerId);
      press(code, true);
    },
    onPointerUp: () => press(code, false),
    onPointerCancel: () => press(code, false),
    onLostPointerCapture: () => press(code, false),
  });

  const { layout, lift } = place;
  const inset = (side: 'left' | 'right') => `calc(${layout.margin}px + env(safe-area-inset-${side}, 0px))`;
  const bottom = `calc(${layout.margin + lift}px + env(safe-area-inset-bottom, 0px))`;
  const size = (d: number) => ({ width: d, height: d });

  return (
    <div
      className="touch-controls fixed inset-0 z-30 pointer-events-none select-none"
      data-testid="touch-controls"
      data-orientation={layout.orientation}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Left: analog joystick */}
      <div
        ref={baseRef}
        role="slider"
        aria-label="Steering joystick: drag to yaw and pitch"
        aria-valuetext="centred"
        className="touch-stick absolute pointer-events-auto"
        style={{ ...size(layout.stick), left: inset('left'), bottom }}
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
        onLostPointerCapture={onStickUp}
      >
        <div className="touch-stick-cross" aria-hidden="true" />
        <div ref={knobRef} className="touch-stick-knob" style={size(Math.round(layout.stick * 0.42))} aria-hidden="true" />
      </div>

      {/* Right: action buttons, 2x2 with BOOST nearest the thumb */}
      <div
        className="absolute pointer-events-none grid items-end justify-items-end"
        style={{
          right: inset('right'),
          bottom,
          gap: layout.gap,
          gridTemplateColumns: `${layout.secondary}px ${layout.primary}px`,
          gridTemplateAreas: '"scan brake" "thrust boost"',
        }}
      >
        <button
          type="button"
          aria-label="Scan"
          className="touch-btn touch-btn-scan pointer-events-auto"
          style={{ ...size(layout.secondary), gridArea: 'scan' }}
          onPointerDown={(e) => { e.preventDefault(); onScan(); }}
        >
          SCAN
        </button>
        {HOLD_BUTTONS.map(({ code, label, area }) => {
          const d = area === 'boost' ? layout.primary : layout.secondary;
          return (
            <button
              key={code}
              type="button"
              aria-label={`${label[0]}${label.slice(1).toLowerCase()} (hold)`}
              aria-pressed={!!pressed[code]}
              className={`touch-btn touch-btn-${area} pointer-events-auto ${pressed[code] ? 'is-pressed' : ''}`}
              style={{ ...size(d), gridArea: area }}
              {...holdHandlers(code)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
