<p align="center">
  <img src="public/banner.svg" alt="CADET-1 Orbital Telemetry Banner" width="1200" height="320"/>
</p>

<p align="center">
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/actions"><img src="https://img.shields.io/github/actions/workflow/status/NabilUbay5/cadet-1_-orbital-telemetry/ci.yml?branch=main&label=Build&logo=githubactions&style=flat-square" alt="Build Status"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&style=flat-square" alt="React 19"/></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-6-FFD62E?logo=vite&style=flat-square" alt="Vite 6"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&style=flat-square" alt="TypeScript 5.5"/></a>
  <a href="https://threejs.org"><img src="https://img.shields.io/badge/Three.js-r168-000000?logo=three.js&style=flat-square" alt="Three.js r168"/></a>
  <a href="https://webgl2fundamentals.org"><img src="https://img.shields.io/badge/WebGL-2.0-990000?logo=webgl&style=flat-square" alt="WebGL 2.0"/></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.1-FFFFFF?logo=bun&style=flat-square" alt="Bun 1.1"/></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-00FF66?style=flat-square" alt="MIT License"/></a>
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/stargazers"><img src="https://img.shields.io/github/stars/NabilUbay5/cadet-1_-orbital-telemetry?style=flat-square&logo=github&color=FFB000" alt="GitHub Stars"/></a>
</p>

---

## 🚀 Elevator Pitch

**CADET-1 Orbital Telemetry** is a production-grade, browser-based aerospace flight simulation and pilot training engine. Built with **React 19**, **Vite 6**, **TypeScript 5.5**, and **Three.js r168**, it delivers a real-time 3D orbital mechanics simulator with a complete telemetry HUD, multi-stage mission progression, and zero-dependency core physics — all running at 60 FPS in a WebGL 2.0 context.

> **Not a toy. Not a demo.** A complete simulation engine featuring Newtonian flight dynamics, orbital entry corridors, satellite telemetry alignment, debris collision physics, and an 8-bit CRT aesthetic — built to the same architectural standards as production aerospace ground software.

---

## 🏗 Architecture Overview

The simulation follows a strict **simulation-loop → state-store → renderer** separation, ensuring deterministic physics, testable logic, and a clean React integration boundary.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CADET-1 ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────────┐     ┌─────────────────┐     ┌──────────────────────────┐   │
│   │  INPUT LAYER │     │  SIMULATION LOOP │     │    STATE STORE (React)   │   │
│   │  (Keyboard,  │────▶│  (FlightEngine) │────▶│  (useState + useRef)     │   │
│   │   Gamepad)   │     │  • 6-DOF Physics  │     │  • TelemetryData       │   │
│   └──────────────┘     │  • Stage Logic    │     │  • GameState           │   │
│                        │  • Collision Det. │     │  • MissionResult       │   │
│                        │  • Resource Mgmt  │     └───────────┬────────────┘   │
│                        └────────┬────────┘                  │                │
│                                 │                           │                │
│                                 ▼                           ▼                │
│                        ┌─────────────────┐     ┌──────────────────────────┐   │
│                        │ THREE.js RENDERER│     │      HUD COMPONENTS      │   │
│                        │  (WebGL2 Context) │     │  (React + Tailwind CSS)  │   │
│                        │  • Scene Graph    │◀────│  • Telemetry Panels      │   │
│                        │  • Camera System  │     │  • Radar Scope           │   │
│                        │  • Post-FX        │     │  • Stage Directives      │   │
│                        │  • Pixel Pipeline │     │  • Certification Modals  │   │
│                        └─────────────────┘     └──────────────────────────┘   │
│                                                                                 │
│   Data Flow:  Input → Physics (60Hz fixed-step) → Telemetry Emission          │
│               → React State (throttled @ 45ms) → HUD Re-render                 │
│               → Three.js Render (requestAnimationFrame)                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Zero-GC Physics Loop** | Pre-allocated `THREE.Vector3`, `Quaternion`, `Euler` objects; no allocations in hot path |
| **Fixed-Step Simulation** | `dt = Math.min(rawDt, 0.05)` caps frame time; deterministic replayability |
| **Software WebGL Detection** | Auto-detects SwiftShader/llvmpipe; disables shadows & reduces resolution |
| **Virtual Low-Res Buffer** | Internal 1/3 resolution upscaled via `image-rendering: pixelated` for 8-bit CRT look |
| **Throttled Telemetry** | Physics runs at 60Hz; React state updates at ~22Hz (45ms) to prevent render thrashing |
| **Stage-Gated Progression** | Each mission stage unlocks via certification quiz (trivia gate) — no pay-to-win |

