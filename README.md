<p align="center">
  <img src="./public/banner.svg" alt="CADET-1 Orbital Telemetry Banner" width="1200" height="320"/>
</p>

<p align="center">
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/NabilUbay5/cadet-1_-orbital-telemetry/ci.yml?branch=main&label=Build&logo=githubactions&style=flat-square" alt="Build Status"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&style=flat-square" alt="React 19"/></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-8-FFD62E?logo=vite&style=flat-square" alt="Vite 8"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&style=flat-square" alt="TypeScript 7"/></a>
  <a href="https://threejs.org"><img src="https://img.shields.io/badge/Three.js-r187-000000?logo=three.js&style=flat-square" alt="Three.js r187"/></a>
  <a href="https://webgl2fundamentals.org"><img src="https://img.shields.io/badge/WebGL-2.0-990000?logo=webgl&style=flat-square" alt="WebGL 2.0"/></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.4.4-FFFFFF?logo=bun&style=flat-square" alt="Bun 1.4.4"/></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-00FF66?style=flat-square" alt="MIT License"/></a>
  <a href="https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/stargazers"><img src="https://img.shields.io/github/stars/NabilUbay5/cadet-1_-orbital-telemetry?style=flat-square&logo=github&color=FFB000" alt="GitHub Stars"/></a>
</p>

---

## 🚀 Elevator Pitch

**CADET-1 Orbital Telemetry** is a browser-based flight simulation and astronaut training game built with **React 19**, **Vite 8**, **TypeScript 7**, and **Three.js r187**. It combines a WebGL 2.0 scene, arcade flight dynamics, live telemetry, three mission stages, and certification quizzes in an 8-bit CRT aesthetic.

Frame rate depends on the browser and renderer. Hardware rendering uses `requestAnimationFrame`; software rendering uses GPU synchronization and a timed fallback. The flight model is implemented in the project using Three.js math helpers, without a separate physics engine.

---

## 🏗 Architecture Overview

The engine owns the simulation state and renders the Three.js scene. It sends telemetry and mission callbacks to React, which manages the HUD, quizzes, and modals. Keyboard events and HUD callbacks control the engine.

```text
+---------------------------------------------------------------+
| CADET-1 ARCHITECTURE                                          |
|                                                               |
| Keyboard / HUD controls                                       |
|            |                                                  |
|            v                                                  |
| +-------------------------+       +-------------------------+ |
| | FlightEngine            |------>| Three.js renderer       | |
| | Physics + mission state |       | Scene + camera + canvas | |
| +-------------------------+       +-------------------------+ |
|            |                                                  |
|            | telemetry callbacks                              |
|            v                                                  |
| +-------------------------+       +-------------------------+ |
| | React state (App)       |------>| HUD + quizzes + modals  | |
| | Updates >= 45 ms apart  |       | React + Tailwind CSS    | |
| +-------------------------+       +-------------------------+ |
+---------------------------------------------------------------+
```

### Key Architectural Decisions

| Decision                     | Implementation                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Reused math helpers**      | Shared vector, quaternion, and Euler helpers; per-frame allocations still exist.         |
| **Capped variable timestep** | Frame delta is capped at 0.05 s; there is no fixed-step accumulator or replay system.    |
| **Software WebGL detection** | Detects software renderers, disables shadows, and uses GPU fences plus timed scheduling. |
| **Low-resolution canvas**    | One-third viewport dimensions, with a 280 × 180 minimum, upscaled using pixelated CSS.   |
| **Throttled telemetry**      | React accepts telemetry updates at least 45 ms apart, at most about 22 updates/s.        |
| **Quiz-gated progression**   | Each stage requires a three-question quiz; all answers must be correct to advance.       |

---

## 🎮 Simulation Preview

> **WIP — preview captures are not yet available.** The filenames below are planned assets, not broken image links. Once a capture is added to `public/assets/`, replace its WIP status with a relative image embed (see **Contributing Visual Assets** below).

