/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

const COLORS = ['#FF00E5', '#00F0FF', '#A6FF00', '#FFB000', '#FF4FD8'] as const;
const PARTICLE_CAPACITY = 512;
const ROCKET_CAPACITY = 8;
const MAX_CANVAS_PIXELS = 2_000_000;

interface Rocket {
  active: boolean;
  x: number;
  y: number;
  targetY: number;
  speed: number;
  color: number;
  tier: number;
  trailTimer: number;
}

interface PixelFireworksProps {
  onMajorExplosion?: () => void;
}

export function PixelFireworks({ onMajorExplosion }: PixelFireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onMajorExplosionRef = useRef(onMajorExplosion);

  useEffect(() => {
    onMajorExplosionRef.current = onMajorExplosion;
  }, [onMajorExplosion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Canvas 2D is unavailable; victory fireworks cannot render.');
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const particleX = new Float32Array(PARTICLE_CAPACITY);
    const particleY = new Float32Array(PARTICLE_CAPACITY);
    const particleVX = new Float32Array(PARTICLE_CAPACITY);
    const particleVY = new Float32Array(PARTICLE_CAPACITY);
    const particleLife = new Float32Array(PARTICLE_CAPACITY);
    const particleMaxLife = new Float32Array(PARTICLE_CAPACITY);
    const particleSize = new Uint8Array(PARTICLE_CAPACITY);
    const particleColor = new Uint8Array(PARTICLE_CAPACITY);
    const particleTier = new Uint8Array(PARTICLE_CAPACITY);
    const particleActive = new Uint8Array(PARTICLE_CAPACITY);
    const rockets: Rocket[] = Array.from({ length: ROCKET_CAPACITY }, () => ({
      active: false,
      x: 0,
      y: 0,
      targetY: 0,
      speed: 0,
      color: 0,
      tier: 0,
      trailTimer: 0,
    }));

    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let particleCursor = 0;
    let launchCount = 0;
    let nextLaunchAt = 0;
    let lastFrameAt = 0;
    let flash = 0;
    let frameId = 0;

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const emitParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      life: number,
      size: number,
      color: number,
      tier: number,
    ) => {
      for (let attempt = 0; attempt < PARTICLE_CAPACITY; attempt++) {
        const index = (particleCursor + attempt) % PARTICLE_CAPACITY;
        if (particleActive[index]) continue;

        particleCursor = (index + 1) % PARTICLE_CAPACITY;
        particleX[index] = x;
        particleY[index] = y;
        particleVX[index] = vx;
        particleVY[index] = vy;
        particleLife[index] = life;
        particleMaxLife[index] = life;
        particleSize[index] = size;
        particleColor[index] = color;
        particleTier[index] = tier;
        particleActive[index] = 1;
        return;
      }
    };

    const burst = (x: number, y: number, tier: number, color: number) => {
      const count = tier === 2 ? 72 : tier === 1 ? 34 : 14;
      const baseSpeed = tier === 2 ? 190 : tier === 1 ? 130 : 90;
      const life = tier === 2 ? 1.35 : tier === 1 ? 1.05 : 0.72;
      const size = tier === 2 ? 4 : tier === 1 ? 3 : 2;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
        const speed = baseSpeed * (0.65 + Math.random() * 0.55);
        emitParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          life * (0.75 + Math.random() * 0.4),
          size,
          color,
          tier,
        );
      }

      if (tier === 2) {
        flash = Math.max(flash, 1);
        onMajorExplosionRef.current?.();
      }
    };

    const launchRocket = () => {
      let rocket: Rocket | undefined;
      for (let i = 0; i < rockets.length; i++) {
        if (!rockets[i].active) {
          rocket = rockets[i];
          break;
        }
      }
      if (!rocket) return;

      const tier = launchCount % 8 === 7 ? 2 : Math.random() < 0.28 ? 0 : 1;
      launchCount++;
      rocket.active = true;
      rocket.x = width * (0.06 + Math.random() * 0.88);
      rocket.y = height + 8;
      rocket.targetY = height * (0.16 + Math.random() * 0.48);
      rocket.speed = height * (0.62 + Math.random() * 0.22);
      rocket.color = Math.floor(Math.random() * COLORS.length);
      rocket.tier = tier;
      rocket.trailTimer = 0;
    };

    const draw = (timestamp: number) => {
      const delta = lastFrameAt === 0 ? 0 : Math.min((timestamp - lastFrameAt) / 1000, 0.05);
      lastFrameAt = timestamp;
      context.clearRect(0, 0, width, height);

      if (timestamp >= nextLaunchAt) {
        launchRocket();
        nextLaunchAt = timestamp + 360 + Math.random() * 220;
      }

      for (let i = 0; i < rockets.length; i++) {
        const rocket = rockets[i];
        if (!rocket.active) continue;

        rocket.y -= rocket.speed * delta;
        rocket.trailTimer -= delta;
        if (rocket.trailTimer <= 0) {
          emitParticle(rocket.x, rocket.y, 0, 36, 0.24, 2, rocket.color, 0);
          rocket.trailTimer = 0.035;
        }

        context.fillStyle = COLORS[rocket.color];
        context.shadowColor = COLORS[rocket.color];
        context.shadowBlur = 8;
        context.fillRect(Math.round(rocket.x / 3) * 3, Math.round(rocket.y / 3) * 3, 3, 3);

        if (rocket.y <= rocket.targetY) {
          burst(rocket.x, rocket.targetY, rocket.tier, rocket.color);
          rocket.active = false;
        }
      }

      for (let i = 0; i < PARTICLE_CAPACITY; i++) {
        if (!particleActive[i]) continue;
        particleLife[i] -= delta;
        if (particleLife[i] <= 0) {
          particleActive[i] = 0;
          continue;
        }

        particleVY[i] += 78 * delta;
        particleVX[i] *= 1 - delta * 0.38;
        particleVY[i] *= 1 - delta * 0.18;
        particleX[i] += particleVX[i] * delta;
        particleY[i] += particleVY[i] * delta;

        context.globalAlpha = particleLife[i] / particleMaxLife[i];
        context.fillStyle = COLORS[particleColor[i]];
        context.shadowColor = COLORS[particleColor[i]];
        context.shadowBlur = particleTier[i] === 2 ? 9 : 5;
        const size = particleSize[i];
        context.fillRect(Math.round(particleX[i] / 3) * 3, Math.round(particleY[i] / 3) * 3, size, size);
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      if (flash > 0) {
        context.globalAlpha = flash * 0.1;
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, width, height);
        flash = Math.max(0, flash - delta * 2.8);
      }
      context.globalAlpha = 1;
      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      particleActive.fill(0);
      for (let i = 0; i < rockets.length; i++) rockets[i].active = false;
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pixel-fireworks absolute inset-0 z-20 h-full w-full pointer-events-none"
    />
  );
}
