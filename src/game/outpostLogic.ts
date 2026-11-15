/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Outpost Ops: a turn-based Moon/Mars base where cadets balance power, oxygen,
 * water, food and radiation shielding for a crew of four over 30 days.
 *
 * Pure game rules with no DOM, React or Three.js, so everything here runs in
 * bun:test. One turn is one mission day (an Earth day on the Moon, a sol on
 * Mars). Sunlight for every day comes from the bundled NASA/JPL Horizons
 * snapshot; see scripts/fetch-horizons.ts.
 */

import { HORIZONS_SNAPSHOT } from '../data/nasa/horizonsSnapshot.ts';

export type Destination = 'moon' | 'mars';
export type Difficulty = 'cadet' | 'commander';
export type ModuleKey = 'solar' | 'reactor' | 'battery' | 'o2gen' | 'recycler' | 'greenhouse' | 'shield';
export type FailableKey = 'solar' | 'reactor' | 'o2gen' | 'recycler' | 'greenhouse';
export type JobKey = 'maint' | 'build' | 'farm' | 'ice' | 'sci';
export type ServiceKey = 'hab' | 'o2' | 'rec' | 'gh' | 'ice' | 'sci' | 'bld';
export type LineKind = 'good' | 'warn' | 'bad' | 'info';

export const MISSION_DAYS = 30;
export const OUTPOST_DAILY_SURVIVAL_SCORE = 100;
export const OUTPOST_HEALTHY_CREW_THRESHOLD = 75;
export const OUTPOST_COMPLETION_PERFORMANCE_BONUS = 1_000;
export const OUTPOST_HEALTH_SCORE_PER_PERCENT = 10;
export const OUTPOST_COMMANDER_SCORE_MULTIPLIER = 1.5;
/** Game-scale mission radiation limit per astronaut, in mSv. */
export const DOSE_LIMIT = 30;
export const CAP = { o2: 120, water: 160, food: 120 } as const;
/** Game-scale kWh output per day at full normalized snapshot sunlight (1.0). */
export const PANEL_KWH = 12;
export const REACTOR_KWH = 30;
/** Extra heater load during the lunar night. */
export const NIGHT_HEAT_KWH = 8;
/** Dust storms on Mars let through about a quarter of the clear-sky sunlight (game value). */
export const STORM_SUNLIGHT = 0.25;
export const SCIENCE_GOAL = 40;
export const MOON_MISSION_RESEARCH_REWARD = 500;
export const MARS_MISSION_RESEARCH_REWARD = 800;
export const COMMANDER_RESEARCH_REWARD_MULTIPLIER = 1.5;

export interface OutpostResearchReward {
  basePoints: number;
  difficultyBonusPoints: number;
  points: number;
  siteTier: 'Standard' | 'Hard';
  difficulty: Difficulty;
}

export interface DestinationInfo {
  name: string;
  site: string;
  /** Unverified literature-inspired scenario input in mSv per game day; not a mission limit. */
  dose: number;
  /** Extra dose from one big unsheltered flare (game value). */
  flare: number;
  /** Heating load in kWh per day before night penalties. */
  heat: number;
  dayWord: string;
}

export const DESTINATIONS: Record<Destination, DestinationInfo> = {
  // Scenario inputs; cited publications and the source-access limitation are documented in README.
  moon: { name: 'Moon', site: HORIZONS_SNAPSHOT.moon.site, dose: 1.37, flare: 14, heat: 6, dayWord: 'Day' },
  mars: { name: 'Mars', site: HORIZONS_SNAPSHOT.mars.site, dose: 0.64, flare: 8, heat: 12, dayWord: 'Sol' },
};

export function getOutpostResearchReward(
  dest: Destination,
  difficulty: Difficulty,
  result: OutpostState['result'],
): OutpostResearchReward {
  const basePoints = dest === 'moon' ? MOON_MISSION_RESEARCH_REWARD : MARS_MISSION_RESEARCH_REWARD;
  const multiplier = difficulty === 'commander' ? COMMANDER_RESEARCH_REWARD_MULTIPLIER : 1;
  const points = result === 'complete' ? Math.round(basePoints * multiplier) : 0;

  return {
    basePoints: result === 'complete' ? basePoints : 0,
    difficultyBonusPoints: result === 'complete' ? points - basePoints : 0,
    points,
    siteTier: dest === 'moon' ? 'Standard' : 'Hard',
    difficulty,
  };
}