| View                   | Description                                                      | Status | Planned asset                          |
| ---------------------- | ---------------------------------------------------------------- | ------ | -------------------------------------- |
| **Live Demo**          | Full simulation run — launch, orbital entry, satellite alignment | WIP    | `public/assets/demo-preview.gif`       |
| **Telemetry HUD**      | Left/right wing panels, center reticle, bottom flight deck       | WIP    | `public/assets/telemetry-hud.png`      |
| **Orbital View**       | Chase camera showing craft, planet, waypoint rings, satellite    | WIP    | `public/assets/orbital-view.png`       |
| **Cockpit View**       | First-person cockpit with HUD overlay                            | WIP    | `public/assets/cockpit-view.png`       |
| **Radar Scope**        | 8-bit proximity radar with hazard/waypoint blips                 | WIP    | `public/assets/radar-scope.png`        |
| **Certification Quiz** | Astronaut trivia gate between mission stages                     | WIP    | `public/assets/certification-quiz.png` |

### Capturing Assets

```bash
# 1. Start dev server
bun run dev

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

The following is an **illustrative, condensed excerpt** of the flight and stage logic. It omits resource handling, audio, collision responses, and some state updates. See [flightEngine.ts](src/game/flightEngine.ts) for the complete implementation.

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

Selected fields are shown below. The complete [TelemetryData interface](src/types/game.ts) also includes camera settings, resource totals, readiness, and audio state.

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
    type: 'waypoint' | 'cube' | 'pod' | 'hazard' | 'satellite' | 'o2';
    distance: number;
  }>;
}
```

---

## 📊 Feature Matrix

| Module                   | Current implementation                                                                                | Source                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **3D renderer**          | Three.js r187, WebGL2, low-resolution canvas, ACES tone mapping, fog, and PMREM lighting.             | [Engine](src/game/flightEngine.ts)                                                    |
| **Telemetry HUD**        | React 19, Tailwind CSS 4, CRT overlay, pixel bars, and craft-relative radar.                          | [HUD](src/components/HUD.tsx), [App](src/App.tsx)                                     |
| **Flight physics**       | Thrust, quaternion rotation, capped variable timestep, flight assist, and boost.                      | [Engine](src/game/flightEngine.ts)                                                    |
| **Stage progression**    | Gyro calibration, three energy cubes, satellite alignment, and three quiz gates.                      | [Engine](src/game/flightEngine.ts), [Quiz](src/components/CertificationQuizModal.tsx) |
| **Mission thresholds**   | ±4.5° pitch/yaw for 4 s; ring passes add 1 s; satellite distance <45 m and error <8° for 3 s.         | [Engine](src/game/flightEngine.ts)                                                    |
| **Badges**               | One badge per passed quiz, held in memory and reset on a new run.                                     | [App](src/App.tsx), [Badges](src/components/PixelBadge.tsx)                           |
| **Collision and damage** | 36 randomized asteroids, sphere-distance checks, reflected velocity, hull damage, shake, and hitstop. | [Engine](src/game/flightEngine.ts)                                                    |
| **Oxygen and energy**    | Oxygen drains 0.2 percentage points/s; canisters restore 35; energy recharges 8 points/s.             | [Engine](src/game/flightEngine.ts)                                                    |
| **Boost and scanner**    | Boost drains 26 charge points/s and recharges 14; scanner costs 15 energy and expands to 160 m.       | [Engine](src/game/flightEngine.ts)                                                    |
| **Camera system**        | Chase, cockpit, and offset orbit views; interpolated positions and boost-dependent field of view.     | [Engine](src/game/flightEngine.ts)                                                    |
| **Audio**                | Web Audio oscillators and noise for thrusters, RCS, collisions, scanner, and dispatch chirps.         | [Sound manager](src/audio/soundManager.ts)                                            |
| **Procedural assets**    | Canvas textures with nearest filtering; low-poly craft, planet, stars, satellite, and debris.         | [Models](src/game/proceduralModels.ts)                                                |
| **React integration**    | Engine stored in a ref; telemetry and UI in state; effect cleanup calls engine disposal.              | [App](src/App.tsx)                                                                    |

---

## 🛠 Getting Started — Step-by-Step

### 1. Prerequisites