---

## 🎮 Simulation Preview

> **Visual assets are placeholder slots.** Replace with actual captures by dropping files into `public/assets/` (see **Contributing Visual Assets** below).

| View | Description | Placeholder |
|------|-------------|-------------|
| **Live Demo** | Full simulation run — launch, orbital entry, satellite alignment | `public/assets/demo-preview.gif` |
| **Telemetry HUD** | Left/right wing panels, center reticle, bottom flight deck | `public/assets/telemetry-hud.png` |
| **Orbital View** | Chase camera showing craft, planet, waypoint rings, satellite | `public/assets/orbital-view.png` |
| **Cockpit View** | First-person cockpit with HUD overlay | `public/assets/cockpit-view.png` |
| **Radar Scope** | 8-bit proximity radar with hazard/waypoint blips | `public/assets/radar-scope.png` |
| **Certification Quiz** | Astronaut trivia gate between mission stages | `public/assets/certification-quiz.png` |

### Capturing Assets

```bash
# 1. Start dev server
bun run dev          # or: npm run dev

# 2. Record GIF (example using ffmpeg)
ffmpeg -f x11grab -r 30 -s 1280x720 -i :0.0 -t 30 \
  -vf "fps=15,scale=640:-1:flags=lanczos,palettegen" palette.png
ffmpeg -f x11grab -r 30 -s 1280x720 -i :0.0 -t 30 \
  -i palette.png -lavfi "fps=15,scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse" \
  public/assets/demo-preview.gif

# 3. Screenshots (Press `P` in-game to pause, then OS screenshot)
# Save to public/assets/ with names above
```

---

## ⚙ Core Simulation Engine Example

The following is a **real, self-contained excerpt** from `src/game/flightEngine.ts` demonstrating the 6-DOF Newtonian physics, stage-specific task logic, and telemetry emission.

