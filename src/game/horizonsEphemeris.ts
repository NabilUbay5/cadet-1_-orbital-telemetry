/** Geometric Moon/Earth reference states, independent of the arcade craft model. */
export type StateVector = readonly [number, number, number, number, number, number, number];
export interface EphemerisSnapshot {
  source: string;
  queryUrl: string;
  retrievedAt: string;
  apiVersion: string;
  target: 'Moon (301)';
  center: 'Earth center (399)';
  frame: 'ICRF equatorial';
  timeScale: 'TDB';
  units: 'km, km/s';
  /** Julian day TDB, X/Y/Z in km, VX/VY/VZ in km/s. */
  samples: readonly StateVector[];
}

export function parseHorizonsVectors(result: string): StateVector[] {
  const start = result.indexOf('$$SOE');
  const end = result.indexOf('$$EOE', start);
  if (start < 0 || end < 0) throw new Error('Horizons response contains no vector table');
  const samples = result.slice(start + 5, end).trim().split('\n').map(line => {
    const columns = line.split(',').map(value => value.trim());
    const raw = [columns[0], ...columns.slice(2, 8)];
    const values = raw.map(Number);
    if (columns.length < 8 || values.length !== 7 || raw.some(value => !value) || values.some(value => !Number.isFinite(value))) {
      throw new Error('Invalid Horizons vector row');
    }
    return [values[0], values[1], values[2], values[3], values[4], values[5], values[6]] as StateVector;
  });
  if (samples.length < 2 || samples.some((sample, i) => i > 0 && sample[0] <= samples[i - 1][0])) {
    throw new Error('Horizons epochs must increase');
  }
  return samples;
}

/** Cubic Hermite position and its derivative; velocities are in km/s, time in seconds. */
function component(p0: number, p1: number, v0: number, v1: number, t: number, duration: number, velocity: boolean): number {
  if (velocity) return ((6 * t * t - 6 * t) * p0 + (-6 * t * t + 6 * t) * p1) / duration
    + (3 * t * t - 4 * t + 1) * v0 + (3 * t * t - 2 * t) * v1;
  return (2 * t ** 3 - 3 * t * t + 1) * p0 + (-2 * t ** 3 + 3 * t * t) * p1
    + (t ** 3 - 2 * t * t + t) * duration * v0 + (t ** 3 - t * t) * duration * v1;
}

/** Called at UI/log cadence, never from a physics substep. Never extrapolates. */
export function sampleEphemeris(snapshot: EphemerisSnapshot, metSeconds: number) {
  if (!Number.isFinite(metSeconds) || metSeconds < 0 || snapshot.samples.length < 2) return null;
  const first = snapshot.samples[0];
  const last = snapshot.samples[snapshot.samples.length - 1];
  const jd = first[0] + metSeconds / 86400;
  if (jd > last[0]) return null;
  let index = 0;
  while (index < snapshot.samples.length - 2 && jd > snapshot.samples[index + 1][0]) index++;
  const a = snapshot.samples[index];
  const b = snapshot.samples[index + 1];
  const duration = (b[0] - a[0]) * 86400;
  const t = (jd - a[0]) * 86400 / duration;
  const x = component(a[1], b[1], a[4], b[4], t, duration, false);
  const y = component(a[2], b[2], a[5], b[5], t, duration, false);
  const z = component(a[3], b[3], a[6], b[6], t, duration, false);
  const vx = component(a[1], b[1], a[4], b[4], t, duration, true);
  const vy = component(a[2], b[2], a[5], b[5], t, duration, true);
  const vz = component(a[3], b[3], a[6], b[6], t, duration, true);
  const distanceKm = Math.hypot(x, y, z);
  return { julianDayTdb: jd, distanceKm, speedKmS: Math.hypot(vx, vy, vz), rangeRateKmS: (x * vx + y * vy + z * vz) / distanceKm };
}
