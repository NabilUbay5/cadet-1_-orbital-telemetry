/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FlightScoreBreakdown } from '../types/game.ts';

export const GYRO_STABILIZATION_POINTS_PER_SECOND = 100;
export const VECTOR_RING_SCORE = 500;
export const ENERGY_CUBE_SCORE = 1_000;
export const HULL_INTEGRITY_POINTS_PER_PERCENT = 10;
export const SATELLITE_LOCK_COMPLETION_BONUS = 2_500;
export const SATELLITE_QUICK_ALIGNMENT_BASE_BONUS = 1_500;
export const SATELLITE_QUICK_ALIGNMENT_DECAY_PER_SECOND = 100;
export const QUIZ_CORRECT_ANSWER_SCORE = 500;
export const HI_SCORE_STORAGE_KEY = 'cadet-1-hi-score';

export interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HighScoreResult {
  highScore: number;
  isNewHighScore: boolean;
}

export function getGyroStabilizationScore(stableSeconds: number): number {
  if (!Number.isFinite(stableSeconds) || stableSeconds < 0) {
    throw new RangeError('Stable flight time must be a non-negative finite number.');
  }
  return Math.floor(stableSeconds) * GYRO_STABILIZATION_POINTS_PER_SECOND;
}

export function getVectorRingScore(ringsPassed: number): number {
  validateCount(ringsPassed, 'Vector rings passed');
  return ringsPassed * VECTOR_RING_SCORE;
}

export function getEnergyCubeScore(cubesCollected: number): number {
  validateCount(cubesCollected, 'Energy cubes collected');
  return cubesCollected * ENERGY_CUBE_SCORE;
}

export function getHullIntegrityScore(hullIntegrityPercent: number): number {
  if (!Number.isFinite(hullIntegrityPercent) || hullIntegrityPercent < 0 || hullIntegrityPercent > 100) {
    throw new RangeError('Hull integrity must be between 0 and 100.');
  }
  return Math.round(hullIntegrityPercent) * HULL_INTEGRITY_POINTS_PER_PERCENT;
}

export function getSatelliteQuickAlignmentBonus(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Satellite alignment time must be a non-negative finite number.');
  }
  return Math.max(
    0,
    SATELLITE_QUICK_ALIGNMENT_BASE_BONUS
      - Math.floor(elapsedSeconds) * SATELLITE_QUICK_ALIGNMENT_DECAY_PER_SECOND,
  );
}

export class FlightScoreTracker {
  private readonly points: FlightScoreBreakdown = {
    gyroStabilization: 0,
    vectorRings: 0,
    energyCubes: 0,
    hullIntegrity: 0,
    satelliteSpeed: 0,
    satelliteLock: 0,
    quizAnswers: 0,
  };
  private readonly scoredQuizQuestions = new Set<string>();

  get total(): number {
    return Object.values(this.points).reduce((total, points) => total + points, 0);
  }

  get breakdown(): FlightScoreBreakdown {
    return { ...this.points };
  }

  award(category: keyof FlightScoreBreakdown, points: number): number {
    if (!Number.isSafeInteger(points) || points < 0) {
      throw new RangeError('Score awards must be non-negative safe integers.');
    }
    this.points[category] += points;
    return this.total;
  }

  awardQuizAnswer(questionId: string): boolean {
    if (!questionId) throw new TypeError('A quiz question ID is required.');
    if (this.scoredQuizQuestions.has(questionId)) return false;
    this.scoredQuizQuestions.add(questionId);
    this.award('quizAnswers', QUIZ_CORRECT_ANSWER_SCORE);
    return true;
  }

  reset(): void {
    for (const category of Object.keys(this.points) as Array<keyof FlightScoreBreakdown>) {
      this.points[category] = 0;
    }
    this.scoredQuizQuestions.clear();
  }
}

export function readHighScore(storage: ScoreStorage): number {
  const savedScore = storage.getItem(HI_SCORE_STORAGE_KEY);
  if (savedScore === null || !/^\d+$/.test(savedScore)) return 0;
  const score = Number(savedScore);
  return Number.isSafeInteger(score) ? score : 0;
}

export function recordHighScore(storage: ScoreStorage, score: number): HighScoreResult {
  validateScore(score);
  const highScore = readHighScore(storage);
  if (score <= highScore) return { highScore, isNewHighScore: false };
  storage.setItem(HI_SCORE_STORAGE_KEY, String(score));
  return { highScore: score, isNewHighScore: true };
}

function validateCount(count: number, label: string): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function validateScore(score: number): void {
  if (!Number.isSafeInteger(score) || score < 0) {
    throw new RangeError('Score must be a non-negative safe integer.');
  }
}