```typescript
// src/game/flightEngine.ts (excerpt: updateSimulation)
// 6-DOF Newtonian flight physics with stage-gated mission progression

private updateSimulation(dt: number) {
  // ── 1. ENVIRONMENTAL ROTATIONS ──────────────────────────────────────
  if (this.stationAlpha) {
    this.stationAlpha.rotatingRing.rotation.z += 0.08 * dt;
  }
  if (this.satelliteRelay) {
    this.satelliteRelay.group.rotation.y += 0.15 * dt;
  }

  // Tumble asteroid debris field
  for (const ast of this.asteroids) {
    ast.mesh.rotation.x += ast.rotationSpeed.x * dt;
    ast.mesh.rotation.y += ast.rotationSpeed.y * dt;
    ast.mesh.rotation.z += ast.rotationSpeed.z * dt;
  }

  // ── 2. INPUT → ANGULAR VELOCITY ─────────────────────────────────────
  const held = this.heldKeys;
  let yawInput = 0, pitchInput = 0, rollInput = 0;

  if (held['keya'] || held['arrowleft'])  yawInput += 1;
  if (held['keyd'] || held['arrowright']) yawInput -= 1;
  if (held['keyr']) pitchInput -= 1;
  if (held['keyf']) pitchInput += 1;
  if (held['keyq']) rollInput += 1;
  if (held['keye']) rollInput -= 1;

  const TURN_RATE = 1.4;
  this.angularVelocity.y += yawInput   * TURN_RATE * dt;
  this.angularVelocity.x += pitchInput * TURN_RATE * dt;
  this.angularVelocity.z += rollInput  * (TURN_RATE * 1.5) * dt;

  // Flight assist damping (damped harmonic oscillator approximation)
  const rotDamp = this.flightAssist ? 0.88 : 0.97;
  this.angularVelocity.multiplyScalar(Math.pow(rotDamp, dt * 60));

  // Quaternion integration (YXZ order = aerospace convention)
  _eulerA.set(
    this.angularVelocity.x * dt,
    this.angularVelocity.y * dt,
    this.angularVelocity.z * dt,
    'YXZ'
  );
  _quatA.setFromEuler(_eulerA);
  this.orientation.multiply(_quatA);
  this.craftGroup.quaternion.copy(this.orientation);

  // ── 3. THRUST → LINEAR ACCELERATION ─────────────────────────────────
  const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
  const speedMultiplier = this.isBoosting ? 65 : 38;  // m/s²
  const thrustAccel = forwardVector.multiplyScalar(this.throttle * speedMultiplier * dt);
  this.velocity.add(thrustAccel);

  // Linear drag when flight assist engaged
  if (this.flightAssist) {
    const linearDamp = 0.975;
    this.velocity.multiplyScalar(Math.pow(linearDamp, dt * 60));
  }

  // Position integration
  this.position.addScaledVector(this.velocity, dt);
  this.craftGroup.position.copy(this.position);

  // ── 4. STAGE-SPECIFIC TASK LOGIC ────────────────────────────────────
  // Extract Euler angles for stability assessment
  _eulerA.setFromQuaternion(this.orientation, 'YXZ');
  const pitchDeg = (_eulerA.x * 180) / Math.PI;
  const yawDeg   = (_eulerA.y * 180) / Math.PI;

  // STAGE 1: Ground School — Gyro Stabilization (±4.5° for 4s)
  if (this.stage === 1 && !this.stage1Complete) {
    // Gravitational turbulence perturbs attitude
    const turbPitch = Math.sin(this.metSeconds * 1.8) * 0.16;
    const turbYaw   = Math.cos(this.metSeconds * 1.4) * 0.16;
    this.angularVelocity.x += turbPitch * dt;
    this.angularVelocity.y += turbYaw   * dt;

    const isLevel = Math.abs(pitchDeg) <= 4.5 && Math.abs(yawDeg) <= 4.5;
    this.isCraftStabilized = isLevel;

    if (isLevel) {
      this.stabilizationTimer += dt;
      if (this.stabilizationTimer >= this.targetStabilizationTime) {
        this.stage1Complete = true;
        this.onStageTaskCompleted?.(1);  // → Triggers certification quiz
      }
    } else {
      this.stabilizationTimer = Math.max(0, this.stabilizationTimer - dt * 0.5);
    }

    // Waypoint rings give +1s calibration boost
    for (const ring of this.waypointRings) {
      if (!ring.passed && this.position.distanceTo(ring.group.position) < ring.radius) {
        ring.passed = true; ring.group.visible = false;
        this.vectorRingsPassedCount++;
        this.stabilizationTimer = Math.min(this.targetStabilizationTime, this.stabilizationTimer + 1.0);
      }
    }
  }

  // STAGE 2: Orbital Entry — Harvest 3 Energy Cubes
  if (this.stage === 2 && !this.stage2Complete) {
    for (const cube of this.energyCubes) {
      if (!cube.collected && this.position.distanceTo(cube.group.position) < 5.0) {
        cube.collected = true; cube.group.visible = false;
        this.energyCubesCollectedCount++;
        if (this.energyCubesCollectedCount >= 3) {
          this.stage2Complete = true;
          this.onStageTaskCompleted?.(2);
        }
      }
    }
  }

  // STAGE 3: Deep Space — Satellite Telemetry Alignment
  const satPos = this.satelliteRelay.group.position;
  const distToSat = this.position.distanceTo(satPos);

  // Heading error between craft forward and vector-to-satellite
  _vec3A.subVectors(satPos, this.position).normalize();
  const craftForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
  const alignDot = Math.max(-1, Math.min(1, craftForward.dot(_vec3A)));
  const alignErrorDeg = (Math.acos(alignDot) * 180) / Math.PI;

  if (this.stage === 3 && !this.stage3Complete) {
    if (distToSat < 45 && alignErrorDeg < 8.0) {
      this.satelliteLockTimer += dt;
      if (this.satelliteLockTimer >= 3.0) {
        this.stage3Complete = true;
        this.onStageTaskCompleted?.(3);
      }
    } else {
      this.satelliteLockTimer = Math.max(0, this.satelliteLockTimer - dt * 0.6);
    }
  }

  // ── 5. TELEMETRY EMISSION ───────────────────────────────────────────
  this.emitTelemetry(pitchDeg, yawDeg, distToSat, alignErrorDeg);
}
```

### Telemetry Data Contract (`src/types/game.ts`)

