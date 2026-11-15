import { describe, expect, test } from 'bun:test';
import {
  ENERGY_CUBE_SCORE,
  FlightScoreTracker,
  GYRO_STABILIZATION_POINTS_PER_SECOND,
  getEnergyCubeScore,
  getGyroStabilizationScore,
  getHullIntegrityScore,
  getSatelliteQuickAlignmentBonus,
  getVectorRingScore,
  HI_SCORE_STORAGE_KEYS,
  LEGACY_HI_SCORE_STORAGE_KEY,
  QUIZ_CORRECT_ANSWER_SCORE,
  recordHighScore,
  readHighScore,
  readHighScores,
  SATELLITE_LOCK_COMPLETION_BONUS,
  SATELLITE_QUICK_ALIGNMENT_BASE_BONUS,
  SATELLITE_QUICK_ALIGNMENT_DECAY_PER_SECOND,
  VECTOR_RING_SCORE,
} from '../scoreLogic.ts';
import type { ScoreStorage } from '../scoreLogic.ts';

class MemoryStorage implements ScoreStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('flight score rules', () => {
  test('scores stabilization time, rings, cubes, and hull integrity', () => {
    expect(getGyroStabilizationScore(4.99)).toBe(4 * GYRO_STABILIZATION_POINTS_PER_SECOND);
    expect(getVectorRingScore(3)).toBe(3 * VECTOR_RING_SCORE);
    expect(getEnergyCubeScore(3)).toBe(3 * ENERGY_CUBE_SCORE);
    expect(getHullIntegrityScore(75)).toBe(750);
    expect(getHullIntegrityScore(100)).toBe(1_000);
  });

  test('grants a speed bonus that decays to zero and a separate lock completion bonus', () => {
    expect(getSatelliteQuickAlignmentBonus(0)).toBe(SATELLITE_QUICK_ALIGNMENT_BASE_BONUS);
    expect(getSatelliteQuickAlignmentBonus(3.9)).toBe(
      SATELLITE_QUICK_ALIGNMENT_BASE_BONUS - 3 * SATELLITE_QUICK_ALIGNMENT_DECAY_PER_SECOND,
    );
    expect(getSatelliteQuickAlignmentBonus(15)).toBe(0);
    expect(SATELLITE_LOCK_COMPLETION_BONUS).toBe(2_500);
  });

  test('tracks score totals and only scores each quiz question once per run', () => {
    const tracker = new FlightScoreTracker();
    tracker.award('vectorRings', getVectorRingScore(1));
    expect(tracker.awardQuizAnswer('stage-1-question-a')).toBe(true);
    expect(tracker.awardQuizAnswer('stage-1-question-a')).toBe(false);
    expect(tracker.total).toBe(VECTOR_RING_SCORE + QUIZ_CORRECT_ANSWER_SCORE);
    expect(tracker.breakdown.quizAnswers).toBe(QUIZ_CORRECT_ANSWER_SCORE);

    tracker.reset();
    expect(tracker.total).toBe(0);
    expect(tracker.awardQuizAnswer('stage-1-question-a')).toBe(true);
  });

  test('rejects invalid score inputs', () => {
    expect(() => getGyroStabilizationScore(-1)).toThrow(RangeError);
    expect(() => getVectorRingScore(1.5)).toThrow(RangeError);
    expect(() => getHullIntegrityScore(101)).toThrow(RangeError);
    expect(() => getSatelliteQuickAlignmentBonus(Number.NaN)).toThrow(RangeError);
  });
});

describe('persistent high score', () => {
  test('records a new best and leaves it unchanged for lower or tied scores', () => {
    const storage = new MemoryStorage();
    expect(recordHighScore(storage, 'flight', 2_500)).toEqual({ highScore: 2_500, isNewHighScore: true });
    expect(storage.getItem(HI_SCORE_STORAGE_KEYS.flight)).toBe('2500');
    expect(recordHighScore(storage, 'flight', 2_000)).toEqual({ highScore: 2_500, isNewHighScore: false });
    expect(recordHighScore(storage, 'flight', 2_500)).toEqual({ highScore: 2_500, isNewHighScore: false });
    expect(readHighScore(storage, 'flight')).toBe(2_500);
  });

  test('treats missing or malformed saved values as zero and rejects invalid scores', () => {
    const storage = new MemoryStorage();
    expect(readHighScore(storage, 'flight')).toBe(0);
    storage.setItem(HI_SCORE_STORAGE_KEYS.flight, 'oops');
    expect(readHighScore(storage, 'flight')).toBe(0);
    expect(() => recordHighScore(storage, 'flight', -1)).toThrow(RangeError);
  });

  test('keeps Flight and Outpost records independent', () => {
    const storage = new MemoryStorage();
    recordHighScore(storage, 'flight', 20_000);
    recordHighScore(storage, 'outpost', 8_000);

    expect(readHighScores(storage)).toEqual({ flight: 20_000, outpost: 8_000 });
    expect(recordHighScore(storage, 'outpost', 12_000)).toEqual({
      highScore: 12_000,
      isNewHighScore: true,
    });
    expect(readHighScore(storage, 'flight')).toBe(20_000);
  });

  test('preserves the previous shared record as a Flight record only', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_HI_SCORE_STORAGE_KEY, '9000');

    expect(readHighScores(storage)).toEqual({ flight: 9_000, outpost: 0 });
    expect(recordHighScore(storage, 'outpost', 8_000)).toEqual({
      highScore: 8_000,
      isNewHighScore: true,
    });
    expect(readHighScores(storage)).toEqual({ flight: 9_000, outpost: 8_000 });
  });
});
