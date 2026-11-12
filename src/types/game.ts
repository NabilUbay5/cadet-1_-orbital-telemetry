/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

export type MissionStage = 1 | 2 | 3;

export type CameraMode = 'CHASE' | 'COCKPIT' | 'ORBIT';

export interface TelemetryData {
  metSeconds: number; // Mission Elapsed Time
  velocity: number; // m/s
  maxVelocity: number;
  acceleration: number; // m/s^2
  gForce: number; // G
  pitch: number; // degrees
  yaw: number; // degrees
  roll: number; // degrees
  driftAngle: number; // degrees
  isInertialDrifting: boolean; // drift > 5 degrees
  hullIntegrity: number; // 0 - 100 %
  oxygen: number; // 0 - 100 %
  energy: number; // 0 - 100 %
  boostCharge: number; // 0 - 100 %
  isBoosting: boolean;
  throttle: number; // 0 - 100 %
  missionReadiness: number; // 0 - 100 %
  cameraMode: CameraMode;
  flightAssist: boolean;
  isMuted: boolean;

  // Multi-Stage Progression
  stage: MissionStage;
  stageTitle: string;
  stageTaskTitle: string;
  stageTaskProgress: number; // 0 - 100 %
  stageTaskComplete: boolean;
  badgesUnlocked: string[];

  // Stage 1: Ground School & Gravity Basics (Balance / Stabilization Task)
  stabilizationProgress: number; // 0 - 100 %
  isStabilized: boolean;
  vectorRingsPassed: number;
  totalVectorRings: number;

  // Stage 2: Atmosphere & Orbital Entry (3 Energy Cubes)
  energyCubesCollected: number;
  totalEnergyCubes: number;

  // Stage 3: Deep Space Navigation (Satellite Alignment)
  satelliteDistance: number;
  satelliteAlignment: number; // degrees
  satelliteLockProgress: number; // 0 - 100 %

  // Resource Matrix
  telemetryPodsCollected: number;
  totalTelemetryPods: number;
  energyCoresCollected: number;
  totalEnergyCores: number;
  waypointsPassed: number;
  totalWaypoints: number;

  // Proximity alerts
  hazardWarning: boolean;
  hazardDistance: number;
  radarBlips: Array<{
    x: number;
    y: number;
    type: 'waypoint' | 'cube' | 'pod' | 'hazard' | 'satellite' | 'o2';
    distance: number;
  }>;
}

export interface MissionResult {
  victory: boolean;
  reason: string;
  cadetRank: string;
  flightTimeFormatted: string;
  metSeconds: number;
  readinessScore: number;
  hullDamageTaken: number;
  energyCubesCollected: number;
  badgesEarned: number;
  triviaScore: number;
  totalTrivia: number;
}