export interface ModuleInfo { name: string; cost: number; max: number; failable: boolean; desc: string }
export const MODULES: Record<ModuleKey, ModuleInfo> = {
  solar: { name: 'Solar array', cost: 3, max: 10, failable: true, desc: `+${PANEL_KWH} kWh in a full day of sunlight. Zero at night.` },
  reactor: { name: 'Fission reactor', cost: 8, max: 3, failable: true, desc: `+${REACTOR_KWH} kWh every day, sun or no sun.` },
  battery: { name: 'Battery bank', cost: 2, max: 6, failable: false, desc: 'Stores 40 more kWh for nights and storms.' },
  o2gen: { name: 'Oxygen generator', cost: 4, max: 3, failable: true, desc: 'Makes 5 O2 by splitting water. Uses 8 kWh and 2 water.' },
  recycler: { name: 'Water recycler', cost: 3, max: 3, failable: true, desc: 'Cleans 5 used water. Uses 4 kWh.' },
  greenhouse: { name: 'Greenhouse', cost: 5, max: 3, failable: true, desc: 'Grows 2.5 food and 1 O2. Uses 6 kWh, 1 water and 1 farming block.' },
  shield: { name: 'Regolith shield', cost: 4, max: 5, failable: false, desc: 'Piles soil on the habitat. Each layer cuts indoor dose by 16%.' },
};
const FAILABLE: readonly FailableKey[] = ['solar', 'reactor', 'o2gen', 'recycler', 'greenhouse'];

export interface JobInfo { key: JobKey; name: string; hint: string; outdoor: boolean }
export const JOBS: readonly JobInfo[] = [
  { key: 'maint', name: 'Maintenance', hint: 'Fixes 1 broken machine per block. Spare blocks cut breakdowns.', outdoor: false },
  { key: 'build', name: 'Construction', hint: '+1 build point per block. Outdoors. 1 kWh.', outdoor: true },
  { key: 'farm', name: 'Farming', hint: 'Each greenhouse needs 1 block for full yield.', outdoor: false },
  { key: 'ice', name: 'Ice mining', hint: '+6 water per block. Outdoors. 3 kWh.', outdoor: true },
  { key: 'sci', name: 'Science', hint: '+3 samples per block. Outdoors. 2 kWh.', outdoor: true },
];

export interface ServiceInfo { key: ServiceKey; label: string; lifeSupport: boolean }
/** Power is handed out in this order, so life support is served first. */
export const SERVICES: readonly ServiceInfo[] = [
  { key: 'hab', label: 'Habitat and heaters', lifeSupport: true },
  { key: 'o2', label: 'Oxygen generator', lifeSupport: true },
  { key: 'rec', label: 'Water recycler', lifeSupport: true },
  { key: 'gh', label: 'Greenhouses', lifeSupport: true },
  { key: 'ice', label: 'Ice mining', lifeSupport: false },
  { key: 'sci', label: 'Science', lifeSupport: false },
  { key: 'bld', label: 'Construction', lifeSupport: false },
];

export interface CrewMember { name: string; role: string; hp: number; morale: number; aboard: boolean }
export type Allocation = Record<JobKey, number>;
export interface Plan { alloc: Allocation; shelter: boolean }
export interface Stats {
  brownouts: number; noWater: number; noOxygen: number; noFood: number;
  flaresHit: number; flaresSheltered: number; evacuations: number;
  breakdowns: number; repaired: number; wastedKwh: number; lowMoraleDays: number;
}

export interface OutpostState {
  dest: Destination;
  difficulty: Difficulty;
  day: number;
  phase: 'play' | 'over';
  result: 'complete' | 'aborted' | null;
  crew: CrewMember[];
  res: { o2: number; water: number; food: number; battery: number };
  modules: Record<ModuleKey, number>;
  broken: Record<FailableKey, number>;
  buildPoints: number;
  science: number;
  dailySurvivalScore: number;
  dose: number;
  flareDays: number[];
  storm: { start: number; length: number } | null;
  resupplyDays: number[];
  meteorDays: number[];
  iceDay: number;
  flareToday: boolean;
  stats: Stats;
  /** How often each plain-language shortage cause happened, for the debrief. */
  causes: Record<string, number>;
  rngState: number;
}

