import { describe, expect, test } from 'bun:test';
import { HORIZONS_SNAPSHOT } from '../../data/nasa/horizonsSnapshot.ts';
import {
  CAP,
  DESTINATIONS,
  DOSE_LIMIT,
  MISSION_DAYS,
  MODULES,
  PANEL_KWH,
  REACTOR_KWH,
  allowedBlocks,
  build,
  canBuild,
  effectiveAllocation,
  endDay,
  environment,
  finalReport,
  fitPlan,
  forecastDay,
  newOutpost,
  nextLightChange,
  openCrate,
  startDay,
  type Destination,
  type Difficulty,
  type ModuleKey,
  type OutpostState,
  type Plan,
} from '../outpostLogic.ts';

const basePlan = (): Plan => ({ alloc: { maint: 1, build: 3, farm: 0, ice: 1, sci: 1 }, shelter: false });

/**
 * A sensible player: works down a priority list and saves up for the first item
 * it can't afford yet (instead of spending on cheaper things), shelters from flares.
 */
function playSensibly(s: OutpostState, plan: Plan): void {
  const wishList: Array<[ModuleKey, number]> = [
    ['greenhouse', 1],
    ['reactor', 2],
    ['recycler', 2],
    ['greenhouse', 2],
    ['battery', 3],
    ['shield', s.dest === 'moon' ? 4 : 3],
    ['solar', s.dest === 'mars' ? 10 : 7],
  ];
  for (const [k, n] of wishList) {
    let stuck = false;
    while (s.modules[k] < n) if (!build(s, k)) { stuck = true; break; }
    if (stuck) break;
  }
  const broken = Object.values(s.broken).reduce((a, b) => a + b, 0);
  plan.alloc = { maint: Math.max(1, Math.min(2, broken)), build: 2, farm: s.modules.greenhouse, ice: s.res.water < 40 ? 2 : 1, sci: s.science < s.day * 1.4 ? 2 : 1 };
  plan.shelter = s.flareToday;
  fitPlan(s, plan);
}

function playOut(dest: Destination, difficulty: Difficulty, seed: number, smart: boolean) {
  const s = newOutpost(dest, difficulty, seed);
  const plan = basePlan();
  while (s.phase === 'play') {
    const events = startDay(s);
    if (events.some((e) => e.kind === 'resupply')) openCrate(s, smart ? 'kit' : 'pallet');
    if (smart) playSensibly(s, plan);
    else fitPlan(s, plan);
    endDay(s, plan);
  }
  return { s, report: finalReport(s) };
}

