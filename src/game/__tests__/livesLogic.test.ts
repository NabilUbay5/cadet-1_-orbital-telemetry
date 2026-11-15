import { describe, expect, test } from 'bun:test';
import { FIXED_DT } from '../fixedTimestep.ts';
import {
  INVULNERABLE_SECONDS,
  MAX_LIVES,
  canTakeHit,
  hullPercentForLives,
  isFlashHidden,
  isOutOfLives,
  loseLife,
  stepInvulnerability,
} from '../livesLogic.ts';

describe('lives', () => {
  test('three hearts, one lost per hit, never below zero', () => {
    expect(MAX_LIVES).toBe(3);
    expect(loseLife(3)).toBe(2);
    expect(loseLife(1)).toBe(0);
    expect(loseLife(0)).toBe(0);
  });

  test('game over only when no hearts remain', () => {
    expect(isOutOfLives(1)).toBe(false);
    expect(isOutOfLives(0)).toBe(true);
  });

  test('hull gauge follows the hearts', () => {
    expect([3, 2, 1, 0].map(hullPercentForLives)).toEqual([100, 67, 33, 0]);
    expect(hullPercentForLives(9)).toBe(100);
    expect(hullPercentForLives(-1)).toBe(0);
  });
});

describe('invulnerability frames', () => {
  test('staying in contact for one second costs only one heart', () => {
    let timer = 0;
    let lives = MAX_LIVES;
    for (let i = 0; i < 60; i++) {
      if (canTakeHit(timer)) { lives = loseLife(lives); timer = INVULNERABLE_SECONDS; }
      timer = stepInvulnerability(timer, FIXED_DT);
    }
    expect(lives).toBe(MAX_LIVES - 1);
    expect(canTakeHit(timer)).toBe(false);
  });

  test('the timer expires after 1.5 s and never goes negative', () => {
    let timer = INVULNERABLE_SECONDS;
    for (let i = 0; i < 100; i++) timer = stepInvulnerability(timer, FIXED_DT);
    expect(timer).toBe(0);
    expect(canTakeHit(timer)).toBe(true);
  });

  test('constant contact takes at least two full windows to end the run', () => {
    let timer = 0;
    let lives = MAX_LIVES;
    let steps = 0;
    while (!isOutOfLives(lives) && steps < 1000) {
      if (canTakeHit(timer)) { lives = loseLife(lives); timer = INVULNERABLE_SECONDS; }
      timer = stepInvulnerability(timer, FIXED_DT);
      steps++;
    }
    expect(steps * FIXED_DT).toBeGreaterThan(INVULNERABLE_SECONDS * 2 - 0.1);
  });

  test('the ship flashes only while invulnerable', () => {
    expect(isFlashHidden(0)).toBe(false);
    const states = new Set<boolean>();
    for (let t = INVULNERABLE_SECONDS; t > 0; t -= FIXED_DT) states.add(isFlashHidden(t));
    expect(states.size).toBe(2);
  });
});
