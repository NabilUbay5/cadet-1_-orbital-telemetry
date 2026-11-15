/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const RESEARCH_BANK_STORAGE_KEY = 'cadet-1-research-points';
export const RESEARCH_BACKUP_FORMAT = 'cadet-1-research-bank';
export const RESEARCH_BACKUP_VERSION = 1;

export interface ResearchBankBackup {
  format: typeof RESEARCH_BACKUP_FORMAT;
  version: typeof RESEARCH_BACKUP_VERSION;
  exportedAt: string;
  balance: number;
}

export interface ResearchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

export function createResearchBankBackup(balance: number, exportedAt = new Date().toISOString()): string {
  validateBalance(balance);

  if (!Number.isFinite(Date.parse(exportedAt))) {
    throw new TypeError('Backup export time must be a valid date.');
  }

  const backup: ResearchBankBackup = {
    format: RESEARCH_BACKUP_FORMAT,
    version: RESEARCH_BACKUP_VERSION,
    exportedAt,
    balance,
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
  if (backup.format !== RESEARCH_BACKUP_FORMAT || backup.version !== RESEARCH_BACKUP_VERSION) {
    throw new TypeError('Backup file format or version is not supported.');
  }
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) {
    throw new TypeError('Backup file has an invalid export time.');
  }
  if (typeof backup.balance !== 'number' || !Number.isSafeInteger(backup.balance) || backup.balance < 0) {
    throw new TypeError('Backup file has an invalid research balance.');
  }

  return {
    format: RESEARCH_BACKUP_FORMAT,
    version: RESEARCH_BACKUP_VERSION,
    exportedAt: backup.exportedAt,
    balance: backup.balance,
  };
}