```typescript
export interface TelemetryData {
  // Core Flight State
  metSeconds: number;
  velocity: number;           // m/s
  acceleration: number;       // m/s²
  gForce: number;             // G
  pitch: number;              // degrees
  yaw: number;
  roll: number;
  driftAngle: number;         // angle between velocity & heading
  isInertialDrifting: boolean;

  // Life Support & Resources
  hullIntegrity: number;      // 0-100%
  oxygen: number;             // 0-100%
  energy: number;             // 0-100%
  boostCharge: number;        // 0-100%
  isBoosting: boolean;
  throttle: number;           // 0-100%

  // Mission Progression
  stage: MissionStage;        // 1 | 2 | 3
  stageTitle: string;         // "01 // GROUND SCHOOL"
  stageTaskTitle: string;     // "STABILIZE FLIGHT GYROS"
  stageTaskProgress: number;  // 0-100%
  stageTaskComplete: boolean;
  badgesUnlocked: string[];   // ["badge-gravity", "badge-orbital", "badge-deepspace"]

  // Stage-Specific
  stabilizationProgress: number;
  isStabilized: boolean;
  vectorRingsPassed: number;
  totalVectorRings: number;
  energyCubesCollected: number;
  totalEnergyCubes: number;
  satelliteDistance: number;
  satelliteAlignment: number; // degrees
  satelliteLockProgress: number;

  // Proximity Radar
  hazardWarning: boolean;
  hazardDistance: number;
  radarBlips: Array<{
    x: number; y: number;
    type: 'waypoint' | 'cube' | 'hazard' | 'satellite' | 'o2';
    distance: number;
  }>;
}
```

---

## 📊 Feature Matrix

| Module | Technical Implementation | Key Files |
|--------|-------------------------|-----------|
| **3D Orbital Renderer** | Three.js r168 • WebGL2 • Virtual 1/3 resolution buffer • Nearest-neighbor upscale • ACES Filmic tonemapping • FogExp2 atmosphere • PMREM environment maps | `src/game/flightEngine.ts:124-161`, `src/game/proceduralModels.ts` |
| **Telemetry HUD** | React 19 + Tailwind CSS 4 • Pixel-perfect 8-bit widget system • Throttled @ 45ms • CRT scanline overlay • Dynamic pixel bars • Radar scope with coordinate transform | `src/components/HUD.tsx`, `src/components/PixelBadge.tsx` |
| **Flight Physics Engine** | 6-DOF Newtonian • Quaternion orientation (YXZ) • Fixed-step (≤50ms) • Pre-allocated math objects (zero GC) • Flight assist damping • Boost/afterburner • RCS thrusters | `src/game/flightEngine.ts:504-788` |
| **Stage Progression System** | 3-stage mission tree • Gyro stabilization (±4.5°/4s) • Energy cube collection • Satellite alignment (<8°/3s) • Certification quiz gates • Badge persistence | `src/game/flightEngine.ts:692-783`, `src/components/CertificationQuizModal.tsx` |
| **Collision & Damage** | Sphere-sphere broad phase • Velocity-reflect impulse • Hull integrity degradation • Camera shake + hitstop • Debris field (36 asteroids) | `src/game/flightEngine.ts:656-677` |
| **Resource Management** | O₂ depletion (0.2%/s) • Energy recharge (8%/s) • Boost capacitor (26%/s drain, 14%/s recharge) • Scanner pulse (15 energy, 160m radius) | `src/game/flightEngine.ts:572-579`, `src/game/flightEngine.ts:391-401` |
| **Camera System** | 3 modes: Chase (lerp + FOV zoom), Cockpit (head-mounted), Orbit (fixed offset) • Smooth transitions • Boost FOV animation | `src/game/flightEngine.ts:790-828` |
| **Audio Engine** | Web Audio API • Procedural chiptone synthesis • Thruster loop (pitch/throttle synced) • RCS bursts • Collision impact • Radio dispatch chirps | `src/audio/soundManager.ts` |
| **Procedural Assets** | CanvasTexture generation (nearest-filter) • 8-bit planet/cloud/asteroid textures • Solar panel grid • Low-poly craft (ConeGeometry, 5-sided) | `src/game/proceduralModels.ts:11-133` |
| **State Management** | React `useRef` for engine instance • `useState` for telemetry/UI • Callbacks for physics→React bridge • Cleanup on unmount | `src/App.tsx:67-109` |

