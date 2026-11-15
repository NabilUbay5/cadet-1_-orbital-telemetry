/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MissionStage, TelemetryData } from '../types/game.ts';
import {
  STAGE1_TARGET_TIME,
  STAGE1_TOTAL_RINGS,
  STAGE2_REQUIRED_CUBES,
  STAGE3_LOCK_TIME,
  progressPercent,
} from './missionLogic.ts';
import { TOTAL_TELEMETRY_PODS } from './telemetryPods.ts';

type DerivedTelemetryField =
  | 'missionReadiness'
  | 'stageTitle'
  | 'stageTaskTitle'
  | 'stageTaskProgress'
  | 'stageTaskComplete'
  | 'stabilizationProgress'
  | 'satelliteLockProgress'
  | 'totalVectorRings'
  | 'totalEnergyCubes'
  | 'totalTelemetryPods'
  | 'waypointsPassed'
  | 'totalWaypoints';

export type TelemetrySnapshotInput = Omit<TelemetryData, DerivedTelemetryField> & {
  stabilizationTimer: number;
  satelliteLockTimer: number;
  stage1Complete: boolean;
  stage2Complete: boolean;
  stage3Complete: boolean;
};

const stageDetails: Record<MissionStage, { title: string; task: string }> = {
  1: { title: '01 // GROUND SCHOOL', task: 'STABILIZE FLIGHT GYROS' },
  2: { title: '02 // ORBITAL ENTRY', task: 'HARVEST 3 ENERGY CUBES' },
  3: { title: '03 // DEEP SPACE', task: 'ALIGN SATELLITE TELEMETRY' },
};

export function createTelemetrySnapshot(input: TelemetrySnapshotInput): TelemetryData {
  const {
    stage1Complete,
    stage2Complete,
    stage3Complete,
    stabilizationTimer,
    satelliteLockTimer,
    ...telemetryFields
  } = input;
  const satelliteLockProgress = progressPercent(satelliteLockTimer, STAGE3_LOCK_TIME);
  const stageTaskProgress =
    telemetryFields.stage === 1
      ? progressPercent(stabilizationTimer, STAGE1_TARGET_TIME)
      : telemetryFields.stage === 2
        ? progressPercent(telemetryFields.energyCubesCollected, STAGE2_REQUIRED_CUBES)
        : satelliteLockProgress;
  const stageTaskComplete =
    telemetryFields.stage === 1 ? stage1Complete : telemetryFields.stage === 2 ? stage2Complete : stage3Complete;

  let missionReadiness = 15;
  if (stage1Complete) missionReadiness += 25;
  if (stage2Complete) missionReadiness += 30;
  if (stage3Complete) missionReadiness += 30;

  return {
    ...telemetryFields,
    missionReadiness,
    stageTitle: stageDetails[telemetryFields.stage].title,
    stageTaskTitle: stageDetails[telemetryFields.stage].task,
    stageTaskProgress,
    stageTaskComplete,
    stabilizationProgress: stageTaskProgress,
    satelliteLockProgress,
    totalVectorRings: STAGE1_TOTAL_RINGS,
    totalEnergyCubes: STAGE2_REQUIRED_CUBES,
    totalTelemetryPods: TOTAL_TELEMETRY_PODS,
    waypointsPassed: input.vectorRingsPassed,
    totalWaypoints: STAGE1_TOTAL_RINGS,
  };
}