/** Small deterministic PRNG (mulberry32) whose state lives in the game state. */
export function nextRandom(s: { rngState: number }): number {
  s.rngState = (s.rngState + 0x6d2b79f5) | 0;
  let t = s.rngState;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function displayedResourceNet(stock: number, cap: number, net: number): number {
  return net > 0 ? Math.min(net, Math.max(0, cap - stock)) : net;
}
export const aboard = (s: OutpostState) => s.crew.filter((c) => c.aboard);
export const working = (s: OutpostState, k: FailableKey) => Math.max(0, s.modules[k] - s.broken[k]);
export const brokenTotal = (s: OutpostState) => FAILABLE.reduce((t, k) => t + s.broken[k], 0);
export const batteryCap = (s: OutpostState) => 60 + 40 * s.modules.battery;

const CREW: ReadonlyArray<Pick<CrewMember, 'name' | 'role'>> = [
  { name: 'Amara', role: 'Commander' },
  { name: 'Kenji', role: 'Engineer' },
  { name: 'Lucia', role: 'Flight doctor' },
  { name: 'Sam', role: 'Botanist' },
];

export function newOutpost(dest: Destination, difficulty: Difficulty, seed: number): OutpostState {
  const easy = difficulty === 'cadet';
  const mul = easy ? 1.3 : 1;
  const s: OutpostState = {
    dest, difficulty, day: 1, phase: 'play', result: null,
    crew: CREW.map((c) => ({ ...c, hp: 100, morale: 80, aboard: true })),
    res: { o2: Math.round(40 * mul), water: Math.round(100 * mul), food: Math.round(60 * mul), battery: 70 },
    modules: dest === 'moon'
      ? { solar: 5, reactor: 0, battery: 1, o2gen: 1, recycler: 1, greenhouse: 0, shield: 0 }
      : { solar: 8, reactor: 1, battery: 1, o2gen: 1, recycler: 1, greenhouse: 0, shield: 0 },
    broken: { solar: 0, reactor: 0, o2gen: 0, recycler: 0, greenhouse: 0 },
    buildPoints: 8, science: 0, dailySurvivalScore: 0, dose: 0,
    flareDays: [], storm: null, resupplyDays: [10, 20], meteorDays: [], iceDay: 0, flareToday: false,
    stats: { brownouts: 0, noWater: 0, noOxygen: 0, noFood: 0, flaresHit: 0, flaresSheltered: 0, evacuations: 0, breakdowns: 0, repaired: 0, wastedKwh: 0, lowMoraleDays: 0 },
    causes: {},
    rngState: seed | 0,
  };
  const rand = () => nextRandom(s);
  s.iceDay = 5 + Math.floor(rand() * 14);
  const flares = (dest === 'moon' ? 3 : 2) - (easy ? 1 : 0);
  for (let tries = 0; s.flareDays.length < flares && tries < 200; tries++) {
    const d = 6 + Math.floor(rand() * 22);
    if (s.flareDays.every((f) => Math.abs(f - d) >= 5)) s.flareDays.push(d);
  }
  s.flareDays.sort((a, b) => a - b);
  if (dest === 'mars') s.storm = { start: 8 + Math.floor(rand() * 10), length: easy ? 4 : 6 };
  else s.meteorDays = [5 + Math.floor(rand() * 10), 17 + Math.floor(rand() * 10)];
  return s;
}

/** NASA/JPL Horizons sunlight for a mission day (1-based), before dust storms. */
export function horizonsSunlight(dest: Destination, day: number): number {
  const series = HORIZONS_SNAPSHOT[dest].sunlight;
  return series[clamp(day, 1, series.length) - 1];
}

export interface Environment { sunlight: number; night: boolean; storm: boolean }
export function environment(s: OutpostState, day = s.day): Environment {
  let sunlight = horizonsSunlight(s.dest, day);
  const night = s.dest === 'moon' && sunlight < 0.05;
  const storm = !!s.storm && day >= s.storm.start && day < s.storm.start + s.storm.length;
  if (storm) sunlight *= STORM_SUNLIGHT;
  return { sunlight, night, storm };
}

/** Days until the Moon site's sun next sets or rises, from the Horizons series. */
export function nextLightChange(s: OutpostState): { kind: 'sunset' | 'sunrise'; inDays: number } | null {
  if (s.dest !== 'moon') return null;
  const now = environment(s).night;
  for (let d = s.day + 1; d <= MISSION_DAYS; d++) {
    if (environment(s, d).night !== now) return { kind: now ? 'sunrise' : 'sunset', inDays: d - s.day };
  }
  return null;
}

export function allowedBlocks(s: OutpostState): number {
  const crew = aboard(s);
  let blocks = 2 * crew.length;
  const morale = crew.reduce((t, c) => t + c.morale, 0) / Math.max(1, crew.length);
  if (morale < 20) blocks -= 2;
  else if (morale < 40) blocks -= 1;
  return Math.max(2, blocks);
}

export const usedBlocks = (a: Allocation) => a.maint + a.build + a.farm + a.ice + a.sci;

export type EffectiveAllocation = Allocation & { rest: number };
export function effectiveAllocation(s: OutpostState, plan: Plan): EffectiveAllocation {
  const a: EffectiveAllocation = { ...plan.alloc, rest: 0 };
  a.rest = Math.max(0, allowedBlocks(s) - usedBlocks(a));
  if (s.flareToday && plan.shelter) {
    a.rest += a.build + a.ice + a.sci;
    a.build = a.ice = a.sci = 0;
  }
  return a;
}

/** Trims a plan to fit the blocks available today (crew losses or low morale shrink it). */
export function fitPlan(s: OutpostState, plan: Plan): void {
  const allowed = allowedBlocks(s);
  const order: JobKey[] = ['build', 'sci', 'ice', 'farm', 'maint'];
  let used = usedBlocks(plan.alloc);
  for (let i = 0; used > allowed && i < 100; i++) {
    const k = order[i % order.length];
    if (plan.alloc[k] > 0) { plan.alloc[k]--; used--; }
  }
}

export interface DayForecast {
  crew: number;
  allowed: number;
  env: Environment;
  solarKwh: number;
  reactorKwh: number;
  generated: number;
  demand: Record<ServiceKey, number>;
  served: Record<ServiceKey, number>;
  totalDemand: number;
  batteryAfter: number;
  batteryCap: number;
  wastedKwh: number;
  lifeSupportShort: boolean;
  /** Share of powered production supported by water, after reserving crew needs. */
  o2WaterFraction: number;
  greenhouseWaterFraction: number;
  o2Net: number;
  waterNet: number;
  foodNet: number;
  /** Effective indoor/outdoor exposure before any dedicated flare-shelter reduction. */
  exposureFactor: number;
  dose: number;
  baseDose: number;
  flareDose: number;
  science: number;
  buildPoints: number;
}

/** Deterministic result of running today with this plan. Used for the live forecast and for the real turn. */
export function forecastDay(s: OutpostState, plan: Plan): DayForecast {
  const D = DESTINATIONS[s.dest];
  const a = effectiveAllocation(s, plan);
  const env = environment(s);
  const crew = aboard(s).length;
  const allowed = Math.max(1, allowedBlocks(s));
  const solarKwh = working(s, 'solar') * PANEL_KWH * env.sunlight;
  const reactorKwh = working(s, 'reactor') * REACTOR_KWH;
  const generated = solarKwh + reactorKwh;
  const demand: Record<ServiceKey, number> = {
    hab: 14 + 1.5 * crew + D.heat + (env.night ? NIGHT_HEAT_KWH : 0),
    o2: working(s, 'o2gen') * 8,
    rec: working(s, 'recycler') * 4,
    gh: working(s, 'greenhouse') * 6,
    ice: a.ice * 3,
    sci: a.sci * 2,
    bld: a.build,
  };
  let available = generated + s.res.battery;
  const served = {} as Record<ServiceKey, number>;
  for (const sv of SERVICES) {
    const d = demand[sv.key];
    served[sv.key] = d > 0 ? Math.min(1, Math.max(0, available) / d) : 1;
    available -= d * served[sv.key];
  }
  const totalDemand = SERVICES.reduce((t, sv) => t + demand[sv.key], 0);
  const cap = batteryCap(s);
  const gh = working(s, 'greenhouse');
  const tended = gh > 0 ? 0.4 + 0.6 * Math.min(1, a.farm / gh) : 0;
  const recovered = Math.min(3 * crew, working(s, 'recycler') * 5 * served.rec);
  const crewWater = 3 * crew - recovered;
  const minedWater = a.ice * 6 * served.ice;
  // Same-day mining can supply production. Reserve net crew consumption first,
  // then split the remainder between oxygen and food in life-support order.
  let productionWater = Math.max(0, s.res.water + minedWater - crewWater);
  const o2WaterDemand = working(s, 'o2gen') * 2 * served.o2;
  const o2WaterUsed = Math.min(productionWater, o2WaterDemand);
  productionWater -= o2WaterUsed;
  const greenhouseWaterDemand = gh * served.gh;
  const greenhouseWaterUsed = Math.min(productionWater, greenhouseWaterDemand);
  const o2WaterFraction = o2WaterDemand > 0 ? o2WaterUsed / o2WaterDemand : 1;
  const greenhouseWaterFraction = greenhouseWaterDemand > 0 ? greenhouseWaterUsed / greenhouseWaterDemand : 1;
  const o2Made = o2WaterUsed * 2.5 + greenhouseWaterUsed * tended;
  const waterUsed = crewWater + o2WaterUsed + greenhouseWaterUsed;
  const outdoorShare = ((a.build + a.ice + a.sci) / allowed) * 0.6;
  const indoor = 1 - 0.16 * s.modules.shield;
  const exposureFactor = (1 - outdoorShare) * indoor + outdoorShare;
  const baseDose = D.dose * exposureFactor;
  // Habitat regolith cannot shield outdoor work. Sheltering cancels outdoor
  // jobs in effectiveAllocation, then reduces the remaining indoor flare dose.
  const flareDose = s.flareToday ? D.flare * exposureFactor * (plan.shelter ? 0.15 : 1) : 0;
  return {
    crew, allowed, env, solarKwh, reactorKwh, generated, demand, served, totalDemand,
    batteryAfter: clamp(available, 0, cap), batteryCap: cap, wastedKwh: Math.max(0, available - cap),
    lifeSupportShort: SERVICES.some((sv) => sv.lifeSupport && demand[sv.key] > 0 && served[sv.key] < 0.999),
    o2WaterFraction, greenhouseWaterFraction,
    o2Net: o2Made - crew,
    waterNet: minedWater - waterUsed,
    foodNet: greenhouseWaterUsed * 2.5 * tended - crew,
    exposureFactor, dose: baseDose + flareDose, baseDose, flareDose,
    science: a.sci * 3 * served.sci,
    buildPoints: a.build * served.bld,
  };
}

export function projectedDose(s: OutpostState, f: DayForecast): number {
  const futureFlares = s.flareDays.filter((d) => d > s.day).length;
  // Hold today's effective work split constant; assume future flares are not sheltered.
  return s.dose + f.dose + (MISSION_DAYS - s.day) * f.baseDose + futureFlares * DESTINATIONS[s.dest].flare * f.exposureFactor;
}

export interface OutpostEvent {
  kind: 'flare' | 'storm' | 'night' | 'dawn' | 'meteor' | 'ice' | 'resupply';
  title: string;
  body: string;
  fact?: string;
}

/** Applies the start-of-day events for s.day and returns them for the UI. */
export function startDay(s: OutpostState): OutpostEvent[] {
  const ev: OutpostEvent[] = [];
  s.flareToday = s.flareDays.includes(s.day);
  if (s.flareToday) ev.push({ kind: 'flare', title: 'Solar flare tonight', body: 'The Sun threw out a burst of fast particles. The crew can shelter in the best shielded room, but outdoor work for the day is lost. Use the shelter switch, then compare the dose forecast.', fact: 'Space weather forecasters watch the Sun for flares. Crews on the way to the Moon would shelter in the most shielded part of their ship.' });
  if (s.storm && s.day === s.storm.start) ev.push({ kind: 'storm', title: 'Dust storm', body: `Dust fills the sky. Sunlight drops to about a quarter for ${s.storm.length} sols. The reactor and batteries have to carry you.`, fact: 'In 2018 a planet-wide Martian dust storm blocked so much sunlight that the solar-powered Opportunity rover went silent.' });
  if (s.dest === 'moon' && s.day > 1) {
    const prev = environment(s, s.day - 1).night;
    const now = environment(s).night;
    if (!prev && now) ev.push({ kind: 'night', title: 'Lunar night begins', body: 'The Sun has set over Mare Tranquillitatis. Solar arrays make nothing until sunrise, and heaters need extra power.', fact: 'These sunset and sunrise days come from NASA/JPL Horizons. A lunar night lasts about 14 Earth days because the Moon turns once every 29.5 days.' });
    if (prev && !now) ev.push({ kind: 'dawn', title: 'Sunrise', body: 'The Sun is back. Solar arrays work again and batteries can recharge.' });
  }
  if (s.meteorDays.includes(s.day)) {
    const pool = FAILABLE.filter((k) => working(s, k) > 0);
    if (pool.length) {
      const k = pool[Math.floor(nextRandom(s) * pool.length)];
      s.broken[k]++;
      s.stats.breakdowns++;
      ev.push({ kind: 'meteor', title: 'Micrometeoroid hit', body: `A fleck of space rock punched through a ${MODULES[k].name.toLowerCase()}. It is offline until a maintenance block fixes it.`, fact: 'The Moon has almost no air, so tiny rocks hit the surface at very high speed.' });
    }
  }
  if (s.day === s.iceDay) {
    s.res.water = Math.min(CAP.water, s.res.water + 30);
    ev.push({ kind: 'ice', title: 'Ice-rich soil found', body: '+30 water in the tank.', fact: 'Water ice can become drinking water, oxygen and rocket fuel, which is why mission planners hunt for it.' });
  }
  if (s.resupplyDays.includes(s.day)) ev.push({ kind: 'resupply', title: 'Supply drone landing', body: 'One drop pod with room for a single crate. Pick the one your outpost needs most.' });
  return ev;
}

export type CrateKey = 'kit' | 'pallet' | 'med';
export const CRATES: Record<CrateKey, { name: string; text: string }> = {
  kit: { name: 'Construction kit', text: '+6 build points' },
  pallet: { name: 'Supply pallet', text: '+30 food, +30 water, +20 O2' },
  med: { name: 'Spares and medkit', text: 'Fixes every machine, +20 health, +25 morale' },
};
export function openCrate(s: OutpostState, key: CrateKey): void {
  if (key === 'kit') s.buildPoints += 6;
  if (key === 'pallet') {
    s.res.food = Math.min(CAP.food, s.res.food + 30);
    s.res.water = Math.min(CAP.water, s.res.water + 30);
    s.res.o2 = Math.min(CAP.o2, s.res.o2 + 20);
  }
  if (key === 'med') {
    for (const k of FAILABLE) s.broken[k] = 0;
    for (const c of aboard(s)) { c.hp = Math.min(100, c.hp + 20); c.morale = Math.min(100, c.morale + 25); }
  }
}

export function canBuild(s: OutpostState, k: ModuleKey): boolean {
  return s.phase === 'play' && s.buildPoints >= MODULES[k].cost && s.modules[k] < MODULES[k].max;
}
export function build(s: OutpostState, k: ModuleKey): boolean {
  if (!canBuild(s, k)) return false;
  s.buildPoints -= MODULES[k].cost;
  s.modules[k]++;
  return true;
}

export interface LogLine { kind: LineKind; text: string }

/** Plain-language reason the outpost was short of power today. */
export function explainPowerShortage(s: OutpostState, f: DayForecast): string {
  const reasons: string[] = [];
  if (f.env.night) reasons.push('it is lunar night, so the solar arrays made nothing (sunset date from NASA/JPL Horizons)');
  else if (f.env.storm) reasons.push('a dust storm cut the sunlight to about a quarter');
  const brokenPower = s.broken.solar + s.broken.reactor;
  if (brokenPower > 0) reasons.push(`${brokenPower} power machine${brokenPower > 1 ? 's were' : ' was'} broken`);
  if (working(s, 'reactor') === 0 && (f.env.night || f.env.storm)) reasons.push('there is no working reactor for when the Sun is gone');
  if (f.batteryAfter <= 0.01) reasons.push('the battery was empty');
  if (reasons.length === 0) reasons.push(`the outpost wanted ${f.totalDemand.toFixed(0)} kWh but made only ${f.generated.toFixed(0)}`);
  return reasons.join(', and ');
}

/** Plain-language reason a supply ran out, following the chain back to its cause. */
export function explainShortage(s: OutpostState, f: DayForecast, a: EffectiveAllocation, kind: 'o2' | 'water' | 'food'): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (kind === 'o2') {
    if (working(s, 'o2gen') === 0) return s.modules.o2gen > 0 ? 'the oxygen generator is broken (a maintenance block fixes it)' : 'there is no oxygen generator';
    if (f.served.o2 < 0.999) return `the oxygen generator got only ${pct(f.served.o2)} of its power, because ${explainPowerShortage(s, f)}`;
    if (f.o2WaterFraction < 0.999) return 'not enough water remained for the oxygen generator after reserving crew needs. Mine ice or improve recycling';
    return 'the crew breathes more than the outpost makes. Add an oxygen generator or a greenhouse';
  }
  if (kind === 'water') {
    if (working(s, 'recycler') === 0) return s.modules.recycler > 0 ? 'the water recycler is broken (a maintenance block fixes it)' : 'there is no water recycler';
    if (f.served.rec < 0.999) return `the water recycler got only ${pct(f.served.rec)} of its power, because ${explainPowerShortage(s, f)}`;
    if (a.ice === 0) return 'nobody mined ice, and recycling alone cannot cover everything the crew and machines use';
    return 'the outpost uses more water than recycling and ice mining bring in. Add a recycler or more ice mining';
  }
  const gh = working(s, 'greenhouse');
  if (gh === 0) return s.modules.greenhouse > 0 ? 'the greenhouse is broken (a maintenance block fixes it)' : 'there is no greenhouse, so the crew is eating the stored food';
  if (f.served.gh < 0.999) return `the greenhouses got only ${pct(f.served.gh)} of their power, because ${explainPowerShortage(s, f)}`;
  if (f.greenhouseWaterFraction < 0.999) return 'not enough water remained for the greenhouses after supplying the crew and oxygen generator. Mine ice or improve recycling';
  if (a.farm < gh) return 'the greenhouses were not fully tended. Each one needs 1 farming block a day';
  return 'four astronauts eat more than the greenhouses grow. Build another greenhouse';
}

