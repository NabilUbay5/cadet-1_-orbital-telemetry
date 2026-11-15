import * as THREE from 'three';

export const STARFALL_INTERVAL_SECONDS = 10;
export const STARFALL_DEPTH = 700;
const TRAIL_SEGMENTS = 12;
const QUADS = TRAIL_SEGMENTS + 2; // Tail, a soft square halo, and a white pixel core.

/** One camera-relative atmospheric streak. All GPU/CPU buffers are owned and reused. */
export class Starfall {
  public readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly positions = new Float32Array(QUADS * 4 * 3);
  private readonly colors = new Float32Array(QUADS * 4 * 4);
  private readonly positionAttribute = new THREE.BufferAttribute(this.positions, 3);
  private readonly colorAttribute = new THREE.BufferAttribute(this.colors, 4);
  private readonly point = new THREE.Vector3();
  private intervalTime = 0;
  private age = 0;
  private duration = 1;
  private active = false;
  private reducedMotion = false;
  private disposed = false;
  private startX = 0;
  private startY = 0;
  private endX = 0;
  private endY = 0;

  constructor(private readonly random: () => number = Math.random) {
    const geometry = new THREE.BufferGeometry();
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('tint', this.colorAttribute);
    const indices = new Uint16Array(QUADS * 6);
    for (let q = 0; q < QUADS; q++) {
      const v = q * 4;
      const i = q * 6;
      indices[i] = v; indices[i + 1] = v + 1; indices[i + 2] = v + 2;
      indices[i + 3] = v + 2; indices[i + 4] = v + 1; indices[i + 5] = v + 3;
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: 0 } },
      vertexShader: `
        attribute vec4 tint;
        varying vec4 vTint;
        void main() {
          vTint = tint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec4 vTint;
        void main() { gl_FragColor = vec4(vTint.rgb, vTint.a * opacity); }
      `,
      transparent: true, blending: THREE.AdditiveBlending,
      depthTest: true, depthWrite: false, toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'AtmosphericStarfall';
    this.mesh.matrixAutoUpdate = false;
    this.mesh.frustumCulled = false; // Dynamic camera-relative geometry; no bounding-sphere work.
    this.mesh.visible = false;
  }

  /** Called only alongside active MET advancement, using the fixed simulation step. */
  public advance(dt: number): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    if (this.active) {
      this.age += dt;
      if (this.age >= this.duration) this.active = false;
    }
    this.intervalTime += dt;
    if (this.intervalTime + 1e-9 >= STARFALL_INTERVAL_SECONDS) {
      this.intervalTime = Math.max(0, this.intervalTime - STARFALL_INTERVAL_SECONDS) % STARFALL_INTERVAL_SECONDS;
      if (!this.reducedMotion) {
        this.spawn();
        this.age = this.intervalTime;
        if (this.age >= this.duration) this.active = false;
      }
    }
    if (!this.active) this.mesh.visible = false;
  }

  private spawn(): void {
    const side = this.random() < 0.5 ? -1 : 1;
    this.startX = side * (0.58 + this.random() * 0.22);
    this.startY = 0.72 + this.random() * 0.12;
    this.endX = -side * (0.58 + this.random() * 0.22);
    this.endY = -0.25 - this.random() * 0.3;
    this.duration = 0.8 + this.random() * 0.7;
    this.age = 0;
    this.active = true;
    const gold = this.random() < 0.35;
    for (let q = 0; q < QUADS; q++) {
      for (let v = 0; v < 4; v++) {
        const i = (q * 4 + v) * 4;
        const core = q === QUADS - 1;
        this.colors[i] = core || gold ? 1 : 0.25;
        this.colors[i + 1] = core ? 1 : gold ? 0.7 : 0.9;
        this.colors[i + 2] = core || !gold ? 1 : 0.25;
        const u = (q + (v >= 2 ? 1 : 0)) / TRAIL_SEGMENTS;
        this.colors[i + 3] = core ? 1 : q === TRAIL_SEGMENTS ? 0.2 : (1 - u) ** 2 * 0.75;
      }
    }
    this.colorAttribute.needsUpdate = true;
  }

  /** Bind to the final camera pose every rendered frame, including paused/camera-switch frames. */
  public place(camera: THREE.PerspectiveCamera, bufferWidth: number, bufferHeight: number, show: boolean): void {
    this.mesh.visible = !this.disposed && show && this.active && !this.reducedMotion;
    if (!this.mesh.visible || bufferWidth <= 0 || bufferHeight <= 0) return;
    camera.updateWorldMatrix(true, false);
    this.mesh.matrix.copy(camera.matrixWorld);
    this.mesh.matrixWorldNeedsUpdate = true;
    const t = this.age / this.duration;
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const length = Math.hypot(dx * bufferWidth, dy * bufferHeight);
    const normalX = -dy * bufferHeight / length * 2 / bufferWidth;
    const normalY = dx * bufferWidth / length * 2 / bufferHeight;
    for (let q = 0; q < TRAIL_SEGMENTS; q++) {
      const near = q / TRAIL_SEGMENTS;
      const far = (q + 1) / TRAIL_SEGMENTS;
      const nearT = Math.max(0, t - near * 0.22);
      const farT = Math.max(0, t - far * 0.22);
      const nearW = (1 - near) * 1.2;
      const farW = (1 - far) * 1.2;
      this.vertex(q * 4, this.startX + dx * nearT + normalX * nearW, this.startY + dy * nearT + normalY * nearW, camera);
      this.vertex(q * 4 + 1, this.startX + dx * nearT - normalX * nearW, this.startY + dy * nearT - normalY * nearW, camera);
      this.vertex(q * 4 + 2, this.startX + dx * farT + normalX * farW, this.startY + dy * farT + normalY * farW, camera);
      this.vertex(q * 4 + 3, this.startX + dx * farT - normalX * farW, this.startY + dy * farT - normalY * farW, camera);
    }
    const x = this.startX + dx * t;
    const y = this.startY + dy * t;
    this.square(TRAIL_SEGMENTS * 4, x, y, 4 / bufferWidth, 4 / bufferHeight, camera);
    this.square((TRAIL_SEGMENTS + 1) * 4, x, y, 2 / bufferWidth, 2 / bufferHeight, camera);
    this.mesh.material.uniforms.opacity.value = Math.max(0, Math.min(1, this.age / 0.08, (this.duration - this.age) / 0.18));
    this.positionAttribute.needsUpdate = true;
  }

  /** Inverse projection preserves NDC placement through aspect/FOV/zoom/view-offset changes. */
  private vertex(index: number, x: number, y: number, camera: THREE.PerspectiveCamera): void {
    this.point.set(x, y, 0).applyMatrix4(camera.projectionMatrixInverse);
    this.point.multiplyScalar(-STARFALL_DEPTH / this.point.z);
    const i = index * 3;
    this.positions[i] = this.point.x; this.positions[i + 1] = this.point.y; this.positions[i + 2] = this.point.z;
  }

  private square(index: number, x: number, y: number, halfX: number, halfY: number, camera: THREE.PerspectiveCamera): void {
    this.vertex(index, x - halfX, y - halfY, camera);
    this.vertex(index + 1, x + halfX, y - halfY, camera);
    this.vertex(index + 2, x - halfX, y + halfY, camera);
    this.vertex(index + 3, x + halfX, y + halfY, camera);
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) { this.active = false; this.mesh.visible = false; }
  }

  public reset(): void {
    this.intervalTime = this.age = 0;
    this.active = false;
    this.mesh.visible = false;
    this.mesh.material.uniforms.opacity.value = 0;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
