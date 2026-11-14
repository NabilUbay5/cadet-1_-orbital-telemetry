import { describe, expect, test } from 'bun:test';
import { isValidTelemetryData } from '../telemetryValidation.ts';
import type { TelemetryData } from '../../types/game.ts';

const validTelemetry: TelemetryData = {
  metSeconds: 12.5,
  velocity: 20,
  maxVelocity: 55,
  acceleration: 5,
  gForce: 1.2,
  pitch: -2,
  yaw: 4,
  roll: 0,
  driftAngle: 3,
  isInertialDrifting: false,
  hullIntegrity: 100,
  oxygen: 95,
  energy: 80,
  boostCharge: 70,
  isBoosting: false,
  throttle: 30,
  missionReadiness: 15,
  cameraMode: 'CHASE',
  flightAssist: true,
  isMuted: false,
  stage: 1,
  stageTitle: '01 // GROUND SCHOOL',
  stageTaskTitle: 'STABILIZE FLIGHT GYROS',
  stageTaskProgress: 50,
  stageTaskComplete: false,
  badgesUnlocked: [],
  stabilizationProgress: 50,
  isStabilized: false,
  vectorRingsPassed: 0,
  totalVectorRings: 3,
  energyCubesCollected: 0,
  totalEnergyCubes: 3,
  satelliteDistance: 340,
  satelliteAlignment: 0,
  satelliteLockProgress: 0,
  telemetryPodsCollected: 0,
  totalTelemetryPods: 3,
  energyCoresCollected: 0,
  totalEnergyCores: 3,
  waypointsPassed: 1,
  totalWaypoints: 3,
  hazardWarning: false,
  hazardDistance: 999,
  radarBlips: [{ x: 0.2, y: -0.5, type: 'waypoint', distance: 45 }],
};

describe('isValidTelemetryData', () => {
  test('accepts a complete telemetry snapshot', () => {
    expect(isValidTelemetryData(validTelemetry)).toBe(true);
  });

  test('rejects non-finite sensor values and out-of-range percentages', () => {
    expect(isValidTelemetryData({ ...validTelemetry, velocity: Number.NaN })).toBe(false);
    expect(isValidTelemetryData({ ...validTelemetry, velocity: -1 })).toBe(false);
    expect(isValidTelemetryData({ ...validTelemetry, oxygen: 101 })).toBe(false);
  });

  test('rejects invalid counts, stages, and radar blips', () => {
    expect(isValidTelemetryData({ ...validTelemetry, energyCubesCollected: 1.5 })).toBe(false);
    expect(isValidTelemetryData({ ...validTelemetry, stage: 4 })).toBe(false);
    expect(isValidTelemetryData({ ...validTelemetry, radarBlips: [{ ...validTelemetry.radarBlips[0], type: 'unknown' }] })).toBe(
      false
    );
  });

  test('rejects incomplete snapshots', () => {
    const { velocity: _velocity, ...incomplete } = validTelemetry;
    expect(isValidTelemetryData(incomplete)).toBe(false);
    expect(isValidTelemetryData(null)).toBe(false);
  });
});
