/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Regenerates src/data/nasa/horizonsSnapshot.ts from the NASA/JPL Horizons API.
 *
 *   bun run data:horizons
 *
 * For each outpost site it asks Horizons for the Sun's elevation as seen from
 * that spot on the surface, then turns the samples into a per-day "sunlight"
 * value: the share of the day the Sun is above the horizon, scaled by the
 * body's mean solar constant relative to the Moon's. It also records the
 * body constants (solar constant, length of a solar day) that the game uses.
 *
 * The game never calls Horizons at runtime. It reads the bundled snapshot, so
 * it works offline and the physics loop never waits on the network.
 */

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

interface HorizonsResponse {
  result: string;
  signature: { source: string; version: string };
}

async function horizons(params: Record<string, string>): Promise<HorizonsResponse> {
  const url = new URL(API);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, `'${v}'`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status} for ${url}`);
  const body = (await res.json()) as HorizonsResponse;
  if (!body.result.includes('$$SOE') && params.MAKE_EPHEM !== 'NO') {
    throw new Error(`Horizons returned no ephemeris:\n${body.result.slice(0, 800)}`);
  }
  return body;
}

/** Reads "Solar Constant (W/m^2)  perihelion  aphelion  mean" from a body data page. */
function solarConstant(text: string): { perihelion: number; aphelion: number; mean: number } {
  const line = text.split('\n').find((l) => /Solar Constant \(W\/m\^2\)/.test(l));
  if (!line) throw new Error('Solar constant not found');
  const nums = line.replace(/\+-\d+/g, '').match(/\d+(\.\d+)?/g)!.map(Number).filter((n) => n !== 2);
  const [perihelion, aphelion, mean] = nums.slice(-3);
  return { perihelion, aphelion, mean };
}

function meanSolarDaySeconds(text: string): number {
  const sol = text.match(/Mean solar day \(sol\)\s*=\s*([\d.]+)\s*s/);
  if (sol) return Number(sol[1]);
  const days = text.match(/Mean solar day\s*=\s*([\d.]+)\s*d/);
  if (days) return Number(days[1]) * 86400;
  throw new Error('Mean solar day not found');
}

interface Sample { t: number; elev: number }

function parseElevations(text: string): Sample[] {
  const block = text.slice(text.indexOf('$$SOE') + 5, text.indexOf('$$EOE'));
  return block
    .trim()
    .split('\n')
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const t = Date.parse(cols[0].replace(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}:\d{2})$/, '$2 $3 $1 $4 UTC'));
      return { t, elev: Number(cols[4]) };
    })
    .filter((s) => Number.isFinite(s.t) && Number.isFinite(s.elev));
}

async function sunElevations(body: string, lonE: number, lat: number, start: string, stop: string, step: string) {
  const r = await horizons({
    COMMAND: '10',
    CENTER: `coord@${body}`,
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `${lonE},${lat},0`,
    START_TIME: start,
    STOP_TIME: stop,
    STEP_SIZE: step,
    QUANTITIES: '4',
    CSV_FORMAT: 'YES',
    OBJ_DATA: 'NO',
  });
  return { samples: parseElevations(r.result), version: r.signature.version };
}

/** Share of samples in each day-long bin with the Sun above the horizon. */
function dailySunFraction(samples: Sample[], start: number, daySeconds: number, days: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const a = start + d * daySeconds * 1000;
    const b = a + daySeconds * 1000;
    const bin = samples.filter((s) => s.t >= a && s.t < b);
    if (bin.length === 0) throw new Error(`No samples for day ${d}`);
    out.push(bin.filter((s) => s.elev > 0).length / bin.length);
  }
  return out;
}

const round = (n: number, p = 3) => Math.round(n * 10 ** p) / 10 ** p;
const DAYS = 30;

const moonData = (await horizons({ COMMAND: '301', OBJ_DATA: 'YES', MAKE_EPHEM: 'NO' })).result;
const marsData = (await horizons({ COMMAND: '499', OBJ_DATA: 'YES', MAKE_EPHEM: 'NO' })).result;
const moonSolar = solarConstant(moonData);
const marsSolar = solarConstant(marsData);
const moonDay = meanSolarDaySeconds(moonData);
const marsSol = meanSolarDaySeconds(marsData);

// Moon: Mare Tranquillitatis (Apollo 11 landing site). Start the mission 3 days
// after local sunrise so the lunar night falls in the middle of the 30 days.
const MOON = { name: 'Mare Tranquillitatis, Moon', lonE: 23.47, lat: 0.67 };
const moonSearch = await sunElevations('301', MOON.lonE, MOON.lat, '2027-01-01', '2027-02-15', '1h');
const sunriseIdx = moonSearch.samples.findIndex((s, i) => i > 0 && moonSearch.samples[i - 1].elev <= 0 && s.elev > 0);
if (sunriseIdx < 0) throw new Error('No lunar sunrise found');
const moonStart = moonSearch.samples[sunriseIdx].t + 3 * 86400 * 1000;
const moonEnd = new Date(moonStart + (DAYS + 1) * 86400 * 1000);
const moonEph = await sunElevations('301', MOON.lonE, MOON.lat, new Date(moonStart).toISOString().slice(0, 16).replace('T', ' '), moonEnd.toISOString().slice(0, 16).replace('T', ' '), '1h');
const moonSun = dailySunFraction(moonEph.samples, moonStart, 86400, DAYS);

// Mars: Jezero Crater (Perseverance landing site). One sample every 30 min.
const MARS = { name: 'Jezero Crater, Mars', lonE: 77.45, lat: 18.44 };
const marsStart = Date.parse('2027-01-01T00:00:00Z');
const marsEnd = new Date(marsStart + (DAYS * marsSol + 86400) * 1000);
// Horizons treats Mars as an IAU west-positive body and asks for east longitude as a negative number.
const marsEph = await sunElevations('499', -MARS.lonE, MARS.lat, '2027-01-01 00:00', marsEnd.toISOString().slice(0, 16).replace('T', ' '), '30m');
const marsSun = dailySunFraction(marsEph.samples, marsStart, marsSol, DAYS);

const marsScale = marsSolar.mean / moonSolar.mean;

const snapshot = {
  source: 'NASA/JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)',
  apiVersion: moonEph.version,
  retrieved: new Date().toISOString().slice(0, 10),
  method:
    'Sun elevation from a surface site (QUANTITIES=4). Daily sunlight = share of samples with the Sun above the horizon, times the body mean solar constant divided by the Moon mean solar constant. Assumes sun-tracking panels; dust and atmosphere are handled as game events.',
  moon: {
    site: MOON.name,
    lonE: MOON.lonE,
    lat: MOON.lat,
    startUtc: new Date(moonStart).toISOString(),
    stepHours: 1,
    dayLengthSeconds: 86400,
    meanSolarDaySeconds: round(moonDay, 1),
    solarConstantWm2: moonSolar,
    sunlight: moonSun.map((f) => round(f)),
  },
  mars: {
    site: MARS.name,
    lonE: MARS.lonE,
    lat: MARS.lat,
    startUtc: new Date(marsStart).toISOString(),
    stepHours: 0.5,
    dayLengthSeconds: round(marsSol, 2),
    meanSolarDaySeconds: round(marsSol, 2),
    solarConstantWm2: marsSolar,
    sunlight: marsSun.map((f) => round(f * marsScale)),
  },
};

const out = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED by scripts/fetch-horizons.ts from the NASA/JPL Horizons API.
// Do not edit by hand. Regenerate with: bun run data:horizons

export interface SolarConstant { perihelion: number; aphelion: number; mean: number }

export interface SiteSunlight {
  site: string;
  lonE: number;
  lat: number;
  startUtc: string;
  stepHours: number;
  dayLengthSeconds: number;
  meanSolarDaySeconds: number;
  solarConstantWm2: SolarConstant;
  /** One value per mission day (Moon) or sol (Mars): 0 = dark, 1 = full lunar-distance sun all day. */
  sunlight: readonly number[];
}

export const HORIZONS_SNAPSHOT: {
  source: string;
  apiVersion: string;
  retrieved: string;
  method: string;
  moon: SiteSunlight;
  mars: SiteSunlight;
} = ${JSON.stringify(snapshot, null, 2)};
`;

await Bun.write(new URL('../src/data/nasa/horizonsSnapshot.ts', import.meta.url), out);
console.log('Moon start', snapshot.moon.startUtc, 'sunlight', snapshot.moon.sunlight.join(' '));
console.log('Mars start', snapshot.mars.startUtc, 'sunlight', snapshot.mars.sunlight.join(' '));
