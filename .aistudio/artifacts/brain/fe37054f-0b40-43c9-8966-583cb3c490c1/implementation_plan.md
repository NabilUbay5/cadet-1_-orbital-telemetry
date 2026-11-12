# Junior Astronaut Mission Trainer: Multi-Stage Progression & Certification Quiz

Implement a structured 3-stage mission progression system where cadets complete domain-specific flight challenges (stabilization, debris evasion/energy collection, satellite telemetry alignment) followed by interactive 8-bit Astronaut Certification Trivia Quizzes (with beginner space trivia, pass/retry evaluation, and unlockable pixel badges).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user during the Phase 1 clarification:

- **Passing Score Threshold**: Cadets must score **at least 2 out of 3 correct ($\ge 66\%$)** to pass each stage certification. If failed, an instant retry is offered with the arcade encouraging banner: `"RE-CALCULATING TRAJECTORY... TRY AGAIN, CADET!"`.
- **Stage 1 Mini-Task (Ground School & Gravity Basics)**: Direct flight control stabilization. The cadet uses WASD / Arrow keys to counter simulated inertial drift and hold the crosshair centered ($\le \pm 3^\circ$ error) for 5 continuous seconds until the calibration meter fills to 100%.
- **Stage 2 Mini-Task (Atmosphere & Orbital Entry)**: Collect 3 glowing energy cubes while dodging drifting asteroid debris in the upper orbit.
- **Stage 3 Mini-Task (Deep Space Navigation)**: Fly to the orbital communications satellite, align the targeting crosshair within tolerance ($\le 6^\circ$ heading error), and maintain lock for 3 seconds to upload coordinates.
- **Certification Rewards**: Passing a stage quiz awards a bespoke pixel-art **Cadet Certification Badge** (Stage 1: *Gravity Vector Specialist*, Stage 2: *Orbital Entry Aviator*, Stage 3: *Deep Space Navigator*), unlocking the next mission phase.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the open-flight simulation into an arcade training curriculum for junior astronauts. Cadets master three distinct flight competencies, followed immediately by retro computer terminal trivia quizzes that test foundational space science (gravity, orbital mechanics, and solar system facts).
- **Target Audience**: Junior astronauts, science students, and retro arcade gamers who enjoy combining hands-on pilot controls with learning space concepts.
- **Key Value**: Clear objective-driven progression with immediate educational reinforcement, satisfying arcade fanfare, and collectible achievement badges.

---

## 2. User Experience & Visual Design

### 3-Stage Mission Progression Sequence
1. **Stage 1: Ground School & Gravity Basics**
   - *Physical Task*: Craft is subject to simulated gravitational turbulence. The cadet must use WASD / pitch-yaw steering to stabilize the craft, keeping pitch and yaw within $\pm 3^\circ$ for 5 continuous seconds.
   - *Stage Gate*: Opens `[ASTRONAUT CERTIFICATION: STAGE 1]` terminal with 3 questions on gravity and weightlessness.
   - *Reward*: Confeers the **Gravity Vector Badge** and initiates orbital ascent.
2. **Stage 2: Atmosphere & Orbital Entry**
   - *Physical Task*: Navigate asteroid belt and collect 3 glowing energy cubes while managing shields and maneuvering around high-velocity debris.
   - *Stage Gate*: Opens `[ASTRONAUT CERTIFICATION: STAGE 2]` terminal with 3 questions on atmospheric entry, heat shields, and orbital speeds.
   - *Reward*: Confers the **Orbital Entry Badge** and unlocks deep-space coordinates.
3. **Stage 3: Deep Space Navigation**
   - *Physical Task*: Locate the deep-space satellite relay, approach within 30m, and hold target lock within $6^\circ$ to transmit telemetry coordinates.
   - *Stage Gate*: Opens `[ASTRONAUT CERTIFICATION: STAGE 3]` terminal with 3 questions on our solar system, communication delays, and navigation.
   - *Reward*: Confers the **Deep Space Navigator Badge**, triggers Graduation Celebration, and displays the complete Astronaut Certification Diploma.

### Trivia Terminal Modal & Pixel Badges
- **Terminal Styling**: Authentic 8-bit computer terminal window (`retro-window` with 2px Electric Cyan or Amber borders, `Press Start 2P` font, and CRT scanlines).
- **Question Layout**:
  - Question text in crisp photonic white with stage question counter (`QUESTION 01/03`).
  - 4 large multiple-choice buttons (A / B / C / D) with 2px borders, instant high-contrast inversion on hover/select, and immediate correct (green `#00FF66`) or incorrect (red `#FF3344`) visual feedback.
  - Informative one-line explanation after answering so players learn *why* the answer is correct.