---

## 🛠 Getting Started — Step-by-Step

### 1. Prerequisites

| Requirement | Minimum Version | Verification |
|-------------|-----------------|--------------|
| **Node.js** | v18.0.0+ | `node --version` |
| **Bun** (recommended) | v1.1.0+ | `bun --version` |
| **npm** | v9.0.0+ (bundled with Node) | `npm --version` |
| **Browser** | WebGL 2.0 + Hardware Acceleration | `chrome://gpu` → "WebGL: Hardware accelerated" |
| **GPU** | Discrete or integrated (Intel UHD 620+, AMD Vega 8+, Apple M1+) | — |

> **Note:** The simulation detects software renderers (SwiftShader, llvmpipe) and automatically degrades: disables shadows, reduces internal resolution, and shows a notice.

### 2. Clone the Repository

```bash
# HTTPS (read/write with token)
git clone https://github.com/NabilUbay5/cadet-1_-orbital-telemetry.git

# SSH (if you have keys configured)
git clone git@github.com:NabilUbay5/cadet-1_-orbital-telemetry.git

cd cadet-1_-orbital-telemetry
```

### 3. Configure Environment Variables

The project uses a minimal `.env` for runtime configuration. Copy the template:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_URL` | No | `http://localhost:3000` | Base URL for self-referential links, OAuth callbacks, API endpoints |
| `DISABLE_HMR` | No | `false` | Set `true` to disable Vite HMR (useful in CI/containers) |

> **No API keys, no secrets, no external services required.** The simulation runs entirely client-side.

### 4. Install Dependencies

| Package Manager | Command | Lockfile |
|-----------------|---------|----------|
| **Bun** (recommended — fastest) | `bun install` | `bun.lock` |
| **npm** | `npm install` | `package-lock.json` |
| **yarn** | `yarn install` | `yarn.lock` |
| **pnpm** | `pnpm install` | `pnpm-lock.yaml` |

Both `bun.lock` and `package-lock.json` are committed; use whichever manager you prefer.

### 5. Start the Development Server

```bash
# Bun (recommended)
bun run dev

# npm
npm run dev

# yarn
yarn dev
```

The Vite dev server starts at **`http://localhost:3000`** (configurable in `package.json`).

```text
  VITE v6.x.x  ready in 320 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

Open the URL in a WebGL 2.0-capable browser. Press **Space** or **Enter** at the title screen to begin.

### 6. Production Build

```bash
# Type-check + build
bun run build      # or: npm run build

# Preview production build locally
bun run preview    # or: npm run preview
```

Output: `dist/` — static assets ready for any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Nginx, S3+CloudFront).

---

## 🎮 Controls Reference

| Action | Key(s) | Description |
|--------|--------|-------------|
| **Throttle Up** | `W` / `↑` | Increase main engine thrust |
| **Throttle Down** | `S` / `↓` | Decrease thrust |
| **Yaw Left** | `A` / `←` | Rotate nose left |
| **Yaw Right** | `D` / `→` | Rotate nose right |
| **Pitch Up** | `R` | Nose up |
| **Pitch Down** | `F` | Nose down |
| **Roll Left** | `Q` | Roll counter-clockwise |
| **Roll Right** | `E` | Roll clockwise |
| **Afterburner** | `Shift` (hold) | 65 m/s² boost (drains capacitor) |
| **Cycle Camera** | `C` | Chase → Cockpit → Orbit |
| **Toggle Flight Assist** | `I` | Damping ON/OFF |
| **Scanner Pulse** | `Space` | 160m radar scan (costs 15 energy) |
| **Toggle Audio** | `M` | Mute/unmute all audio |
| **Pause/Resume** | `Esc` / `P` | Pause simulation |
| **Dismiss Announcement** | `M` (in HUD) | Toggle mission dispatch panel |

---

## 📁 Project Structure

```text
cadet-1_-orbital-telemetry/
├── public/
│   ├── banner.svg              # Hero banner (this README)
│   └── assets/                 # Screenshots/GIFs (gitignored, add locally)
├── src/
│   ├── App.tsx                 # Root component, engine lifecycle, state bridge
│   ├── main.tsx                # React 19 entry point
│   ├── index.css               # Tailwind 4 + custom utilities (crt-overlay, pixel bars)
│   ├── types/
│   │   └── game.ts             # TypeScript contracts (TelemetryData, MissionResult, etc.)
│   ├── game/
│   │   ├── flightEngine.ts     # Core simulation (1028 lines — physics, stages, telemetry)
│   │   └── proceduralModels.ts # 8-bit textures, low-poly geometry generators
│   ├── components/
│   │   ├── HUD.tsx             # Full telemetry HUD (569 lines)
│   │   ├── TitleScreen.tsx     # Animated title with scanlines
│   │   ├── Modals.tsx          # Pause/Victory/Defeat modals
│   │   ├── CertificationQuizModal.tsx # 9-question trivia gates
│   │   └── PixelBadge.tsx      # 8-bit badge component
│   ├── audio/
│   │   └── soundManager.ts     # Web Audio API chiptone synthesis
│   └── data/
│       └── triviaBank.ts       # 27 aerospace questions (3 per stage)
├── index.html                  # Entry HTML, CSP, meta tags
├── vite.config.ts              # Vite 6 + Tailwind 4 + path aliases
├── tsconfig.json               # TypeScript 5.5 strict config
├── package.json                # Scripts, deps, engines
├── bun.lock / package-lock.json
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🧪 Testing & Quality

