/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

/** Fixed-size, craft-local twin exhaust trails. No allocations during update. */
export class ExhaustParticles {
  public readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly positions = new Float32Array(96 * 3);
  private readonly positionAttribute = new THREE.BufferAttribute(this.positions, 3);
  private phase = 0;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 8), 16);
    const material = new THREE.PointsMaterial({
      color: 0x60f4ff, size: 0.22, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = 'TwinThrusterExhaust';
    this.points.visible = false;
  }

  public update(dt: number, throttle: number, boosting: boolean): void {
    const level = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle)) : 0;
    this.points.visible = level > 0.01;
    if (!this.points.visible) return;
    this.phase = (this.phase + Math.max(0, dt) * (boosting ? 2.8 : 1.6)) % 1;
    const length = level * (boosting ? 14 : 7);
    for (let i = 0; i < 96; i++) {
      const age = (i / 48 + this.phase) % 1;
      const angle = i * 2.399963;
      const spread = (0.06 + age * 0.6) * level;
      const offset = i * 3;
      this.positions[offset] = (i < 48 ? -1.1 : 1.1) + Math.cos(angle) * spread;
      this.positions[offset + 1] = -0.05 + Math.sin(angle) * spread;
      this.positions[offset + 2] = 2.8 + age * length;
    }
    this.positionAttribute.needsUpdate = true;
    this.points.material.size = boosting ? 0.30 : 0.22;
    this.points.material.opacity = 0.35 + level * 0.5;
    this.points.material.color.setHex(boosting ? 0xffb54a : 0x60f4ff);
  }

  public dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
