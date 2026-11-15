import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { Starfall, STARFALL_DEPTH } from '../starfall.ts';
import { FIXED_DT } from '../fixedTimestep.ts';

function steps(effect: Starfall, count: number) { for (let i = 0; i < count; i++) effect.advance(FIXED_DT); }
function place(effect: Starfall, camera = new THREE.PerspectiveCamera(62, 16 / 10, 0.2, 3500), width = 426, height = 266) {
  effect.place(camera, width, height, true);
  return camera;
}
function head(effect: Starfall, camera: THREE.PerspectiveCamera) {
  const positions = effect.mesh.geometry.getAttribute('position');
  const center = new THREE.Vector3();
  for (let i = positions.count - 4; i < positions.count; i++) center.add(new THREE.Vector3().fromBufferAttribute(positions, i));
  return center.multiplyScalar(0.25).applyMatrix4(effect.mesh.matrix).project(camera);
}

describe('pooled atmospheric starfall', () => {
  test('first spawn is at 10 active seconds, lasts within 0.8–1.5 s, and repeats at 20 s', () => {
    let draws = 0;
    const effect = new Starfall(() => { draws++; return 0.5; });
    steps(effect, 599); place(effect); expect(effect.mesh.visible).toBe(false);
    steps(effect, 1); place(effect); expect(effect.mesh.visible).toBe(true);
    const firstDraws = draws;
    steps(effect, 47); place(effect); expect(effect.mesh.visible).toBe(true);
    steps(effect, 44); place(effect); expect(effect.mesh.visible).toBe(false);
    steps(effect, 508); place(effect); expect(draws).toBe(firstDraws);
    steps(effect, 1); place(effect); expect(effect.mesh.visible).toBe(true);
    expect(draws).toBe(firstDraws * 2);
    effect.dispose();
  });

  test('holds its progress without active steps, and restart requires a fresh 10 seconds', () => {
    const effect = new Starfall(() => 0.5);
    steps(effect, 630);
    const camera = place(effect);
    const before = head(effect, camera);
    const opacity = effect.mesh.material.uniforms.opacity.value;
    // Paused frames rebind the camera but never advance the simulation timer.
    for (let i = 0; i < 100; i++) place(effect, camera);
    expect(head(effect, camera).distanceTo(before)).toBeLessThan(1e-6);
    expect(effect.mesh.material.uniforms.opacity.value).toBe(opacity);
    effect.place(camera, 426, 266, false); expect(effect.mesh.visible).toBe(false);
    place(effect, camera); expect(effect.mesh.visible).toBe(true);
    effect.reset(); place(effect); expect(effect.mesh.visible).toBe(false);
    steps(effect, 599); place(effect); expect(effect.mesh.visible).toBe(false);
    steps(effect, 1); place(effect); expect(effect.mesh.visible).toBe(true);
    effect.dispose();
  });

  test('stays inside each camera frustum through translation, rotation, aspect, zoom and view offsets', () => {
    const effect = new Starfall(() => 0.5);
    steps(effect, 630);
    let expectedHead: THREE.Vector3 | undefined;
    for (const aspect of [0.55, 1, 16 / 9, 3]) {
      for (const fov of [62, 74, 82]) {
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.2, 3500);
        camera.position.set(9000, -300, 1700);
        camera.rotation.set(0.6, -2.4, 0.7);
        camera.zoom = 1.2;
        camera.updateProjectionMatrix();
        if (fov === 82) camera.setViewOffset(800, 600, 100, 40, 400, 400);
        place(effect, camera, 280, 180);
        const positions = effect.mesh.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          const local = new THREE.Vector3().fromBufferAttribute(positions, i);
          expect(local.z).toBe(-STARFALL_DEPTH);
          const projected = local.applyMatrix4(effect.mesh.matrix).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.95);
          expect(Math.abs(projected.y)).toBeLessThan(0.95);
          expect(projected.z).toBeGreaterThan(-1);
          expect(projected.z).toBeLessThan(1);
        }
        const projectedHead = head(effect, camera);
        if (expectedHead) {
          expect(projectedHead.x).toBeCloseTo(expectedHead.x, 5);
          expect(projectedHead.y).toBeCloseTo(expectedHead.y, 5);
        } else expectedHead = projectedHead;
        const a = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 4).applyMatrix4(effect.mesh.matrix).project(camera);
        const b = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 3).applyMatrix4(effect.mesh.matrix).project(camera);
        expect((b.x - a.x) * 280 / 2).toBeCloseTo(2, 4); // Crisp two-buffer-pixel core.
      }
    }
    effect.dispose();
  });

  test('both diagonal directions stay in view for the full shortest and longest lifetimes', () => {
    for (const randomValue of [0, 0.999]) {
      const effect = new Starfall(() => randomValue);
      steps(effect, 600);
      const camera = place(effect);
      let previous: THREE.Vector3 | undefined;
      let frames = 0;
      while (effect.mesh.visible) {
        const p = head(effect, camera);
        expect(Math.abs(p.x)).toBeLessThan(0.9);
        expect(Math.abs(p.y)).toBeLessThan(0.9);
        if (previous) {
          expect(p.y).toBeLessThan(previous.y);
          expect(randomValue === 0 ? p.x > previous.x : p.x < previous.x).toBe(true);
        }
        previous = p;
        frames++;
        steps(effect, 1); place(effect, camera);
      }
      expect(frames / 60).toBeGreaterThanOrEqual(0.8);
      expect(frames / 60).toBeLessThanOrEqual(1.5);
      effect.dispose();
    }
  });

  test('reduced motion hides immediately and does not queue a catch-up streak', () => {
    let draws = 0;
    const effect = new Starfall(() => { draws++; return 0.5; });
    effect.setReducedMotion(true);
    steps(effect, 660); place(effect); expect(draws).toBe(0); expect(effect.mesh.visible).toBe(false);
    effect.setReducedMotion(false);
    steps(effect, 539); place(effect); expect(effect.mesh.visible).toBe(false);
    steps(effect, 1); place(effect); expect(effect.mesh.visible).toBe(true);
    effect.setReducedMotion(true); expect(effect.mesh.visible).toBe(false);
    effect.dispose();
  });

  test('reuses every geometry/material/buffer and disposes them exactly once', () => {
    const effect = new Starfall(() => 0.5);
    const geometry = effect.mesh.geometry;
    const material = effect.mesh.material;
    const positions = geometry.getAttribute('position').array;
    const colors = geometry.getAttribute('tint').array;
    const index = geometry.index;
    const scene = new THREE.Scene(); scene.add(effect.mesh);
    for (let cycle = 0; cycle < 4; cycle++) { steps(effect, 600); place(effect); }
    expect(effect.mesh.geometry).toBe(geometry); expect(effect.mesh.material).toBe(material);
    expect(geometry.getAttribute('position').array).toBe(positions);
    expect(geometry.getAttribute('tint').array).toBe(colors); expect(geometry.index).toBe(index);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.depthWrite).toBe(false);
    let geometryDisposals = 0, materialDisposals = 0;
    geometry.addEventListener('dispose', () => geometryDisposals++);
    material.addEventListener('dispose', () => materialDisposals++);
    effect.dispose(); effect.dispose(); effect.advance(10); place(effect);
    expect(geometryDisposals).toBe(1); expect(materialDisposals).toBe(1);
    expect(scene.children.length).toBe(0); expect(effect.mesh.visible).toBe(false);
  });

  test('invalid elapsed inputs do not poison the interval timer', () => {
    const effect = new Starfall(() => 0.5);
    for (const dt of [NaN, Infinity, -1, 0]) effect.advance(dt);
    steps(effect, 600); place(effect); expect(effect.mesh.visible).toBe(true);
    effect.dispose();
  });
});