- **Pixel Art Badges**: Bespoke 8-bit inline SVG badge icons rendered with classic geometric embroidery, star pips, and metallic ribbons:
  - 🏅 *Stage 1: Gravity Gyro Badge* (Cyan gyro ring with center core)
  - 🛡️ *Stage 2: Heat Shield Badge* (Amber shield with atmospheric entry flames)
  - 🛰️ *Stage 3: Satellite Beacon Badge* (Green satellite dish with radio wave pulses)

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Stage Objectives in FlightEngine**:
  - *Chosen Approach*: Replace the generic phase progression with a dedicated `MissionStage` state machine (`1: STABILIZATION`, `2: DEBRIS_ENERGY`, `3: SATELLITE_ALIGN`).
  - *Why*: Provides explicit, unambiguous win conditions for each stage with dedicated progress meters in the HUD (Stabilization Calibration % in Stage 1; Energy Cubes Collected in Stage 2; Satellite Lock % in Stage 3).
- **Decision 2: Separate Interactive Quiz Modal Layer**:
  - *Chosen Approach*: Implement a dedicated `CertificationQuizModal.tsx` rendered on top of the paused WebGL viewport.
  - *Why*: Allows the player to focus 100% on reading trivia questions without having to fly or steer at the same time, pausing the simulation clock.
- **Decision 3: Curated Beginner-Level Space Trivia Question Bank**:
  - *Chosen Approach*: Embed 9 curated, factually verified, beginner-friendly space science questions (3 per stage) with clear educational explanations.
  - *Why*: Ensures age-appropriate accessibility for junior cadets while maintaining high educational value.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Root Game Shell)                       │
├────────────────────────────────────────────────────────────────────────┤
│  State: stage (1 | 2 | 3), inQuiz (boolean), badgesUnlocked (string[]) │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     FlightEngine.ts (3D Physics & Simulation)                    │  │
│  │     - Stage 1: Gyro drift simulation & 5s stability counter      │  │
│  │     - Stage 2: 3 Energy Cubes spawning & asteroid collisions     │  │
│  │     - Stage 3: Satellite Relay spawn & 3s target alignment lock  │  │
│  │     - Emits `onStageTaskCompleted(stageNumber)` event            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │ triggers                            │
│                                  ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     CertificationQuizModal.tsx (8-Bit Trivia Gate)               │  │
│  │     - Displays 3 questions (A/B/C/D) for active stage            │  │
│  │     - Tracks correct answers (target >= 2/3)                     │  │
│  │     - Failure: "RE-CALCULATING TRAJECTORY..." Retry Prompt       │  │
│  │     - Success: Unlocks Cadet Badge & calls `onStagePassed()`     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │ updates                             │
│                                  ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     HUD.tsx (8-Bit Telemetry with Stage-Specific Meters)         │  │
│  │     - Top: Current Stage Badge slots & progress                  │  │
│  │     - Center: Stage task calibration bar (Stability / Lock)      │  │
│  │     - Right: Energy cube counter & mission objectives            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Trivia Bank

```ts
export interface TriviaQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface StageBadge {
  id: string;
  stage: number;
  title: string;
  subtitle: string;
  iconType: 'gyro' | 'shield' | 'satellite';
}
```

---

## Verification & Execution Steps

1. Create `src/data/triviaBank.ts` with 9 curated beginner space trivia questions and badge metadata.
2. Update `src/types/game.ts` to include stage progression types, stabilization progress, and badge unlocks.
3. Update `src/game/proceduralModels.ts` to add the Orbital Satellite Relay model and Energy Cubes.
4. Refactor `src/game/flightEngine.ts` to handle:
   - Stage 1: Gyroscopic stabilization physics (tracking $\pm 3^\circ$ centered crosshair hold for 5s).
   - Stage 2: Spawning 3 energy cubes and tracking collection.
   - Stage 3: Satellite targeting alignment hold for 3s.
5. Create `src/components/CertificationQuizModal.tsx` with 8-bit terminal interface, question scoring, instant retry, and badge reveal fanfare.
6. Update `src/components/HUD.tsx` to display stage badges, active task meters, and checklist.
7. Update `src/components/Modals.tsx` with the Junior Astronaut Graduation Diploma.
8. Wire everything into `src/App.tsx` and verify with `compile_applet` and `lint_applet`.
