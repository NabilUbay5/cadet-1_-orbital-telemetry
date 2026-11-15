/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const RESEARCH_BANK_STORAGE_KEY = 'cadet-1-research-points';

export interface ResearchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readResearchBalance(storage: ResearchStorage): number {
  const storedBalance = storage.getItem(RESEARCH_BANK_STORAGE_KEY);
  if (storedBalance === null || !/^\d+$/.test(storedBalance)) return 0;

  const balance = Number(storedBalance);
  return Number.isSafeInteger(balance) ? balance : 0;
}

export function addResearchPoints(storage: ResearchStorage, points: number): number {
  if (!Number.isSafeInteger(points) || points < 0) {
    throw new RangeError('Research points must be a non-negative safe integer.');
  }

  const updatedBalance = readResearchBalance(storage) + points;
  if (!Number.isSafeInteger(updatedBalance)) {
    throw new RangeError('Research balance exceeds the safe integer limit.');
  }

  storage.setItem(RESEARCH_BANK_STORAGE_KEY, String(updatedBalance));
  return updatedBalance;
}
