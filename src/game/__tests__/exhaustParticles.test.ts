import { expect, test } from 'bun:test';
import { ExhaustParticles } from '../exhaustParticles.ts';

test('exhaust is hidden at idle and reuses its buffer as thrust and boost increase', () => {
  const exhaust = new ExhaustParticles();
  const positions = exhaust.points.geometry.getAttribute('position');
  const original = positions.array;
  exhaust.update(1 / 60, 0, false);
  expect(exhaust.points.visible).toBe(false);
  exhaust.update(1 / 60, 1, false);
  expect(exhaust.points.visible).toBe(true);
  let normalLength = 0;
  for (let i = 0; i < positions.count; i++) normalLength = Math.max(normalLength, positions.getZ(i));
  exhaust.update(1 / 60, 1, true);
  let boostLength = 0;
  for (let i = 0; i < positions.count; i++) boostLength = Math.max(boostLength, positions.getZ(i));
  expect(boostLength).toBeGreaterThan(normalLength);
  expect(positions.array).toBe(original);
  expect(exhaust.points.material.color.getHex()).toBe(0xffb54a);
  exhaust.update(1 / 60, 0, false);
  expect(exhaust.points.visible).toBe(false);
  exhaust.dispose();
});