| Requirement            | Supported setup                                                | Verification                                       |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| **Node.js**            | Node 24 LTS, used in CI for Node-based tooling.                | `node --version`                                   |
| **Bun**                | Bun 1.4.4, pinned in CI.                                       | `bun --version`                                    |
| **Browser**            | WebGL 2.0; hardware acceleration recommended.                  | Browser GPU diagnostics, e.g. `chrome://gpu`.      |
| **Software rendering** | SwiftShader and llvmpipe are detected; performance is reduced. | Inspect the WebGL renderer in browser diagnostics. |

The engine disables shadows and uses a slower scheduling path when it detects software rendering. The low-resolution canvas is used on both hardware and software renderers.

### 2. Clone the Repository

```bash
# HTTPS
git clone https://github.com/NabilUbay5/cadet-1_-orbital-telemetry.git

# SSH (if you have keys configured)
git clone git@github.com:NabilUbay5/cadet-1_-orbital-telemetry.git

cd cadet-1_-orbital-telemetry
```

### 3. Optional Environment Configuration

The default workflow requires no `.env` file, API keys, or external services.

| Variable      | Required | Default             | Actual use                                                                             |
| ------------- | -------- | ------------------- | -------------------------------------------------------------------------------------- |
| `APP_URL`     | No       | Unset               | Present only in `.env.example`; not read by the current app or Vite config.            |
| `DISABLE_HMR` | No       | Unset (HMR enabled) | Setting the process variable to `true` disables Vite HMR; file watching stays enabled. |

To disable HMR, supply the variable to the process before Vite loads its config:

```bash
DISABLE_HMR=true bun run dev
```

### 4. Install Dependencies

```bash
bun install --frozen-lockfile
```

`bun.lock` is the single dependency lockfile. Use Bun for dependency changes (`bun add`, `bun remove`, or `bun install`) and commit the updated lockfile. CI uses `--frozen-lockfile` to reject unexpected dependency changes; do not generate npm, Yarn, or pnpm lockfiles.

### 5. Start the Development Server

```bash
bun run dev
```

The Vite dev server starts at **`http://localhost:3000`** (configurable in `package.json`).

```text
  VITE v8.x.x  ready in 320 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

Open the URL in a WebGL 2.0-capable browser. Click **PRESS START** or press **Enter** to begin. **Space** also starts the mission and triggers the scanner, spending 15 energy.

### 6. Production Build

```bash
# Type-check + build
bun run lint
bun run build

# Preview production build locally
bun run preview
```

Output: `dist/` — static assets ready for any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Nginx, S3+CloudFront).

---

## 🎮 Controls Reference

| Action                   | Key or control                         | Behavior                                                                            |
| ------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------- |
| **Start mission**        | `Enter` / `Space` / **PRESS START**    | Start from the title screen.                                                        |
| **Throttle up**          | `W` / `↑`                              | Increase throttle up to 100%.                                                       |
| **Throttle down**        | `S` / `↓`                              | Decrease throttle down to 0%.                                                       |
| **Yaw left / right**     | `A` / `←` and `D` / `→`                | Apply positive / negative yaw input.                                                |
| **Pitch − / +**          | `R` / `F`                              | Apply negative / positive pitch input.                                              |
| **Roll left / right**    | `Q` / `E`                              | Apply positive / negative roll input.                                               |
| **Afterburner**          | Hold `Shift`                           | Requires throttle >10% and charge >2%; thrust coefficient rises from 38 to 65 m/s². |
| **Cycle camera**         | `C`                                    | Chase → Cockpit → Orbit.                                                            |
| **Toggle flight assist** | `I`                                    | Toggle stronger rotational and linear damping.                                      |
| **Scanner pulse**        | `Space` during flight                  | Spend 15 energy on a visual pulse expanding to 160 m; radar updates separately.     |
| **Toggle audio**         | `M`                                    | Toggle the sound manager's mute state.                                              |
| **Pause / resume**       | `Esc` / `P`                            | Toggle flight between playing and paused.                                           |
| **Restart after result** | `R`                                    | Start a new run from victory or defeat.                                             |
| **Toggle dispatch**      | Click **DISPATCH** / **MISSION BRIEF** | Show or hide the mission announcement; click **[X]** to dismiss it.                 |

---

## 📁 Project Structure

```text
cadet-1_-orbital-telemetry/
├── .github/workflows/ci.yml            # Install, type-check, and build with Bun
├── public/
│   ├── banner.svg                      # README banner
│   └── assets/                         # Planned preview captures
├── src/
│   ├── App.tsx                         # Engine lifecycle and React state
│   ├── main.tsx                        # React entry point
│   ├── index.css                       # Tailwind and CRT styling
│   ├── types/game.ts                   # Telemetry and mission contracts
│   ├── game/
│   │   ├── flightEngine.ts             # Flight, missions, rendering, and input
│   │   └── proceduralModels.ts         # Procedural textures and geometry
│   ├── components/
│   │   ├── HUD.tsx                     # Flight telemetry and controls
│   │   ├── TitleScreen.tsx             # Mission lobby
│   │   ├── Modals.tsx                  # Pause, victory, and defeat screens
│   │   ├── CertificationQuizModal.tsx  # Three questions per stage
│   │   └── PixelBadge.tsx              # Stage badge graphics
│   ├── audio/soundManager.ts           # Procedural Web Audio synthesis
│   └── data/triviaBank.ts              # Nine questions total, three per stage
├── index.html                          # HTML entry point and metadata
├── vite.config.ts                      # Vite, React, and Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Scripts and dependency declarations
├── bun.lock                            # Single dependency lockfile
├── LICENSE                             # MIT License
├── .env.example                        # Optional, unused APP_URL template
└── README.md                           # This file
```

---

## 🧪 Testing & Quality

```bash
# Type-check with the repository configuration (no emit)
bun run lint