/** Runs the day with the plan, applies every effect and advances to the next day. */
export function endDay(s: OutpostState, plan: Plan): LogLine[] {
  const lines: LogLine[] = [];
  const note = (kind: LineKind, text: string) => lines.push({ kind, text });
  const f = forecastDay(s, plan);
  const a = effectiveAllocation(s, plan);
  const shelter = s.flareToday && plan.shelter;
  const why = (cause: string) => {
    note('info', `Why: ${cause}.`);
    s.causes[cause] = (s.causes[cause] ?? 0) + 1;
  };

  s.res.battery = f.batteryAfter;
  s.stats.wastedKwh += f.wastedKwh;
  if (f.lifeSupportShort) {
    s.stats.brownouts++;
    note('bad', 'Power ran short. Life support got power first.');
    why(explainPowerShortage(s, f));
  }
  else if (SERVICES.some((sv) => !sv.lifeSupport && f.demand[sv.key] > 0 && f.served[sv.key] < 0.999)) note('warn', 'Not enough power for every job. Outdoor work slowed down.');
  if (f.o2WaterFraction < 0.999 || f.greenhouseWaterFraction < 0.999) {
    note('warn', 'Water rationing reduced machine production. Crew water comes first, then oxygen generators, then greenhouses.');
  }

  const lack = { o2: s.res.o2 + f.o2Net < 0, water: s.res.water + f.waterNet < 0, food: s.res.food + f.foodNet < 0 };
  s.res.o2 = clamp(s.res.o2 + f.o2Net, 0, CAP.o2);
  s.res.water = clamp(s.res.water + f.waterNet, 0, CAP.water);
  s.res.food = clamp(s.res.food + f.foodNet, 0, CAP.food);
  if (lack.o2) { s.stats.noOxygen++; note('bad', 'Oxygen ran out.'); why(explainShortage(s, f, a, 'o2')); }
  if (lack.water) { s.stats.noWater++; note('bad', 'The water tank is empty.'); why(explainShortage(s, f, a, 'water')); }
  if (lack.food) { s.stats.noFood++; note('warn', 'Food ran out.'); why(explainShortage(s, f, a, 'food')); }

  if (f.science > 0) { s.science += f.science; note('good', `+${f.science.toFixed(1)} science samples.`); }
  s.buildPoints += f.buildPoints;
  s.dose += f.dose;
  if (s.flareToday) {
    if (shelter) { s.stats.flaresSheltered++; note('good', `Crew sheltered. Flare dose ${f.flareDose.toFixed(1)} mSv each.`); }
    else { s.stats.flaresHit++; note('bad', `Crew took the flare outside shelter. Flare dose ${f.flareDose.toFixed(1)} mSv each.`); }
  }

  let maint = a.maint;
  const repairs = Math.min(maint, brokenTotal(s));
  if (repairs > 0) {
    let left = repairs;
    for (const k of FAILABLE) while (left > 0 && s.broken[k] > 0) { s.broken[k]--; left--; s.stats.repaired++; }
    note('good', `Repaired ${repairs} machine${repairs > 1 ? 's' : ''}.`);
  }
  maint -= repairs;
  const risk = 0.014 * (s.difficulty === 'cadet' ? 0.5 : 1) * Math.max(0.15, 1 - 0.28 * maint);
  for (const k of FAILABLE) {
    const n = working(s, k);
    for (let i = 0; i < n; i++) if (nextRandom(s) < risk) { s.broken[k]++; s.stats.breakdowns++; note('warn', `A ${MODULES[k].name.toLowerCase()} broke down.`); }
  }

  const crew = aboard(s);
  const restPerPerson = a.rest / Math.max(1, crew.length);
  const overLimit = s.dose > DOSE_LIMIT;
  const cold = f.served.hab < 0.999;
  for (const c of crew) {
    let hp = c.hp;
    let mo = c.morale;
    if (lack.o2) hp -= 22;
    if (lack.water) hp -= 12;
    if (lack.food) hp -= 7;
    if (overLimit) hp -= 4;
    if (cold) hp -= 3;
    if (!lack.o2 && !lack.water && !lack.food && !overLimit && !cold) hp += Math.min(4, 1 + a.rest);
    mo += restPerPerson * 8 - 3;
    mo -= (Number(lack.o2) + Number(lack.water) + Number(lack.food)) * 5;
    if (cold) mo -= 8;
    if (s.flareToday && !shelter) mo -= 4;
    if (overLimit) mo -= 3;
    if (a.sci > 0 && f.served.sci > 0.9) mo += 1;
    c.hp = clamp(hp, 0, 100);
    c.morale = clamp(mo, 0, 100);
    if (c.hp <= 0) { c.aboard = false; s.stats.evacuations++; note('bad', `${c.name} needed a medical evacuation and flew home.`); }
  }
  const left = aboard(s);
  if (left.length && left.reduce((t, c) => t + c.morale, 0) / left.length < 40) s.stats.lowMoraleDays++;
  s.dailySurvivalScore += getOutpostDailySurvivalScore(left.length);

  if (left.length <= 2) { s.phase = 'over'; s.result = 'aborted'; }
  else if (s.day >= MISSION_DAYS) { s.phase = 'over'; s.result = 'complete'; }
  else s.day++;
  return lines;
}

