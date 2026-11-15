import { describe, expect, test } from 'bun:test';
import {
  addResearchPoints,
  claimResearchReward,
  createResearchBankBackup,
  parseResearchBankBackup,
  readResearchBalance,
  RESEARCH_BANK_STORAGE_KEY,
  ResearchStorage,
  writeResearchBalance,
} from '../researchBank.ts';
import { HI_SCORE_STORAGE_KEYS, readHighScores, writeHighScores } from '../scoreLogic.ts';

function createStorage(initialValue: string | null = null): ResearchStorage {
  const values = new Map<string, string>();
  if (initialValue !== null) values.set(RESEARCH_BANK_STORAGE_KEY, initialValue);

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('research bank', () => {
  test('claims each mission reward event at most once until a new run resets the ledger', () => {
    const processedEvents = new Set<string>();

    expect(claimResearchReward(processedEvents, 'flight-stage-1')).toBe(true);
    expect(claimResearchReward(processedEvents, 'flight-stage-1')).toBe(false);
    processedEvents.clear();
    expect(claimResearchReward(processedEvents, 'flight-stage-1')).toBe(true);
  });

  test('accumulates mission rewards and reads the saved balance again', () => {
    const storage = createStorage('200');

    expect(addResearchPoints(storage, 100)).toBe(300);
    expect(addResearchPoints(storage, 300)).toBe(600);
    expect(readResearchBalance(storage)).toBe(600);
  });

  test('treats missing or malformed saved values as an empty balance', () => {
    expect(readResearchBalance(createStorage())).toBe(0);
    expect(readResearchBalance(createStorage('-10'))).toBe(0);
    expect(readResearchBalance(createStorage('12.5'))).toBe(0);
    expect(readResearchBalance(createStorage('not a number'))).toBe(0);
  });

  test('rejects invalid awards and balances that exceed safe integer precision', () => {
    const storage = createStorage();

    expect(() => addResearchPoints(storage, -100)).toThrow(RangeError);
    expect(() => addResearchPoints(storage, 1.5)).toThrow(RangeError);
    expect(() => addResearchPoints(createStorage(String(Number.MAX_SAFE_INTEGER)), 1)).toThrow(RangeError);
  });

  test('exports and restores a versioned research balance backup', () => {
    const highScores = { flight: 12_000, outpost: 8_000 };
    const backupText = createResearchBankBackup(1234, highScores, '2026-11-15T00:00:00.000Z');
    const backup = parseResearchBankBackup(backupText);
    const storage = createStorage('900');

    expect(backup).toEqual({
      format: 'cadet-1-research-bank',
      version: 2,
      exportedAt: '2026-11-15T00:00:00.000Z',
      balance: 1234,
      highScores,
    });
    expect(writeResearchBalance(storage, backup.balance)).toBe(1234);
    if (backup.highScores) writeHighScores(storage, backup.highScores);
    expect(readResearchBalance(storage)).toBe(1234);
    expect(readHighScores(storage)).toEqual(highScores);
  });

  test('accepts version 1 backups without replacing existing high scores', () => {
    const backup = parseResearchBankBackup(JSON.stringify({
      format: 'cadet-1-research-bank',
      version: 1,
      exportedAt: '2026-11-15T00:00:00.000Z',
      balance: 1234,
    }));
    const storage = createStorage();
    storage.setItem(HI_SCORE_STORAGE_KEYS.flight, '6000');
    storage.setItem(HI_SCORE_STORAGE_KEYS.outpost, '3000');

    expect(backup.version).toBe(1);
    expect(backup.highScores).toBeUndefined();
    expect(readHighScores(storage)).toEqual({ flight: 6000, outpost: 3000 });
  });

  test('rejects malformed, unsupported, or invalid-balance backups', () => {
    expect(() => parseResearchBankBackup('{')).toThrow('not valid JSON');
    expect(() => parseResearchBankBackup('[]')).toThrow('JSON object');
    expect(() => parseResearchBankBackup(JSON.stringify({
      format: 'cadet-1-research-bank',
      version: 3,
      exportedAt: '2026-11-15T00:00:00.000Z',
      balance: 100,
    }))).toThrow('not supported');
    expect(() => parseResearchBankBackup(JSON.stringify({
      format: 'cadet-1-research-bank',
      version: 2,
      exportedAt: '2026-11-15T00:00:00.000Z',
      balance: 100,
      highScores: { flight: 1, outpost: -1 },
    }))).toThrow('invalid high scores');
    expect(() => parseResearchBankBackup(JSON.stringify({
      format: 'cadet-1-research-bank',
      version: 1,
      exportedAt: '2026-11-15T00:00:00.000Z',
      balance: -100,
    }))).toThrow('invalid research balance');
    expect(() => createResearchBankBackup(100, { flight: 1, outpost: 2 }, 'not a date')).toThrow('valid date');
  });
});
