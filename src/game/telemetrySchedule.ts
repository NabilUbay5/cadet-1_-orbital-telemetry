/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TELEMETRY_UPDATE_INTERVAL_MS = 45;

export function isTelemetryUpdateDue(now: number, lastUpdate: number): boolean {
  return now - lastUpdate >= TELEMETRY_UPDATE_INTERVAL_MS;
}