describe('NASA/JPL Horizons snapshot', () => {
  test('has one sunlight value per mission day for both sites, all in [0, 1]', () => {
    for (const site of [HORIZONS_SNAPSHOT.moon, HORIZONS_SNAPSHOT.mars]) {
      expect(site.sunlight.length).toBe(MISSION_DAYS);
      for (const v of site.sunlight) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('records its source and the body constants Horizons reported', () => {
    expect(HORIZONS_SNAPSHOT.source).toContain('ssd.jpl.nasa.gov/horizons');
    expect(HORIZONS_SNAPSHOT.apiEndpoint).toBe('https://ssd.jpl.nasa.gov/api/horizons.api');
    expect(HORIZONS_SNAPSHOT.apiDocumentation).toBe('https://ssd-api.jpl.nasa.gov/doc/horizons.html');
    expect(HORIZONS_SNAPSHOT.moon.solarConstantWm2.mean).toBeGreaterThan(1300);
    expect(HORIZONS_SNAPSHOT.mars.solarConstantWm2.mean).toBeLessThan(700);
    expect(HORIZONS_SNAPSHOT.mars.meanSolarDaySeconds).toBeGreaterThan(88000);
    expect(HORIZONS_SNAPSHOT.moon.meanSolarDaySeconds / 86400).toBeCloseTo(29.53, 1);
  });

  test('records the actual Horizons target, epoch, center, frame, units and request URLs', () => {
    const bodyQueries = [
      [HORIZONS_SNAPSHOT.queries.bodyData.moon, '301'],
      [HORIZONS_SNAPSHOT.queries.bodyData.mars, '499'],
    ] as const;
    for (const [record, target] of bodyQueries) {
      const url = new URL(record.query);
      expect(url.origin + url.pathname).toBe(HORIZONS_SNAPSHOT.apiEndpoint);
      expect(url.searchParams.get('COMMAND')).toBe(`'${target}'`);
      expect(url.searchParams.get('OBJ_DATA')).toBe("'YES'");
      expect(url.searchParams.get('MAKE_EPHEM')).toBe("'NO'");
      expect(record.target).toContain(target);
      expect(record.epoch).toBeNull();
      expect(record.center).toBeNull();
      expect(record.referenceFrame).toBeNull();
      expect(record.units).toContain('W/m^2');
    }

    const siteQueries = [
      [HORIZONS_SNAPSHOT.queries.moonSunriseSearch, 'coord@301'],
      [HORIZONS_SNAPSHOT.queries.moonSunlight, 'coord@301'],
      [HORIZONS_SNAPSHOT.queries.marsSunlight, 'coord@499'],
    ] as const;
    for (const [record, center] of siteQueries) {
      const url = new URL(record.query);
      expect(url.origin + url.pathname).toBe(HORIZONS_SNAPSHOT.apiEndpoint);
      expect(record.target).toBe('10 (Sun)');
      expect(record.center).toBe(center);
      expect(record.referenceFrame).toContain('ICRF');
      expect(record.referenceFrame).toContain('local-horizon');
      expect(record.units).toContain('degrees');
      expect(record.epoch).not.toBeNull();
      if (!record.epoch) throw new Error('Site ephemeris provenance must include an epoch.');
      expect(url.searchParams.get('COMMAND')).toBe("'10'");
      expect(url.searchParams.get('EPHEM_TYPE')).toBe("'OBSERVER'");
      expect(url.searchParams.get('CENTER')).toBe(`'${center}'`);
      expect(url.searchParams.get('TIME_TYPE')).toBe("'UT'");
      expect(url.searchParams.get('REF_SYSTEM')).toBe("'ICRF'");
      expect(url.searchParams.get('QUANTITIES')).toBe("'4'");
      expect(url.searchParams.get('START_TIME')).toBe(`'${record.epoch.start}'`);
      expect(url.searchParams.get('STOP_TIME')).toBe(`'${record.epoch.stop}'`);
      expect(url.searchParams.get('STEP_SIZE')).toBe(`'${record.epoch.step}'`);
    }

    const sunriseSearchUrl = new URL(HORIZONS_SNAPSHOT.queries.moonSunriseSearch.query);
    expect(sunriseSearchUrl.searchParams.get('START_TIME')).toBe("'2027-01-01'");
    expect(sunriseSearchUrl.searchParams.get('STOP_TIME')).toBe("'2027-02-15'");
  });

  test('the Moon site has a long night inside the mission and a sunrise before the end', () => {
    const dark = HORIZONS_SNAPSHOT.moon.sunlight.filter((v) => v === 0).length;
    expect(dark).toBeGreaterThanOrEqual(12);
    expect(dark).toBeLessThanOrEqual(16);
    expect(HORIZONS_SNAPSHOT.moon.sunlight[0]).toBe(1);
    expect(HORIZONS_SNAPSHOT.moon.sunlight[MISSION_DAYS - 1]).toBe(1);
  });

  test('Mars gets far less sunlight per sol than a lunar day, but never zero', () => {
    for (const v of HORIZONS_SNAPSHOT.mars.sunlight) {
      expect(v).toBeGreaterThan(0.1);
      expect(v).toBeLessThan(0.5);
    }
  });
});

describe('environment and power', () => {
  test('solar output follows the Horizons sunlight; reactors ignore it', () => {
    const s = newOutpost('moon', 'commander', 1);
    const day = forecastDay(s, basePlan());
    expect(day.solarKwh).toBeCloseTo(s.modules.solar * PANEL_KWH * HORIZONS_SNAPSHOT.moon.sunlight[0], 6);
    const nightDay = HORIZONS_SNAPSHOT.moon.sunlight.indexOf(0) + 1;
    s.day = nightDay;
    s.modules.reactor = 1;
    const night = forecastDay(s, basePlan());
    expect(environment(s).night).toBe(true);
    expect(night.solarKwh).toBe(0);
    expect(night.reactorKwh).toBe(REACTOR_KWH);
    expect(night.demand.hab).toBeGreaterThan(day.demand.hab);
  });

  test('dust storms cut Mars sunlight', () => {
    const s = newOutpost('mars', 'commander', 3);
    const storm = s.storm!;
    const clear = environment(s, storm.start - 1).sunlight;
    const dusty = environment(s, storm.start).sunlight;
    expect(dusty).toBeLessThan(clear * 0.5);
  });

  test('nextLightChange reports the Horizons sunset on the Moon', () => {
    const s = newOutpost('moon', 'cadet', 1);
    const change = nextLightChange(s)!;
    expect(change.kind).toBe('sunset');
    expect(HORIZONS_SNAPSHOT.moon.sunlight[s.day - 1 + change.inDays]).toBeLessThan(0.05);
    expect(nextLightChange(newOutpost('mars', 'cadet', 1))).toBeNull();
  });

  test('life support is powered before outdoor jobs', () => {
    const s = newOutpost('moon', 'commander', 1);
    s.day = HORIZONS_SNAPSHOT.moon.sunlight.indexOf(0) + 1;
    const f0 = forecastDay(s, { alloc: { maint: 0, build: 2, farm: 0, ice: 3, sci: 3 }, shelter: false });
    // Enough stored power for the habitat plus half the oxygen generator, nothing more.
    s.res.battery = f0.demand.hab + f0.demand.o2 / 2;
    const f = forecastDay(s, { alloc: { maint: 0, build: 2, farm: 0, ice: 3, sci: 3 }, shelter: false });
    expect(f.served.hab).toBe(1);
    expect(f.served.sci).toBeLessThan(1);
    expect(f.lifeSupportShort).toBe(true);
  });

  test('the battery never goes below zero or above capacity', () => {
    for (const seed of [1, 2, 3]) {
      const { s } = playOut('moon', 'commander', seed, false);
      expect(s.res.battery).toBeGreaterThanOrEqual(0);
      expect(s.res.battery).toBeLessThanOrEqual(60 + 40 * s.modules.battery);
    }
  });
});

describe('crew schedule', () => {
  test('two work blocks per crew member, minus blocks for low morale', () => {
    const s = newOutpost('moon', 'cadet', 1);
    expect(allowedBlocks(s)).toBe(8);
    s.crew.forEach((c) => (c.morale = 30));
    expect(allowedBlocks(s)).toBe(7);
    s.crew.forEach((c) => (c.morale = 10));
    expect(allowedBlocks(s)).toBe(6);
  });

  test('unassigned blocks become rest, and fitPlan trims an oversized plan', () => {
    const s = newOutpost('moon', 'cadet', 1);
    const plan: Plan = { alloc: { maint: 1, build: 1, farm: 0, ice: 0, sci: 0 }, shelter: false };
    expect(effectiveAllocation(s, plan).rest).toBe(6);
    const big: Plan = { alloc: { maint: 3, build: 3, farm: 3, ice: 3, sci: 3 }, shelter: false };
    fitPlan(s, big);
    expect(Object.values(big.alloc).reduce((a, b) => a + b, 0)).toBe(8);
  });

  test('sheltering moves outdoor blocks to rest and cuts the flare dose by 85%', () => {
    const s = newOutpost('moon', 'commander', 1);
    s.flareToday = true;
    const out = forecastDay(s, { ...basePlan(), shelter: false });
    const shel = forecastDay(s, { ...basePlan(), shelter: true });
    expect(shel.science).toBe(0);
    expect(shel.buildPoints).toBe(0);
    expect(shel.flareDose).toBeCloseTo(out.flareDose * 0.15, 6);
  });

  test('shielding lowers the indoor dose, and outdoor work bypasses it', () => {
    const s = newOutpost('moon', 'commander', 1);
    const indoorPlan: Plan = { alloc: { maint: 2, build: 0, farm: 0, ice: 0, sci: 0 }, shelter: false };
    const outdoorPlan: Plan = { alloc: { maint: 0, build: 4, farm: 0, ice: 2, sci: 2 }, shelter: false };
    // No shield yet: inside and outside get the full measured surface dose.
    expect(forecastDay(s, indoorPlan).dose).toBeCloseTo(DESTINATIONS.moon.dose, 6);
    expect(forecastDay(s, outdoorPlan).dose).toBeCloseTo(DESTINATIONS.moon.dose, 6);
    s.modules.shield = 3;
    const inside = forecastDay(s, indoorPlan).dose;
    expect(inside).toBeCloseTo(DESTINATIONS.moon.dose * 0.52, 6);
    expect(forecastDay(s, outdoorPlan).dose).toBeGreaterThan(inside);
  });
});

describe('building and supplies', () => {
  test('building spends points and respects the module cap', () => {
    const s = newOutpost('moon', 'cadet', 1);
    s.buildPoints = 100;
    for (let i = 0; i < 10; i++) build(s, 'shield');
    expect(s.modules.shield).toBe(MODULES.shield.max);
    expect(canBuild(s, 'shield')).toBe(false);
    expect(s.buildPoints).toBe(100 - MODULES.shield.cost * MODULES.shield.max);
  });

  test('crates apply their effects and respect storage caps', () => {
    const s = newOutpost('moon', 'cadet', 1);
    s.res.food = CAP.food - 5;
    openCrate(s, 'pallet');
    expect(s.res.food).toBe(CAP.food);
    s.broken.solar = 2;
    openCrate(s, 'med');
    expect(s.broken.solar).toBe(0);
  });

  test('stocks stay within [0, cap] for a whole neglected mission', () => {
    const { s } = playOut('mars', 'commander', 9, false);
    expect(s.res.o2).toBeGreaterThanOrEqual(0);
    expect(s.res.o2).toBeLessThanOrEqual(CAP.o2);
    expect(s.res.water).toBeLessThanOrEqual(CAP.water);
    expect(s.res.food).toBeGreaterThanOrEqual(0);
  });
});

describe('determinism and endings', () => {
  test('the same seed and choices replay exactly', () => {
    const a = playOut('mars', 'commander', 42, true).s;
    const b = playOut('mars', 'commander', 42, true).s;
    expect(a.science).toBe(b.science);
    expect(a.dose).toBe(b.dose);
    expect(a.stats).toEqual(b.stats);
  });

  test('a mission ends after 30 days or when only two crew remain', () => {
    const { s } = playOut('moon', 'cadet', 5, true);
    expect(s.phase).toBe('over');
    if (s.result === 'complete') expect(s.day).toBe(MISSION_DAYS);
    else expect(s.crew.filter((c) => c.aboard).length).toBeLessThanOrEqual(2);
  });

  test('stars match the three objectives', () => {
    const { s, report } = playOut('moon', 'cadet', 7, true);
    expect(report.stars).toBe(Number(report.crewSafe) + Number(report.scienceMet) + Number(report.doseOk));
    expect(report.doseOk).toBe(s.dose <= DOSE_LIMIT);
  });
});

describe('balance', () => {
  const rate = (dest: Destination, diff: Difficulty, smart: boolean) => {
    let complete = 0;
    for (let seed = 1; seed <= 40; seed++) if (playOut(dest, diff, seed * 7919, smart).s.result === 'complete') complete++;
    return complete / 40;
  };

  test('a sensible player usually completes both missions', () => {
    for (const dest of ['moon', 'mars'] as const) {
      for (const diff of ['cadet', 'commander'] as const) expect(rate(dest, diff, true)).toBeGreaterThanOrEqual(0.75);
    }
  });

  test('ignoring the outpost on the Moon usually fails, so the choices matter', () => {
    expect(rate('moon', 'commander', false)).toBeLessThanOrEqual(0.35);
  });
});