/** The shortage cause that happened most often, with how many days it hit. */
export function mainCause(s: OutpostState): { cause: string; days: number } | null {
  let best: { cause: string; days: number } | null = null;
  for (const [cause, days] of Object.entries(s.causes)) if (!best || days > best.days) best = { cause, days };
  return best;
}

export interface Report {
  crewSafe: boolean; scienceMet: boolean; doseOk: boolean;
  stars: number; score: number; rank: string;
  baseScore: number;
  dailySurvivalScore: number;
  performanceBonus: number;
  difficultyMultiplier: number;
}

export function getOutpostDailySurvivalScore(survivingCrewCount: number): number {
  if (!Number.isInteger(survivingCrewCount) || survivingCrewCount < 0 || survivingCrewCount > 4) {
    throw new RangeError('Surviving crew count must be an integer from 0 to 4.');
  }
  return survivingCrewCount >= 3 ? OUTPOST_DAILY_SURVIVAL_SCORE : 0;
}

export function getOutpostCompletionPerformanceScore(s: OutpostState): number {
  const healthyCrew = s.result === 'complete'
    && s.crew.length === 4
    && s.crew.every((crew) => crew.aboard && crew.hp >= OUTPOST_HEALTHY_CREW_THRESHOLD);
  if (!healthyCrew) return 0;
  const healthScore = s.crew.reduce((total, crew) => total + crew.hp * OUTPOST_HEALTH_SCORE_PER_PERCENT, 0);
  return OUTPOST_COMPLETION_PERFORMANCE_BONUS + healthScore;
}

