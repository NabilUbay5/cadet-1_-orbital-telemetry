/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundManager } from '../audio/soundManager.ts';
import { CameraMode, GameState, MissionResult, MissionStage, TelemetryData } from '../types/game.ts';
import {
  createAsteroidDebris,
  createCadet1Craft,
  createCelestialEnvironment,
  createEnergyCube,
  createOxygenCanister,
  createSatelliteRelay,
  createSpaceStationAlpha,
  createWaypointRing,
} from './proceduralModels.ts';

// Pre-allocated math helpers to ensure zero GC in animation loop
const _vec3A = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _eulerA = new THREE.Euler(0, 0, 0, 'YXZ');

export class FlightEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Craft & Scene entities
  private craftGroup: THREE.Group;
  private leftFlame: THREE.Mesh;
  private rightFlame: THREE.Mesh;
  private leftThrusterLight: THREE.PointLight;
  private rightThrusterLight: THREE.PointLight;
  private stationAlpha: ReturnType<typeof createSpaceStationAlpha>;
  private satelliteRelay: ReturnType<typeof createSatelliteRelay>;
  private waypointRings: Array<ReturnType<typeof createWaypointRing>> = [];
  private energyCubes: Array<ReturnType<typeof createEnergyCube>> = [];
  private o2Cans: Array<ReturnType<typeof createOxygenCanister>> = [];
  private asteroids: Array<ReturnType<typeof createAsteroidDebris>> = [];
  private pulseSphere: THREE.Mesh | null = null;
  private pulseRadius: number = 0;
  private pulseActive: boolean = false;

  // Flight Physics & State
  private position: THREE.Vector3 = new THREE.Vector3(0, 0, 150);
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private angularVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private orientation: THREE.Quaternion = new THREE.Quaternion();
  private throttle: number = 0; // 0.0 - 1.0
  private boostCharge: number = 100; // 0 - 100 %
  private isBoosting: boolean = false;
  private hullIntegrity: number = 100;
  private oxygen: number = 100;
  private energy: number = 100;
  private flightAssist: boolean = true;
  private cameraMode: CameraMode = 'CHASE';

  // Multi-Stage Progression
  private stage: MissionStage = 1;
  private gameState: GameState = 'TITLE';
  private metSeconds: number = 0;
  private damageTakenCount: number = 0;
  private badgesUnlocked: string[] = [];

  // Stage 1: Ground School & Gravity Basics (Balance & Stabilization Task)
  private stabilizationTimer: number = 0;
  private readonly targetStabilizationTime: number = 4.0;
  private isCraftStabilized: boolean = false;
  private vectorRingsPassedCount: number = 0;
  private stage1Complete: boolean = false;

  // Stage 2: Atmosphere & Orbital Entry (3 Energy Cubes)
  private energyCubesCollectedCount: number = 0;
  private stage2Complete: boolean = false;

  // Stage 3: Deep Space Navigation (Satellite Alignment)
  private satelliteLockTimer: number = 0;
  private stage3Complete: boolean = false;

  // Game Feel & FX
  private hitstopDuration: number = 0;
  private cameraShake: number = 0;

  // Input System (Held & JustPressed)
  private heldKeys: Record<string, boolean> = {};
  private justPressedKeys: Record<string, boolean> = {};

  // External Callbacks
  private onTelemetryUpdate?: (telemetry: TelemetryData) => void;
  private onStateChange?: (state: GameState, result?: MissionResult) => void;
  private onStageTaskCompleted?: (stage: MissionStage) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onTelemetryUpdate?: (telemetry: TelemetryData) => void;
      onStateChange?: (state: GameState, result?: MissionResult) => void;
      onStageTaskCompleted?: (stage: MissionStage) => void;
    }
  ) {
    this.container = container;
    this.onTelemetryUpdate = callbacks.onTelemetryUpdate;
    this.onStateChange = callbacks.onStateChange;
    this.onStageTaskCompleted = callbacks.onStageTaskCompleted;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. WebGL Renderer configured for 8-Bit Pixel Grid
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Virtual Low-Res Buffer (upscaled via nearest-neighbor)
    const pixelScale = 3;
    const internalW = Math.max(280, Math.floor(this.container.clientWidth / pixelScale));
    const internalH = Math.max(180, Math.floor(this.container.clientHeight / pixelScale));
    this.renderer.setSize(internalW, internalH, false);

    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';

    this.container.appendChild(canvas);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.FogExp2(0x050508, 0.00085);

    this.camera = new THREE.PerspectiveCamera(
      62,
      this.container.clientWidth / this.container.clientHeight,
      0.2,
      3500
    );
    this.camera.position.set(0, 10, 180);

    // 4. Studio Environment Reflection
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // fallback
    }

    // 5. Lighting Setup
    const sunLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    sunLight.position.set(250, 400, 300);
    sunLight.castShadow = !this.isSoftwareGl;
    this.scene.add(sunLight);

    const hemisphereFill = new THREE.HemisphereLight(0x406085, 0x08090d, 1.2);
    this.scene.add(hemisphereFill);

    // 6. Build Celestial Environment & Craft
    const { stars, planet } = createCelestialEnvironment();
    this.scene.add(stars);
    this.scene.add(planet);

    const craft = createCadet1Craft();
    this.craftGroup = craft.group;
    this.leftFlame = craft.leftThrusterFlame;
    this.rightFlame = craft.rightThrusterFlame;
    this.leftThrusterLight = craft.leftThrusterLight;
    this.rightThrusterLight = craft.rightThrusterLight;
    this.craftGroup.position.copy(this.position);
    this.scene.add(this.craftGroup);

    // 7. Space Station Alpha
    this.stationAlpha = createSpaceStationAlpha();
    // 8. Stage 1 Vector Waypoint Rings (3 Rings)
    const ringPositions = [
      new THREE.Vector3(0, 8, 80),
      new THREE.Vector3(-18, 15, 10),
      new THREE.Vector3(20, 24, -60),
    ];
    this.waypointRings = ringPositions.map((pos, idx) => {
      const ring = createWaypointRing(idx, pos);
      this.scene.add(ring.group);
      return ring;
    });

    // 9. Stage 3 Satellite Relay
    this.satelliteRelay = createSatelliteRelay(new THREE.Vector3(0, 35, -340));
    this.scene.add(this.satelliteRelay.group);

    // 10. Stage 2 Energy Cubes (3 Cubes)
    const cubePositions = [
      new THREE.Vector3(-24, 18, -60),
      new THREE.Vector3(28, 26, -140),
      new THREE.Vector3(-18, 36, -230),
    ];
    this.energyCubes = cubePositions.map((pos) => {
      const cube = createEnergyCube(pos);
      this.scene.add(cube.group);
      return cube;
    });

    // 10. Oxygen Canisters
    const o2Positions = [
      new THREE.Vector3(18, 12, 60),
      new THREE.Vector3(-28, 25, -120),
      new THREE.Vector3(22, 36, -260),
    ];
    this.o2Cans = o2Positions.map((pos) => {
      const o = createOxygenCanister(pos);
      this.scene.add(o.group);
      return o;
    });

    // 11. Asteroids & Debris Field
    for (let a = 0; a < 36; a++) {
      const x = (Math.random() - 0.5) * 260;
      const y = (Math.random() - 0.5) * 90 + 20;
      const z = -40 - Math.random() * 320;
      if (Math.abs(x) < 20 && Math.abs(z - 100) < 50) continue;

      const scale = 3.5 + Math.random() * 7.5;
      const ast = createAsteroidDebris(new THREE.Vector3(x, y, z), scale);
      this.asteroids.push(ast);
      this.scene.add(ast.mesh);
    }

    // 12. Pulse Scanner Mesh
    const pulseGeo = new THREE.SphereGeometry(1, 12, 8);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    this.pulseSphere = new THREE.Mesh(pulseGeo, pulseMat);
    this.scene.add(this.pulseSphere);

    // Event Listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    this.clock.start();
    this.startLoop();
  }

  public setGameState(state: GameState) {
    this.gameState = state;
    if (state === 'PLAYING') {
      soundManager.ensureRunning();
    } else {
      soundManager.setThruster(0, false);
    }
  }

  public setBadges(badges: string[]) {
    this.badgesUnlocked = badges;
  }

  public resetSimulation() {
    this.position.set(0, 0, 150);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.orientation.identity();
    this.craftGroup.position.copy(this.position);
    this.craftGroup.quaternion.copy(this.orientation);

    this.throttle = 0;
    this.boostCharge = 100;
    this.isBoosting = false;
    this.hullIntegrity = 100;
    this.oxygen = 100;
    this.energy = 100;

    this.stage = 1;
    this.metSeconds = 0;
    this.damageTakenCount = 0;
    this.badgesUnlocked = [];

    this.stabilizationTimer = 0;
    this.isCraftStabilized = false;
    this.vectorRingsPassedCount = 0;
    this.stage1Complete = false;
    this.waypointRings.forEach((r) => {
      r.passed = false;
      r.group.visible = true;
    });

    this.energyCubesCollectedCount = 0;
    this.stage2Complete = false;
    this.energyCubes.forEach((c) => {
      c.collected = false;
      c.group.visible = true;
    });

    this.satelliteLockTimer = 0;
    this.stage3Complete = false;

    this.o2Cans.forEach((o) => {
      o.collected = false;
      o.group.visible = true;
    });

    this.setGameState('PLAYING');
    this.onStateChange?.('PLAYING');
  }

  public advanceToStage(nextStage: MissionStage) {
    this.stage = nextStage;
    this.throttle = 0.22; // Gentle baseline cruise speed
    soundManager.ensureRunning();
    soundManager.playWaypointPass();

    if (nextStage === 2) {
      this.position.set(0, 15, 0);
      this.velocity.set(0, 0, -12);
      this.orientation.identity();
    } else if (nextStage === 3) {
      this.position.set(0, 25, -180);
      this.velocity.set(0, 0, -10);
      this.orientation.identity();
    }
    this.craftGroup.position.copy(this.position);
    this.craftGroup.quaternion.copy(this.orientation);
  }

  public triggerVictoryFinal() {
    this.setGameState('VICTORY');
    const mins = Math.floor(this.metSeconds / 60);
    const secs = (this.metSeconds % 60).toFixed(1);
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;

    const result: MissionResult = {
      victory: true,
      reason: 'ALL 3 STAGES & ASTRONAUT CERTIFICATIONS CONFERRED',
      cadetRank: 'CHIEF ORBITAL COMMANDER',
      flightTimeFormatted: timeFormatted,
      metSeconds: this.metSeconds,
      readinessScore: 100,
      hullDamageTaken: this.damageTakenCount,
      energyCubesCollected: this.energyCubesCollectedCount,
      badgesEarned: 3,
      triviaScore: 9,
      totalTrivia: 9,
    };

    soundManager.playDockSuccess();
    this.onStateChange?.('VICTORY', result);
  }

  public cycleCamera() {
    if (this.cameraMode === 'CHASE') this.cameraMode = 'COCKPIT';
    else if (this.cameraMode === 'COCKPIT') this.cameraMode = 'ORBIT';
    else this.cameraMode = 'CHASE';
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public toggleFlightAssist(): boolean {
    this.flightAssist = !this.flightAssist;
    return this.flightAssist;
  }

  public triggerScannerPulse() {
    if (this.energy < 15) return;
    this.energy = Math.max(0, this.energy - 15);
    this.pulseActive = true;
    this.pulseRadius = 1;
    if (this.pulseSphere) {
      this.pulseSphere.position.copy(this.position);
      this.pulseSphere.visible = true;
    }
    soundManager.playScannerPing();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    const key = e.code.toLowerCase();
    if (!this.heldKeys[key]) {
      this.justPressedKeys[key] = true;
    }
    this.heldKeys[key] = true;

    if (e.code === 'KeyM') {
      soundManager.toggleMute();
    }
    if (e.code === 'KeyC') {
      this.cycleCamera();
    }
    if (e.code === 'KeyI') {
      this.toggleFlightAssist();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.gameState === 'PLAYING') {
        this.setGameState('PAUSED');
        this.onStateChange?.('PAUSED');
      } else if (this.gameState === 'PAUSED') {
        this.setGameState('PLAYING');
        this.onStateChange?.('PLAYING');
      }
    }
    if ((e.code === 'Space' || e.code === 'Enter') && this.gameState === 'TITLE') {
      this.resetSimulation();
    }
    if (e.code === 'KeyR' && (this.gameState === 'VICTORY' || this.gameState === 'DEFEAT')) {
      this.resetSimulation();
    }
    if (e.code === 'Space' && this.gameState === 'PLAYING') {
      this.triggerScannerPulse();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.code.toLowerCase();
    this.heldKeys[key] = false;
  };

  private onWindowBlur = () => {
    this.heldKeys = {};
    this.justPressedKeys = {};
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const pixelScale = 3;
    const internalW = Math.max(280, Math.floor(w / pixelScale));
    const internalH = Math.max(180, Math.floor(h / pixelScale));
    this.renderer.setSize(internalW, internalH, false);
  };

  private startLoop() {
    const tick = () => {
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.updateSimulation(dt);
      this.render();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number) {
    // Rotate station & satellite dish
    if (this.stationAlpha) {
      this.stationAlpha.rotatingRing.rotation.z += 0.08 * dt;
    }
    if (this.satelliteRelay) {
      this.satelliteRelay.group.rotation.y += 0.15 * dt;
    }

    // Tumble asteroids
    for (const ast of this.asteroids) {
      ast.mesh.rotation.x += ast.rotationSpeed.x * dt;
      ast.mesh.rotation.y += ast.rotationSpeed.y * dt;
      ast.mesh.rotation.z += ast.rotationSpeed.z * dt;
    }

    // Rotate energy cubes
    for (const cube of this.energyCubes) {
      if (!cube.collected) {
        cube.cube.rotation.y += 2.0 * dt;
        cube.cube.rotation.x += 1.0 * dt;
        cube.wire.rotation.z += 1.5 * dt;
      }
    }

    // Pulse Scanner Expansion
    if (this.pulseActive && this.pulseSphere) {
      this.pulseRadius += 95 * dt;
      this.pulseSphere.scale.setScalar(this.pulseRadius);
      const alpha = Math.max(0, 0.75 * (1 - this.pulseRadius / 160));
      (this.pulseSphere.material as THREE.MeshBasicMaterial).opacity = alpha;
      if (this.pulseRadius >= 160) {
        this.pulseActive = false;
        this.pulseSphere.visible = false;
      }
    }

    // Hitstop freeze handling
    if (this.hitstopDuration > 0) {
      this.hitstopDuration -= dt;
      this.updateCamera(dt);
      this.justPressedKeys = {};
      return;
    }

    if (this.gameState === 'TITLE') {
      const time = this.clock.getElapsedTime();
      this.craftGroup.position.set(0, Math.sin(time * 0.8) * 0.5, 150);
      this.craftGroup.rotation.set(0, Math.sin(time * 0.4) * 0.25, Math.cos(time * 0.5) * 0.08);

      this.camera.position.set(
        Math.cos(time * 0.25) * 14,
        4 + Math.sin(time * 0.2) * 2,
        150 + Math.sin(time * 0.25) * 14
      );
      this.camera.lookAt(this.craftGroup.position);
      this.justPressedKeys = {};
      return;
    }

    if (this.gameState !== 'PLAYING') {
      this.updateCamera(dt);
      this.justPressedKeys = {};
      return;
    }

    this.metSeconds += dt;

    // 1. Oxygen Depletion & Energy Recharge
    this.oxygen = Math.max(0, this.oxygen - 0.2 * dt);
    if (this.oxygen <= 0 && this.gameState === 'PLAYING') {
      this.triggerDefeat('CRITICAL LIFE SUPPORT: OXYGEN DEPLETED');
      return;
    }

    this.energy = Math.min(100, this.energy + 8 * dt);

    // 2. Flight Controls
    const held = this.heldKeys;

    if (held['keyw'] || held['arrowup']) {
      this.throttle = Math.min(1.0, this.throttle + 0.9 * dt);
    } else if (held['keys'] || held['arrowdown']) {
      this.throttle = Math.max(0.0, this.throttle - 1.2 * dt);
    }

    this.isBoosting = false;
    if ((held['shiftleft'] || held['shiftright']) && this.boostCharge > 2 && this.throttle > 0.1) {
      this.isBoosting = true;
      this.boostCharge = Math.max(0, this.boostCharge - 26 * dt);
    } else {
      this.boostCharge = Math.min(100, this.boostCharge + 14 * dt);
    }

    let yawInput = 0;
    if (held['keya'] || held['arrowleft']) yawInput += 1;
    if (held['keyd'] || held['arrowright']) yawInput -= 1;

    let pitchInput = 0;
    if (held['keyr']) pitchInput -= 1;
    if (held['keyf']) pitchInput += 1;

    let rollInput = 0;
    if (held['keyq']) rollInput += 1;
    if (held['keye']) rollInput -= 1;


    if (yawInput !== 0 || pitchInput !== 0 || rollInput !== 0) {
      if (Math.random() < 0.25) soundManager.playRcsBurst();
    }

    const turnRate = 1.4;
    this.angularVelocity.y += yawInput * turnRate * dt;
    this.angularVelocity.x += pitchInput * turnRate * dt;
    this.angularVelocity.z += rollInput * (turnRate * 1.5) * dt;

    const rotDamp = this.flightAssist ? 0.88 : 0.97;
    this.angularVelocity.multiplyScalar(Math.pow(rotDamp, dt * 60));

    _eulerA.set(
      this.angularVelocity.x * dt,
      this.angularVelocity.y * dt,
      this.angularVelocity.z * dt,
      'YXZ'
    );
    _quatA.setFromEuler(_eulerA);
    this.orientation.multiply(_quatA);
    this.craftGroup.quaternion.copy(this.orientation);

    // Thrust
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
    const speedMultiplier = this.isBoosting ? 65 : 38;
    const thrustAccel = forwardVector.multiplyScalar(this.throttle * speedMultiplier * dt);

    this.velocity.add(thrustAccel);

    if (this.flightAssist) {
      const linearDamp = 0.975;
      this.velocity.multiplyScalar(Math.pow(linearDamp, dt * 60));
    }

    this.position.addScaledVector(this.velocity, dt);
    this.craftGroup.position.copy(this.position);

    soundManager.setThruster(this.throttle, this.isBoosting);

    const flameScale = this.throttle * (this.isBoosting ? 2.4 : 1.2);
    this.leftFlame.scale.set(1, 1, Math.max(0.01, flameScale));
    this.rightFlame.scale.set(1, 1, Math.max(0.01, flameScale));
    this.leftThrusterLight.intensity = this.throttle * (this.isBoosting ? 4.0 : 2.0);
    this.rightThrusterLight.intensity = this.throttle * (this.isBoosting ? 4.0 : 2.0);

    // Collision with Asteroids
    for (const ast of this.asteroids) {
      const dist = this.position.distanceTo(ast.mesh.position);
      if (dist < ast.radius + 3.2) {
        const impactSpeed = this.velocity.length();
        const damage = Math.min(45, Math.max(8, Math.round(impactSpeed * 1.2)));
        this.hullIntegrity = Math.max(0, this.hullIntegrity - damage);
        this.damageTakenCount += damage;

        _vec3A.subVectors(this.position, ast.mesh.position).normalize();
        this.velocity.reflect(_vec3A).multiplyScalar(0.5);

        this.hitstopDuration = 0.055;
        this.cameraShake = Math.min(1.4, 0.4 + damage * 0.03);
        soundManager.playCollision(damage / 45);

        if (this.hullIntegrity <= 0) {
          this.triggerDefeat('HULL BREACH: SEVERE DEBRIS IMPACT');
          return;
        }
      }
    }

    // Oxygen canisters
    for (const o2 of this.o2Cans) {
      if (!o2.collected) {
        if (this.position.distanceTo(o2.group.position) < 4.5) {
          o2.collected = true;
          o2.group.visible = false;
          this.oxygen = Math.min(100, this.oxygen + 35);
          soundManager.playItemCollect();
        }
      }
    }

    // === STAGE SPECIFIC TASK LOGIC ===

    _eulerA.setFromQuaternion(this.orientation, 'YXZ');
    const pitchDeg = (_eulerA.x * 180) / Math.PI;
    const yawDeg = (_eulerA.y * 180) / Math.PI;

    // Stage 1: Ground School & Gravity Basics (Balance & Stabilization Mini-Task)
    if (this.stage === 1 && !this.stage1Complete) {
      // Gentle gravitational turbulence perturbs attitude unless counter-steered
      const turbPitch = Math.sin(this.metSeconds * 1.8) * 0.16;
      const turbYaw = Math.cos(this.metSeconds * 1.4) * 0.16;
      this.angularVelocity.x += turbPitch * dt;
      this.angularVelocity.y += turbYaw * dt;

      // Stable flight attitude requires holding pitch & yaw within ±4.5°
      const isLevel = Math.abs(pitchDeg) <= 4.5 && Math.abs(yawDeg) <= 4.5;
      this.isCraftStabilized = isLevel;

      if (isLevel) {
        this.stabilizationTimer += dt;
        if (this.stabilizationTimer >= this.targetStabilizationTime) {
          this.stage1Complete = true;
          this.stabilizationTimer = this.targetStabilizationTime;
          soundManager.playWaypointPass();
          this.onStageTaskCompleted?.(1);
        }
      } else {
        this.stabilizationTimer = Math.max(0, this.stabilizationTimer - dt * 0.5);
      }

      // Navigating through waypoint rings provides an immediate +1.0s calibration boost
      for (const ring of this.waypointRings) {
        if (!ring.passed) {
          const dist = this.position.distanceTo(ring.group.position);
          if (dist < ring.radius) {
            ring.passed = true;
            ring.group.visible = false;
            this.vectorRingsPassedCount++;
            this.stabilizationTimer = Math.min(this.targetStabilizationTime, this.stabilizationTimer + 1.0);
            soundManager.playItemCollect();

            if (this.stabilizationTimer >= this.targetStabilizationTime && !this.stage1Complete) {
              this.stage1Complete = true;
              soundManager.playWaypointPass();
              this.onStageTaskCompleted?.(1);
            }
          }
        }
      }
    }

    // Stage 2: Atmosphere & Orbital Entry (Collect 3 Energy Cubes)
    if (this.stage === 2 && !this.stage2Complete) {
      for (const cube of this.energyCubes) {
        if (!cube.collected) {
          if (this.position.distanceTo(cube.group.position) < 5.0) {
            cube.collected = true;
            cube.group.visible = false;
            this.energyCubesCollectedCount++;
            soundManager.playItemCollect();

            if (this.energyCubesCollectedCount >= 3) {
              this.stage2Complete = true;
              soundManager.playWaypointPass();
              this.onStageTaskCompleted?.(2);
            }
          }
        }
      }
    }

    // Stage 3: Deep Space Navigation (Align Satellite Telemetry Coordinates)
    const satPos = this.satelliteRelay.group.position;
    const distToSat = this.position.distanceTo(satPos);

    // Calculate heading error between craft forward and vector to satellite
    _vec3A.subVectors(satPos, this.position).normalize();
    const craftForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
    const alignDot = Math.max(-1, Math.min(1, craftForward.dot(_vec3A)));
    const alignErrorDeg = (Math.acos(alignDot) * 180) / Math.PI;

    if (this.stage === 3 && !this.stage3Complete) {
      if (distToSat < 45 && alignErrorDeg < 8.0) {
        this.satelliteLockTimer += dt;
        if (this.satelliteLockTimer >= 3.0) {
          this.stage3Complete = true;
          soundManager.playWaypointPass();
          this.onStageTaskCompleted?.(3);
        }
      } else {
        this.satelliteLockTimer = Math.max(0, this.satelliteLockTimer - dt * 0.6);
      }
    }

    this.updateCamera(dt);
    this.emitTelemetry(pitchDeg, yawDeg, distToSat, alignErrorDeg);
    this.justPressedKeys = {};
  }

  private updateCamera(dt: number) {
    let shakeOffset = new THREE.Vector3(0, 0, 0);
    if (this.cameraShake > 0.001) {
      shakeOffset.set(
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake
      );
      this.cameraShake *= Math.pow(0.88, dt * 60);
    }

    if (this.cameraMode === 'CHASE') {
      const targetPos = this.craftGroup.position;
      const backwards = new THREE.Vector3(0, 2.8, 11).applyQuaternion(this.orientation);
      const idealCameraPos = targetPos.clone().add(backwards).add(shakeOffset);

      this.camera.position.lerp(idealCameraPos, 1 - Math.exp(-8 * dt));
      const lookahead = targetPos.clone().add(new THREE.Vector3(0, 0.4, -12).applyQuaternion(this.orientation));
      this.camera.lookAt(lookahead);

      const targetFov = this.isBoosting ? 74 : 62 + this.throttle * 4;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'COCKPIT') {
      const cockpitMount = new THREE.Vector3(0, 0.4, -0.6).applyQuaternion(this.orientation);
      this.camera.position.copy(this.craftGroup.position).add(cockpitMount).add(shakeOffset);

      const lookAhead = this.camera.position.clone().add(new THREE.Vector3(0, 0, -25).applyQuaternion(this.orientation));
      this.camera.lookAt(lookAhead);

      const targetFov = this.isBoosting ? 82 : 72;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
      this.camera.updateProjectionMatrix();
    } else {
      const orbitPos = this.craftGroup.position.clone().add(new THREE.Vector3(12, 8, 16));
      this.camera.position.lerp(orbitPos, 0.05);
      this.camera.lookAt(this.craftGroup.position);
    }
  }

  private emitTelemetry(
    pitchDeg: number,
    yawDeg: number,
    distToSat: number,
    alignErrorDeg: number
  ) {
    if (!this.onTelemetryUpdate) return;

    const currentSpeed = this.velocity.length();
    let driftAngle = 0;
    if (currentSpeed > 0.5) {
      const craftForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
      const moveDir = this.velocity.clone().normalize();
      const dot = Math.max(-1, Math.min(1, craftForward.dot(moveDir)));
      driftAngle = (Math.acos(dot) * 180) / Math.PI;
    }

    const gForce = 1.0 + this.throttle * (this.isBoosting ? 4.2 : 2.1) + this.angularVelocity.length() * 1.5;

    // Stage Task Progress Calculation
    let stageTitle = '01 // GROUND SCHOOL';
    let stageTaskTitle = 'STABILIZE FLIGHT GYROS';
    let stageTaskProgress = Math.min(100, Math.round((this.stabilizationTimer / this.targetStabilizationTime) * 100));
    let stageTaskComplete = this.stage1Complete;

    if (this.stage === 2) {
      stageTitle = '02 // ORBITAL ENTRY';
      stageTaskTitle = 'HARVEST 3 ENERGY CUBES';
      stageTaskProgress = Math.round((this.energyCubesCollectedCount / 3) * 100);
      stageTaskComplete = this.stage2Complete;
    } else if (this.stage === 3) {
      stageTitle = '03 // DEEP SPACE';
      stageTaskTitle = 'ALIGN SATELLITE TELEMETRY';
      stageTaskProgress = Math.min(100, Math.round((this.satelliteLockTimer / 3.0) * 100));
      stageTaskComplete = this.stage3Complete;
    }

    let readiness = 15;
    if (this.stage1Complete) readiness += 25;
    if (this.stage2Complete) readiness += 30;
    if (this.stage3Complete) readiness += 30;

    // Proximity Radar
    let hazardWarning = false;
    let hazardDistance = 999;
    const radarBlips: TelemetryData['radarBlips'] = [];
    const craftInvQuat = this.orientation.clone().invert();

    for (const ast of this.asteroids) {
      const dist = this.position.distanceTo(ast.mesh.position);
      if (dist < 120) {
        if (dist < 28) {
          hazardWarning = true;
          hazardDistance = Math.min(hazardDistance, Math.round(dist));
        }
        _vec3A.subVectors(ast.mesh.position, this.position).applyQuaternion(craftInvQuat);
        radarBlips.push({
          x: _vec3A.x / 120,
          y: -_vec3A.z / 120,
          type: 'hazard',
          distance: Math.round(dist),
        });
      }
    }

    if (this.stage === 1) {
      for (const ring of this.waypointRings) {
        if (!ring.passed) {
          _vec3A.subVectors(ring.group.position, this.position).applyQuaternion(craftInvQuat);
          radarBlips.push({
            x: _vec3A.x / 140,
            y: -_vec3A.z / 140,
            type: 'waypoint',
            distance: Math.round(this.position.distanceTo(ring.group.position)),
          });
          break; // Show next immediate ring
        }
      }
    } else if (this.stage === 2) {
      for (const cube of this.energyCubes) {
        if (!cube.collected) {
          _vec3A.subVectors(cube.group.position, this.position).applyQuaternion(craftInvQuat);
          radarBlips.push({
            x: _vec3A.x / 140,
            y: -_vec3A.z / 140,
            type: 'cube',
            distance: Math.round(this.position.distanceTo(cube.group.position)),
          });
        }
      }
    } else if (this.stage === 3) {
      _vec3A.subVectors(this.satelliteRelay.group.position, this.position).applyQuaternion(craftInvQuat);
      radarBlips.push({
        x: _vec3A.x / 160,
        y: -_vec3A.z / 160,
        type: 'satellite',
        distance: Math.round(distToSat),
      });
    }

    const telemetry: TelemetryData = {
      metSeconds: this.metSeconds,
      velocity: Math.round(currentSpeed * 10) / 10,
      maxVelocity: 55,
      acceleration: Math.round(this.throttle * (this.isBoosting ? 65 : 38) * 10) / 10,
      gForce: Math.round(gForce * 10) / 10,
      pitch: Math.round(pitchDeg),
      yaw: Math.round(yawDeg),
      roll: Math.round((_eulerA.z * 180) / Math.PI),
      driftAngle: Math.round(driftAngle * 10) / 10,
      isInertialDrifting: driftAngle > 5.0,
      hullIntegrity: Math.round(this.hullIntegrity),
      oxygen: Math.round(this.oxygen),
      energy: Math.round(this.energy),
      boostCharge: Math.round(this.boostCharge),
      isBoosting: this.isBoosting,
      throttle: Math.round(this.throttle * 100),
      missionReadiness: readiness,
      cameraMode: this.cameraMode,
      flightAssist: this.flightAssist,
      isMuted: soundManager.getIsMuted(),

      stage: this.stage,
      stageTitle,
      stageTaskTitle,
      stageTaskProgress,
      stageTaskComplete,
      badgesUnlocked: this.badgesUnlocked,

      stabilizationProgress: stageTaskProgress,
      isStabilized: this.isCraftStabilized,
      vectorRingsPassed: this.vectorRingsPassedCount,
      totalVectorRings: 3,

      energyCubesCollected: this.energyCubesCollectedCount,
      totalEnergyCubes: 3,

      satelliteDistance: Math.round(distToSat),
      satelliteAlignment: Math.round(alignErrorDeg),
      satelliteLockProgress: Math.min(100, Math.round((this.satelliteLockTimer / 3.0) * 100)),

      telemetryPodsCollected: this.energyCubesCollectedCount,
      totalTelemetryPods: 3,
      energyCoresCollected: this.stage1Complete ? 1 : 0,
      totalEnergyCores: 3,
      waypointsPassed: this.stage,
      totalWaypoints: 3,

      hazardWarning,
      hazardDistance,
      radarBlips: radarBlips.slice(0, 10),
    };

    this.onTelemetryUpdate(telemetry);
  }

  private triggerDefeat(reason: string) {
    this.setGameState('DEFEAT');
    soundManager.setThruster(0, false);

    const mins = Math.floor(this.metSeconds / 60);
    const secs = (this.metSeconds % 60).toFixed(1);
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;

    const result: MissionResult = {
      victory: false,
      reason,
      cadetRank: 'CADET (STAGE INCOMPLETE)',
      flightTimeFormatted: timeFormatted,
      metSeconds: this.metSeconds,
      readinessScore: 30,
      hullDamageTaken: this.damageTakenCount,
      energyCubesCollected: this.energyCubesCollectedCount,
      badgesEarned: this.badgesUnlocked.length,
      triviaScore: 0,
      totalTrivia: 9,
    };

    this.onStateChange?.('DEFEAT', result);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);

    soundManager.setThruster(0, false);
    this.renderer.dispose();
  }
}
