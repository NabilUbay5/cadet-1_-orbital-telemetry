/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import type { DayForecast, OutpostState } from '../game/outpostLogic.ts';

/**
 * Animated picture of the outpost. It only reads game state, so it can never
 * change the rules. Buildings appear as they are built, solar arrays go dark at
 * night, broken machines flash, and astronauts walk outside when outdoor jobs
 * are scheduled.
 */

interface Props {
  s: OutpostState;
  f: DayForecast;
  shelter: boolean;
  outdoorBlocks: number;
}

const rand = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const STARS = (() => { const r = rand(7); return Array.from({ length: 80 }, () => ({ x: r(), y: r() * 0.55, s: r() * 1.4 + 0.4, t: r() * 6 })); })();
const CRATERS = (() => { const r = rand(11); return Array.from({ length: 8 }, () => ({ x: r(), y: 0.68 + r() * 0.28, w: 0.03 + r() * 0.05 })); })();
const DUST = (() => { const r = rand(23); return Array.from({ length: 60 }, () => ({ x: r(), y: r(), v: 0.3 + r() * 0.9, l: 20 + r() * 50 })); })();

export const OutpostScene: React.FC<Props> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let W = 0, H = 0, dpr = 1, frame = 0;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const box = (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
      ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    };
    const warn = (x: number, y: number, on: boolean, t: number) => {
      if (!on) return;
      ctx.fillStyle = Math.floor(t / 450) % 2 ? '#FF3344' : '#7A1E28';
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x - 6, y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 3, 2, 4); ctx.fillRect(x - 1, y + 2, 2, 1);
    };

    const draw = (t: number) => {
      frame = requestAnimationFrame(draw);
      if (!W || !H) return;
      const { s, f, shelter, outdoorBlocks } = propsRef.current;
      const mars = s.dest === 'mars', env = f.env;
      const M = s.modules, B = s.broken;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hz = H * 0.56, gy = H * 0.8, gy2 = H * 0.93;

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      if (mars) { sky.addColorStop(0, env.storm ? '#5E4331' : '#7E5236'); sky.addColorStop(1, env.storm ? '#A9835C' : '#D29C6C'); }
      else { sky.addColorStop(0, '#02030A'); sky.addColorStop(1, env.night ? '#05081A' : '#10162C'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
      if (!mars || env.night) for (const st of STARS) {
        ctx.globalAlpha = 0.5 + (reduce ? 0 : 0.35 * Math.sin(t / 900 + st.t));
        ctx.fillStyle = '#fff'; ctx.fillRect(st.x * W, st.y * H, st.s, st.s);
      }
      ctx.globalAlpha = 1;
      if (env.sunlight > 0.01 && !env.night) {
        const sx = W * 0.84, sy = hz * 0.3, r = mars ? 9 : 14;
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, r * 4);
        g.addColorStop(0, `rgba(255,240,190,${env.storm ? 0.35 : 0.9})`); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
        ctx.fillStyle = env.storm ? '#E8C9A0' : '#FFF6D0'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
      }
      if (!mars) { // Earth hangs in the lunar sky
        ctx.fillStyle = '#4D8CFF'; ctx.beginPath(); ctx.arc(W * 0.15, hz * 0.28, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#58C987'; ctx.beginPath(); ctx.arc(W * 0.15 - 3, hz * 0.28 - 2, 4, 0, 7); ctx.fill();
      }

      // Hills and ground
      ctx.fillStyle = mars ? '#844F33' : '#3A3E4C';
      ctx.beginPath(); ctx.moveTo(0, hz);
      for (let i = 0; i <= 24; i++) ctx.lineTo((i / 24) * W, hz - 8 - 14 * Math.abs(Math.sin(i * 1.7 + 1)) - 6 * Math.sin(i * 0.6));
      ctx.lineTo(W, hz); ctx.fill();
      const gg = ctx.createLinearGradient(0, hz, 0, H);
      if (mars) { gg.addColorStop(0, '#A8643F'); gg.addColorStop(1, '#6D3C27'); } else { gg.addColorStop(0, '#8D909C'); gg.addColorStop(1, '#4E515E'); }
      ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
      for (const c of CRATERS) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(c.x * W, c.y * H, c.w * W, c.w * W * 0.16, 0, 0, 7); ctx.fill(); }

      const lit = f.served.hab > 0.999;
      const sun = Math.max(0.15, Math.min(1, env.sunlight * (mars ? 3 : 1)));

      // Reactors (back left)
      for (let i = 0; i < M.reactor; i++) {
        const x = W * (0.03 + i * 0.05), w = W * 0.028, h = H * 0.17, bad = i >= M.reactor - B.reactor;
        box(x, gy - h, w, h, '#9AA0B4');
        box(x, gy - h * 0.55, w, h * 0.12, bad ? '#4A2B2B' : `rgba(255,141,63,${0.6 + (reduce ? 0 : 0.3 * Math.sin(t / 400))})`);
        warn(x + w / 2, gy - h - 9, bad, t);
      }
      // Solar arrays: back row of 5, front row of 5
      const panel = (i: number) => {
        const row = i < 5 ? 0 : 1, col = i % 5, bad = i >= M.solar - B.solar;
        const x = W * (0.63 + col * 0.071) + (row ? W * 0.02 : 0), by = row ? gy2 : gy - 2;
        const pw = W * 0.052, ph = H * (row ? 0.1 : 0.085);
        ctx.fillStyle = '#5C6176'; ctx.fillRect(x + pw / 2 - 1.5, by - ph * 0.5, 3, ph * 0.5);
        ctx.fillStyle = bad ? '#33384D' : env.night ? '#16213F' : `rgba(50,110,220,${0.45 + 0.5 * sun})`;
        ctx.beginPath(); ctx.moveTo(x, by - ph * 0.5); ctx.lineTo(x + pw, by - ph * 0.5); ctx.lineTo(x + pw - 6, by - ph * 1.5); ctx.lineTo(x + 6, by - ph * 1.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(190,215,255,.4)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let g = 1; g < 4; g++) { ctx.moveTo(x + (pw * g) / 4 + (3 - g) * 1.5, by - ph * 1.5); ctx.lineTo(x + (pw * g) / 4, by - ph * 0.5); }
        ctx.stroke();
        warn(x + pw / 2, by - ph * 1.5 - 8, bad, t);
      };
      for (let i = 0; i < Math.min(5, M.solar); i++) panel(i);
      // Greenhouses
      for (let i = 0; i < M.greenhouse; i++) {
        const x = W * (0.12 + i * 0.1), w = W * 0.085, h = H * 0.13, bad = i >= M.greenhouse - B.greenhouse;
        ctx.fillStyle = bad ? '#3D4A3C' : 'rgba(120,230,150,.35)'; ctx.strokeStyle = 'rgba(200,255,220,.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - h * 0.45); ctx.quadraticCurveTo(x + w / 2, gy - h * 1.5, x + w, gy - h * 0.45); ctx.lineTo(x + w, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bad ? '#55684F' : '#7FE06F';
        for (let p = 0; p < 4; p++) { ctx.beginPath(); ctx.ellipse(x + w * (0.2 + p * 0.2), gy - 6, 3.5, 7, 0, 0, 7); ctx.fill(); }
        warn(x + w / 2, gy - h * 1.2 - 4, bad, t);
      }
      // Habitat dome
      const R = Math.min(W * 0.1, H * 0.28), hx = W * 0.5;
      box(hx - R * 1.6, gy - R * 0.28, R * 0.7, R * 0.28, '#AAB0C0'); box(hx + R * 0.9, gy - R * 0.28, R * 0.7, R * 0.28, '#AAB0C0');
      const dg = ctx.createLinearGradient(hx - R, gy - R, hx + R, gy); dg.addColorStop(0, '#F1F3F8'); dg.addColorStop(1, '#9AA1B6');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(hx, gy, R, Math.PI, 0); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) box(hx - R * 0.68 + i * R * 0.4, gy - R * 0.46, R * 0.2, R * 0.16, lit ? '#FFD9A0' : '#333A52');
      ctx.strokeStyle = '#C9CEDA'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, gy - R); ctx.lineTo(hx, gy - R * 1.35); ctx.stroke();
      ctx.fillStyle = lit ? '#FF6270' : '#552222'; ctx.beginPath(); ctx.arc(hx, gy - R * 1.35, 2.5, 0, 7); ctx.fill();
      // Regolith shield: a soil mound that grows with each layer
      if (M.shield > 0) {
        const bw = R * (1.25 + 0.14 * M.shield), bh = R * (0.22 + 0.16 * M.shield);
        ctx.fillStyle = mars ? '#8A4F33' : '#7A7E8C'; ctx.beginPath(); ctx.ellipse(hx, gy + 2, bw, bh, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(hx + bw * 0.25, gy + 2, bw * 0.7, bh * 0.8, 0, Math.PI, 0); ctx.fill();
      }
      for (let i = 5; i < M.solar; i++) panel(i);
      // Front row: batteries, oxygen generators, water recyclers
      for (let i = 0; i < M.battery; i++) { const x = W * (0.03 + i * 0.034); box(x, gy2 - H * 0.05, W * 0.026, H * 0.05, '#3A4A6E', '#8AA6E0'); box(x + 3, gy2 - H * 0.05 + 3, W * 0.026 - 6, 3, s.res.battery > 1 ? '#52D9A2' : '#552222'); }
      for (let i = 0; i < M.o2gen; i++) {
        const x = W * (0.25 + i * 0.045), y = gy2 - H * 0.085, bad = i >= M.o2gen - B.o2gen;
        box(x, y, W * 0.034, H * 0.085, bad ? '#473A3A' : '#5AA9C8', '#BDE8FF');
        ctx.fillStyle = '#E8F8FF'; ctx.font = `700 ${Math.max(8, H * 0.03)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('O2', x + W * 0.017, y + H * 0.055);
        warn(x + W * 0.017, y - 8, bad, t);
      }
      for (let i = 0; i < M.recycler; i++) { const x = W * (0.37 + i * 0.04), y = gy2 - H * 0.09, bad = i >= M.recycler - B.recycler; box(x, y, W * 0.03, H * 0.09, bad ? '#473A3A' : '#4A74D8', '#A9C3FF'); warn(x + W * 0.015, y - 8, bad, t); }
      // Astronauts outside for outdoor jobs
      const walkers = shelter ? 0 : Math.min(f.crew, Math.ceil(outdoorBlocks / 2));
      for (let i = 0; i < walkers; i++) {
        const px = W * (0.6 + i * 0.07) + (reduce ? 0 : Math.sin(t / 700 + i) * 8), py = gy2 + 2;
        box(px - 5, py - 18, 10, 14, '#F4F4F8');
        ctx.fillStyle = '#F4F4F8'; ctx.beginPath(); ctx.arc(px, py - 22, 5.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#FF8D3F'; ctx.beginPath(); ctx.arc(px, py - 22, 3.2, 0, 7); ctx.fill();
        box(px - 4, py - 4, 3, 5, '#D9DCE6'); box(px + 1, py - 4, 3, 5, '#D9DCE6');
      }
      // Overlays
      if (env.night) { ctx.fillStyle = 'rgba(5,8,28,.4)'; ctx.fillRect(0, 0, W, H); }
      if (env.storm) {
        ctx.fillStyle = 'rgba(160,110,70,.32)'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(230,190,140,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (const d of DUST) { const x = ((d.x * W + (reduce ? 0 : t * d.v * 0.25)) % (W + 80)) - 40, y = d.y * H; ctx.moveTo(x, y); ctx.lineTo(x + d.l, y + 4); }
        ctx.stroke();
      }
      if (s.flareToday) { ctx.fillStyle = `rgba(255,140,60,${0.12 + (reduce ? 0 : 0.08 * Math.sin(t / 300))})`; ctx.fillRect(0, 0, W, H); }
      const tag = (text: string, color: string, x: number) => {
        ctx.font = '700 11px ui-monospace, monospace'; ctx.textAlign = 'left';
        const w = ctx.measureText(text).width + 16;
        ctx.fillStyle = 'rgba(8,12,24,.78)'; ctx.fillRect(x === -1 ? W - w - 8 : x, H - 30, w, 22);
        ctx.fillStyle = color; ctx.fillText(text, (x === -1 ? W - w - 8 : x) + 8, H - 15);
      };
      if (shelter) tag('CREW SHELTERING INSIDE', '#EAEEFB', 8);
      if (f.lifeSupportShort && Math.floor(t / 600) % 2) tag('POWER SHORTAGE', '#FF6270', -1);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);

  const { s, f } = props;
  const what = f.env.night ? 'night' : f.env.storm ? 'a dust storm' : 'daylight';
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Your ${s.dest === 'moon' ? 'Moon' : 'Mars'} outpost in ${what}: ${s.modules.solar} solar arrays, ${s.modules.reactor} reactors, ${s.modules.greenhouse} greenhouses, ${s.modules.shield} shield layers.`}
      className="block w-full border-2 border-[#2A3B5C]"
      style={{ aspectRatio: '16 / 6', minHeight: 170, maxHeight: 300, imageRendering: 'pixelated', background: '#000' }}
    />
  );
};