export function getOutpostScoreMultiplier(difficulty: Difficulty): number {
  return difficulty === 'commander' ? OUTPOST_COMMANDER_SCORE_MULTIPLIER : 1;
}

export function finalReport(s: OutpostState): Report {
  const complete = s.result === 'complete';
  const crewSafe = complete && s.stats.evacuations === 0;
  const scienceMet = complete && s.science >= SCIENCE_GOAL;
  // Like the other two objectives, the dose star only counts on a completed mission.
  const doseOk = complete && s.dose <= DOSE_LIMIT;
  const stars = Number(crewSafe) + Number(scienceMet) + Number(doseOk);
  const baseScore = s.result === null
    ? 0
    : Math.round(s.science * 10 + aboard(s).length * 150 + Math.max(0, DOSE_LIMIT - s.dose) * 8 + stars * 100 + (complete ? 200 : 0));
  const performanceBonus = getOutpostCompletionPerformanceScore(s);
  const difficultyMultiplier = getOutpostScoreMultiplier(s.difficulty);
  const score = Math.round((baseScore + s.dailySurvivalScore + performanceBonus) * difficultyMultiplier);
  const rank = complete ? ['Cadet in training', 'Mission specialist', 'Flight engineer', 'Commander'][stars] : 'Mission aborted';
  return { crewSafe, scienceMet, doseOk, stars, score, rank, baseScore, dailySurvivalScore: s.dailySurvivalScore, performanceBonus, difficultyMultiplier };
}