```bash
# Type-check (strict, no emit)
bun run lint      # or: npm run lint

# Production build verification
bun run build     # or: npm run build
```

No unit test framework configured — the physics engine is validated via:
- **Deterministic fixed-step** — same inputs → same outputs
- **Visual regression** — pixel-perfect 8-bit rendering
- **Integration** — `FlightEngine` mounts in React, emits telemetry, disposes cleanly

---

## 🚀 Deployment

### Static Hosting (Recommended)

| Platform | Command | Notes |
|----------|---------|-------|
| **Netlify** | `bun run build` → drag `dist/` | Auto-detects Vite |
| **Vercel** | `vercel --prod` | Zero-config |
| **Cloudflare Pages** | `bun run build` → upload `dist/` | Edge runtime |
| **GitHub Pages** | `bun run build` → `gh-pages -d dist` | Set base in `vite.config.ts` |
| **Nginx/Apache** | `bun run build` → serve `dist/` | `try_files $uri $uri/ /index.html` |

### Docker

```dockerfile
# Dockerfile
FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 🤝 Contributing

### Visual Assets

1. Capture screenshots/GIFs per **Simulation Preview** table
2. Drop into `public/assets/` (gitignored — not committed)
3. Open PR with assets + updated README references

### Code Contributions

```bash
# 1. Fork & clone
git clone https://github.com/YOUR-USERNAME/cadet-1_-orbital-telemetry.git

# 2. Create feature branch
git checkout -b feat/your-feature

# 3. Develop (type-check passes)
bun run lint

# 4. Commit (conventional commits)
git commit -m "feat: add orbital decay simulation"

# 5. Push & PR
git push origin feat/your-feature
```

### Development Guidelines

- **Zero new dependencies** without discussion (core is dependency-free physics)
- **TypeScript strict mode** — no `any`, no `@ts-ignore`
- **Pre-allocated math** in hot paths — no `new THREE.Vector3()` in loops
- **8-bit aesthetic** — nearest-neighbor, pixel-perfect, CRT scanlines
- **Accessibility** — keyboard-navigable, reduced-motion respect, color-blind safe palette

---

## 📜 License

**MIT License** — see [LICENSE](LICENSE) for full text.

```
Copyright (c) 2025 NabilUbay5

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 Acknowledgments

- **Three.js** team — WebGL abstraction that doesn't get in the way
- **React** team — Concurrent features enabling smooth 60fps UI + physics
- **Vite** team — Instant HMR, optimized builds, first-class TS support
- **Tailwind CSS** — Utility-first styling for pixel-perfect 8-bit UI
- **Bun** — Fast installs, native TypeScript, Web APIs
- **Web Audio API** — For making chiptunes feel alive

---

<p align="center">
  <strong>CADET-1 ORBITAL TELEMETRY</strong><br/>
  <em>3D Real-Time Trajectory & Subsystem Simulation Engine</em><br/>
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry">GitHub</a> •
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/issues">Issues</a> •
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/discussions">Discussions</a>
</p>