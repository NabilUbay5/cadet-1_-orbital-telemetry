import { describe, expect, test } from 'bun:test';
import {
  addResearchPoints,
  readResearchBalance,
  RESEARCH_BANK_STORAGE_KEY,
  ResearchStorage,
} from '../researchBank.ts';

function createStorage(initialValue: string | null = null): ResearchStorage {
  const values = new Map<string, string>();
  if (initialValue !== null) values.set(RESEARCH_BANK_STORAGE_KEY, initialValue);

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('research bank', () => {
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
});