export function lessons(s: OutpostState): Array<{ title: string; body: string }> {
  const st = s.stats;
  const out: Array<{ title: string; body: string }> = [];
  if (st.brownouts > 0) out.push({ title: `Power ran short on ${st.brownouts} day${st.brownouts > 1 ? 's' : ''}`, body: s.dest === 'moon' ? 'Horizons shows the Sun gone for about 14 days at this site. Solar alone cannot carry a lunar night; real plans add batteries, fission power, or polar sites with long sunlight.' : 'Mars gets well under half the sunlight the Moon does, and dust storms cut it further. Engineers pair solar with batteries or fission power and keep life support first in line.' });
  if (st.noWater || st.noFood || st.noOxygen) out.push({ title: 'Supplies ran out', body: 'Every kilogram launched is expensive, so outposts recycle water, mine ice and grow food instead of waiting for deliveries.' });
  if (s.dose > DOSE_LIMIT) out.push({ title: 'The crew went over the radiation limit', body: 'This game uses about 1.37 mSv a day on the Moon and 0.64 mSv a day on Mars, inspired by lander and rover measurements. With no thick air or magnetic field overhead, a few metres of soil piled on a habitat is one of the best shields.' });
  else if (s.modules.shield >= 2) out.push({ title: 'Shielding paid off', body: 'Soil is heavy to launch but free to dig up, so covering habitats with regolith is a leading idea for long stays.' });
  if (st.flaresSheltered > 0) out.push({ title: 'Sheltering through a flare', body: 'You stopped outdoor work and cut the remaining indoor flare dose by 85%. Real crews make shelter decisions using space weather forecasts.' });
  if (st.breakdowns >= 4) out.push({ title: `${st.breakdowns} machines broke down`, body: 'Spare parts and maintenance time are part of every mission plan. There is no shop next door.' });
  if (st.lowMoraleDays > 2) out.push({ title: 'Morale ran low', body: 'Rest and exercise are part of the job. Tired crews make mistakes, so long missions schedule downtime.' });
  if (out.length === 0) out.push({ title: 'A balanced outpost', body: 'You kept power, air, water, food and radiation in check together. That balancing act is what mission planners do every day.' });
  return out.slice(0, 4);
}