# Production build verification
bun run build
```

CI runs TypeScript checking and the Vite production build. There is no configured unit-test or visual-regression suite, and `tsconfig.json` does not enable strict mode.

For a manual smoke check, start the app and verify the title screen, WebGL canvas, live telemetry, start/pause/resume controls, and return to lobby. Frame timing and randomized scene generation mean deterministic replay is not provided.

---

## 🚀 Deployment

### Static Hosting (Recommended)

| Platform             | Build and output                  | Configuration notes                                                                    |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| **Netlify**          | `bun run build`; publish `dist/`. | Set Bun 1.4.4 and Node 24 in the site's build environment.                             |
| **Vercel**           | `bun run build`; output `dist/`.  | Select Vite and configure the Bun version used for installation.                       |
| **Cloudflare Pages** | `bun run build`; output `dist/`.  | Upload the static build or configure a compatible Bun build environment.               |
| **GitHub Pages**     | `bun run build`; deploy `dist/`.  | Set Vite `base` to `/cadet-1_-orbital-telemetry/`; add a separate deployment workflow. |
| **Nginx**            | `bun run build`; serve `dist/`.   | Configure the document root; use `try_files $uri $uri/ /index.html` for SPA fallback.  |
| **Apache**           | `bun run build`; serve `dist/`.   | Configure the document root; use `FallbackResource /index.html` for SPA fallback.      |

### Docker

This is an example recipe, not a committed Docker setup. It requires a `Dockerfile` and an `nginx.conf` that serves the built files. Ensure Node.js is available in the builder for the current tool scripts.

```dockerfile
# Dockerfile
FROM oven/bun:1.4.4 AS builder
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
2. Save them under the exact filenames in `public/assets/` listed above. These six filenames are allowed by `.gitignore`; other local captures remain ignored.
3. Replace the corresponding WIP status with an embed such as `![Telemetry HUD](./public/assets/telemetry-hud.png)` only after that file exists.
4. Include both the image and README update in the same PR so GitHub can render the preview.

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
- **Type safety** — run `bun run lint`; avoid new `any` and `@ts-ignore` usage (strict mode is not enabled).
- **Pre-allocated math** in hot paths — no `new THREE.Vector3()` in loops
- **8-bit aesthetic** — nearest-neighbor, pixel-perfect, CRT scanlines
- **Accessibility goals** — improve keyboard navigation, reduced-motion support, and color contrast; these are not comprehensively validated.

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
