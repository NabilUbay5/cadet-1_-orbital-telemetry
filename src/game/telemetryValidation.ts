/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TelemetryData } from '../types/game.ts';

const numericFields = [
  'metSeconds',
  'velocity',
  'maxVelocity',
  'acceleration',
  'gForce',
  'pitch',
  'yaw',
  'roll',
  'driftAngle',
  'hullIntegrity',
  'oxygen',
  'energy',
  'boostCharge',
  'throttle',
  'missionReadiness',
  'stage',
  'stageTaskProgress',
  'stabilizationProgress',
  'vectorRingsPassed',
  'totalVectorRings',
  'energyCubesCollected',
  'totalEnergyCubes',
  'telemetryPodsCollected',
  'totalTelemetryPods',
  'satelliteDistance',
  'satelliteAlignment',
  'satelliteLockProgress',
  'waypointsPassed',
  'totalWaypoints',
  'hazardDistance',
] as const;

const percentageFields = [
  'hullIntegrity',
  'oxygen',
  'energy',
  'boostCharge',
  'throttle',
  'missionReadiness',
  'stageTaskProgress',
  'stabilizationProgress',
  'satelliteLockProgress',
] as const;

const countFields = [
  'vectorRingsPassed',
  'totalVectorRings',
  'energyCubesCollected',
  'totalEnergyCubes',
  'telemetryPodsCollected',
  'totalTelemetryPods',
  'waypointsPassed',
  'totalWaypoints',
] as const;

const nonNegativeFields = [
  'metSeconds',
  'velocity',
  'maxVelocity',
  'acceleration',
  'gForce',
  'driftAngle',
  'satelliteDistance',
  'satelliteAlignment',
  'hazardDistance',
] as const;

const booleanFields = [
  'isInertialDrifting',
  'isBoosting',
  'flightAssist',
  'isMuted',
  'stageTaskComplete',
  'isStabilized',
  'hazardWarning',
] as const;

const radarBlipTypes = new Set(['waypoint', 'cube', 'pod', 'hazard', 'satellite', 'o2']);

/** Checks the runtime shape and display-safe ranges of a flight-engine telemetry snapshot. */
export function isValidTelemetryData(value: unknown): value is TelemetryData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const telemetry = value as Record<string, unknown>;

  for (const field of numericFields) {
    if (typeof telemetry[field] !== 'number' || !Number.isFinite(telemetry[field])) return false;
  }

  for (const field of percentageFields) {
    const percentage = telemetry[field] as number;
    if (percentage < 0 || percentage > 100) return false;
  }

  for (const field of countFields) {
    const count = telemetry[field] as number;
    if (!Number.isInteger(count) || count < 0) return false;
  }

  for (const field of nonNegativeFields) {
    if ((telemetry[field] as number) < 0) return false;
  }

  if (
    (telemetry.stage !== 1 && telemetry.stage !== 2 && telemetry.stage !== 3) ||
    (telemetry.cameraMode !== 'CHASE' && telemetry.cameraMode !== 'COCKPIT' && telemetry.cameraMode !== 'ORBIT') ||
    typeof telemetry.stageTitle !== 'string' ||
    typeof telemetry.stageTaskTitle !== 'string' ||
    !Array.isArray(telemetry.badgesUnlocked) ||
    !telemetry.badgesUnlocked.every((badge) => typeof badge === 'string') ||
    !Array.isArray(telemetry.radarBlips)
  ) {
    return false;
  }

  for (const field of booleanFields) {
    if (typeof telemetry[field] !== 'boolean') return false;
  }

  return telemetry.radarBlips.every((blip) => {
    if (typeof blip !== 'object' || blip === null || Array.isArray(blip)) return false;
    const radarBlip = blip as Record<string, unknown>;
    return (
      typeof radarBlip.x === 'number' &&
      Number.isFinite(radarBlip.x) &&
      typeof radarBlip.y === 'number' &&
      Number.isFinite(radarBlip.y) &&
      typeof radarBlip.distance === 'number' &&
      Number.isFinite(radarBlip.distance) &&
      radarBlip.distance >= 0 &&
      typeof radarBlip.type === 'string' &&
      radarBlipTypes.has(radarBlip.type)
    );
  });
}
