import { describe, expect, test } from 'bun:test';
import { STAGE_BADGES, TRIVIA_QUESTIONS } from '../../data/triviaBank.ts';
import type { MissionStage } from '../../types/game.ts';

const STAGES: MissionStage[] = [1, 2, 3];
const allQuestions = STAGES.flatMap((stage) => TRIVIA_QUESTIONS[stage]);

describe('triviaBank integrity', () => {
  test('has exactly three questions per stage (nine total)', () => {
    for (const stage of STAGES) {
      expect(TRIVIA_QUESTIONS[stage]).toHaveLength(3);
    }
    expect(allQuestions).toHaveLength(9);
  });

  test('every question is filed under its own stage', () => {
    for (const stage of STAGES) {
      for (const q of TRIVIA_QUESTIONS[stage]) {
        expect(q.stage).toBe(stage);
      }
    }
  });

  test('question ids are unique', () => {
    const ids = allQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each question has four distinct, non-empty options and a valid answer', () => {
    for (const q of allQuestions) {
      expect(q.question.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      for (const option of q.options) expect(option.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(q.correctIndex)).toBe(true);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  test('each stage has a matching badge with a unique id and hex color', () => {
    const badgeIds = new Set<string>();
    for (const stage of STAGES) {
      const badge = STAGE_BADGES[stage];
      expect(badge.stage).toBe(stage);
      expect(badge.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      badgeIds.add(badge.id);
    }
    expect(badgeIds.size).toBe(3);
  });
});
