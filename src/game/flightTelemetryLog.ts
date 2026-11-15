import type { EphemerisSnapshot } from './horizonsEphemeris.ts';
import { sampleEphemeris } from './horizonsEphemeris.ts';

export interface FlightLogSample {
  metSeconds: number;
  stage: number;
  speedMps: number;
  throttlePercent: number;
  hullPercent: number;
  oxygenPercent: number;
  energyPercent: number;
  pitchDeg: number;
  yawDeg: number;
  rollDeg: number;
}

/** Bounded one-second log, recorded outside physics substeps. */
export class FlightTelemetryLog {
  private readonly samples: Array<FlightLogSample | undefined>;
  private next = 0;
  private count = 0;
  private lastSecond = -1;
  private droppedSamples = 0;

  constructor(private readonly capacity = 3600) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Log capacity must be a positive integer');
    this.samples = new Array(capacity);
  }

  public shouldRecord(metSeconds: number): boolean {
    return Number.isFinite(metSeconds) && metSeconds >= 0 && Math.floor(metSeconds) > this.lastSecond;
  }

  public record(sample: FlightLogSample, force = false): void {
    if (!Number.isFinite(sample.metSeconds) || sample.metSeconds < 0) return;
    const second = Math.floor(sample.metSeconds);
    if (second < this.lastSecond || (!force && second === this.lastSecond)) return;
    if (force && second === this.lastSecond && this.count > 0) {
      this.samples[(this.next + this.capacity - 1) % this.capacity] = { ...sample };
      return;
    }
    this.samples[this.next] = { ...sample };
    this.next = (this.next + 1) % this.capacity;
    if (this.count === this.capacity) this.droppedSamples++;
    else this.count++;
    this.lastSecond = second;
  }

  public clear(): void {
    this.samples.fill(undefined);
    this.next = this.count = this.droppedSamples = 0;
    this.lastSecond = -1;
  }

  public serialize(snapshot: EphemerisSnapshot): string {
    const samples = [];
    for (let i = 0; i < this.count; i++) {
      const sample = this.samples[(this.next - this.count + this.capacity + i) % this.capacity];
      if (sample) samples.push({ ...sample, nasaReference: sampleEphemeris(snapshot, sample.metSeconds) });
    }
    const { samples: vectors, ...source } = snapshot;
    return JSON.stringify({
      schemaVersion: 1,
      sampleIntervalSeconds: 1,
      capacity: this.capacity,
      droppedSamples: this.droppedSamples,
      simulation: 'Arcade craft readings; NASA reference states do not drive craft physics.',
      nasaReference: {
        ...source, interpolation: 'Cubic Hermite position and derivative; no extrapolation',
        startJulianDayTdb: vectors[0][0], endJulianDayTdb: vectors[vectors.length - 1][0],
      },
      samples,
    }, null, 2);
  }
}
