/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TOTAL_TELEMETRY_PODS = 3;
export const TELEMETRY_POD_PICKUP_RADIUS = 4.5;

interface CollectiblePod {
  collected: boolean;
}

export class TelemetryPodTracker {
  private collectedCount = 0;

  get count(): number {
    return this.collectedCount;
  }

  collect(pod: CollectiblePod, distance: number): boolean {
    if (pod.collected || !Number.isFinite(distance) || distance >= TELEMETRY_POD_PICKUP_RADIUS) {
      return false;
    }

    pod.collected = true;
    this.collectedCount++;
    return true;
  }

  reset(pods: readonly CollectiblePod[]): void {
    for (const pod of pods) {
      pod.collected = false;
    }
    this.collectedCount = 0;
  }
}
