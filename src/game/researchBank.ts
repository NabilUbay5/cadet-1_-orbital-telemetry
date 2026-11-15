/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  validateHighScores,
  type HighScoreRecords,
} from './scoreLogic.ts';

export const RESEARCH_BANK_STORAGE_KEY = 'cadet-1-research-points';
export const RESEARCH_BACKUP_FORMAT = 'cadet-1-research-bank';
export const RESEARCH_BACKUP_VERSION = 2;
const PREVIOUS_RESEARCH_BACKUP_VERSION = 1;

export interface ResearchBankBackup {
  format: typeof RESEARCH_BACKUP_FORMAT;
  version: typeof RESEARCH_BACKUP_VERSION | typeof PREVIOUS_RESEARCH_BACKUP_VERSION;
  exportedAt: string;
  balance: number;
  highScores?: HighScoreRecords;
}

export interface ResearchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function claimResearchReward(processedEvents: Set<string>, eventId: string): boolean {
  if (processedEvents.has(eventId)) return false;
  processedEvents.add(eventId);
  return true;
}

function validateBalance(balance: number): void {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError('Research balance must be a non-negative safe integer.');
  }
}

export function readResearchBalance(storage: ResearchStorage): number {
  const storedBalance = storage.getItem(RESEARCH_BANK_STORAGE_KEY);
  if (storedBalance === null || !/^\d+$/.test(storedBalance)) return 0;

  const balance = Number(storedBalance);
  return Number.isSafeInteger(balance) ? balance : 0;
}

export function writeResearchBalance(storage: ResearchStorage, balance: number): number {
  validateBalance(balance);
  storage.setItem(RESEARCH_BANK_STORAGE_KEY, String(balance));
  return balance;
}

export function addResearchPoints(storage: ResearchStorage, points: number): number {
  if (!Number.isSafeInteger(points) || points < 0) {
    throw new RangeError('Research points must be a non-negative safe integer.');
  }

  const updatedBalance = readResearchBalance(storage) + points;
  validateBalance(updatedBalance);

  return writeResearchBalance(storage, updatedBalance);
}

export function createResearchBankBackup(
  balance: number,
  highScores: HighScoreRecords,
  exportedAt = new Date().toISOString(),
): string {
  validateBalance(balance);
  validateHighScores(highScores);

  if (!Number.isFinite(Date.parse(exportedAt))) {
    throw new TypeError('Backup export time must be a valid date.');
  }

  const backup: ResearchBankBackup = {
    format: RESEARCH_BACKUP_FORMAT,
    version: RESEARCH_BACKUP_VERSION,
    exportedAt,
    balance,
    highScores: { ...highScores },
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseResearchBankBackup(contents: string): ResearchBankBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new TypeError('Backup file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Backup file must contain a JSON object.');
  }

  const backup = parsed as Record<string, unknown>;
  if (
    backup.format !== RESEARCH_BACKUP_FORMAT
    || (backup.version !== RESEARCH_BACKUP_VERSION && backup.version !== PREVIOUS_RESEARCH_BACKUP_VERSION)
  ) {
    throw new TypeError('Backup file format or version is not supported.');
  }
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) {
    throw new TypeError('Backup file has an invalid export time.');
  }
  if (typeof backup.balance !== 'number' || !Number.isSafeInteger(backup.balance) || backup.balance < 0) {
    throw new TypeError('Backup file has an invalid research balance.');
  }

  let highScores: HighScoreRecords | undefined;
  if (backup.version === RESEARCH_BACKUP_VERSION) {
    if (typeof backup.highScores !== 'object' || backup.highScores === null || Array.isArray(backup.highScores)) {
      throw new TypeError('Backup file has invalid high scores.');
    }

    const rawHighScores = backup.highScores as Record<string, unknown>;
    if (
      typeof rawHighScores.flight !== 'number'
      || typeof rawHighScores.outpost !== 'number'
      || !Number.isSafeInteger(rawHighScores.flight)
      || rawHighScores.flight < 0
      || !Number.isSafeInteger(rawHighScores.outpost)
      || rawHighScores.outpost < 0
    ) {
      throw new TypeError('Backup file has invalid high scores.');
    }
    highScores = { flight: rawHighScores.flight, outpost: rawHighScores.outpost };
    validateHighScores(highScores);
  }

  return {
    format: RESEARCH_BACKUP_FORMAT,
    version: backup.version,
    exportedAt: backup.exportedAt,
    balance: backup.balance,
    ...(highScores ? { highScores } : {}),
  };
}
