/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { HORIZONS_SNAPSHOT } from '../data/nasa/horizonsSnapshot.ts';
import { claimResearchReward } from '../game/researchBank.ts';
import { OutpostScene } from './OutpostScene.tsx';
import {
  CAP,
  CRATES,
  DESTINATIONS,
  DOSE_LIMIT,
  JOBS,
  MISSION_DAYS,
  MODULES,
  SCIENCE_GOAL,
  SERVICES,
  aboard,
  allowedBlocks,
  brokenTotal,
  build,
  canBuild,
  effectiveAllocation,
  endDay,
  environment,
  finalReport,
  fitPlan,
  forecastDay,
  getOutpostResearchReward,
  horizonsSunlight,
  lessons,
  mainCause,
  newOutpost,
  nextLightChange,
  openCrate,
  displayedResourceNet,
  projectedDose,
  startDay,
  usedBlocks,
  type CrateKey,
  type Destination,
  type Difficulty,
  type JobKey,
  type LineKind,
  type ModuleKey,
  type OutpostEvent,
  type OutpostResearchReward,
  type OutpostState,
  type Plan,
  type ServiceKey,
} from '../game/outpostLogic.ts';

const C = {
  bg: '#050508', panel: '#0d111a', line: '#2A3B5C', muted: '#A0AEC0',
  cyan: '#00F0FF', amber: '#FFB000', green: '#00FF66', red: '#FF3344',
  water: '#4D7CFF', rad: '#C084FC',
};
const JOB_COLOR: Record<JobKey, string> = { maint: '#F2A65A', build: C.amber, farm: C.green, ice: C.water, sci: C.rad };
const REST_COLOR = '#94A3B8';
const SERVICE_COLOR: Record<ServiceKey, string> = { hab: '#FF7A5C', o2: C.cyan, rec: C.water, gh: C.green, ice: '#9FB4FF', sci: C.rad, bld: C.amber };
const KIND_COLOR: Record<LineKind, string> = { good: C.green, warn: C.amber, bad: C.red, info: C.cyan };

interface LogEntry { day: number; kind: LineKind; text: string }

interface Props {
  researchBalance: number;
  highScore: number;
  onMissionStart: () => void;
  onMissionComplete: (reward: OutpostResearchReward) => void;
  onScoreUpdate: (score: number) => void;
  onFinalizeScore: (score: number) => boolean;
  onExit: () => void;
}

export const OutpostMode: React.FC<Props> = ({
  researchBalance,
  highScore,
  onMissionStart,
  onMissionComplete,
  onScoreUpdate,
  onFinalizeScore,
  onExit,
}) => {
  const stateRef = useRef<OutpostState | null>(null);
  const missionRewardEventsRef = useRef(new Set<string>());
  const scoreFinalizedRef = useRef(false);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);
  const [newHighScore, setNewHighScore] = useState(false);
  const [plan, setPlan] = useState<Plan>({ alloc: { maint: 1, build: 3, farm: 0, ice: 1, sci: 1 }, shelter: false });
  const [tab, setTab] = useState<'schedule' | 'build'>('schedule');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [queue, setQueue] = useState<OutpostEvent[]>([]);
  const [setup, setSetup] = useState<{ dest: Destination; diff: Difficulty }>({ dest: 'moon', diff: 'cadet' });
  const s = stateRef.current;

  // Newest day first, but each day's lines stay in the order they happened ("Why:" follows its problem).
  const addLog = (entries: LogEntry[]) => setLog((l) => [...entries, ...l].slice(0, 80));

  const finalizeScore = (score: number) => {
    if (scoreFinalizedRef.current) return;
    scoreFinalizedRef.current = true;
    setNewHighScore(onFinalizeScore(score));
  };

  const beginDay = (st: OutpostState, p: Plan) => {
    const events = startDay(st);
    const next = { ...p, alloc: { ...p.alloc }, shelter: false };
    fitPlan(st, next);
    setPlan(next);
    if (events.length) addLog(events.map((e) => ({ day: st.day, kind: e.kind === 'ice' || e.kind === 'dawn' ? 'good' : 'warn', text: e.title })));
    setQueue(events);
    rerender();
  };

  const start = () => {
    const st = newOutpost(setup.dest, setup.diff, Math.floor(Math.random() * 1e9));
    missionRewardEventsRef.current.clear();
    scoreFinalizedRef.current = false;
    setNewHighScore(false);
    onScoreUpdate(0);
    onMissionStart();
    stateRef.current = st;
    setLog([{ day: 1, kind: 'info', text: `Landed at ${DESTINATIONS[st.dest].site}. Crew of 4 ready.` }]);
    setTab('schedule');
    beginDay(st, { alloc: { maint: 1, build: 3, farm: 0, ice: 1, sci: 1 }, shelter: false });
  };

  const runDay = () => {
    if (!s || s.phase !== 'play' || queue.length) return;
    const day = s.day;
    const lines = endDay(s, plan);
    const report = finalReport(s);
    onScoreUpdate(report.score);
    addLog(lines.map((l) => ({ day, ...l })));
    if (s.phase === 'play') beginDay(s, plan);
    else {
      if (s.result === 'complete' && claimResearchReward(missionRewardEventsRef.current, 'outpost-completion')) {
        onMissionComplete(getOutpostResearchReward(s.dest, s.difficulty, s.result));
      }
      finalizeScore(report.score);
      rerender();
    }
  };

  const changeJob = (k: JobKey, d: number) => {
    if (!s) return;
    const next = { ...plan, alloc: { ...plan.alloc } };
    if (d > 0 && usedBlocks(next.alloc) >= allowedBlocks(s)) return;
    if (d < 0 && next.alloc[k] <= 0) return;
    next.alloc[k] += d;
    setPlan(next);
  };

  const doBuild = (k: ModuleKey) => {
    if (s && build(s, k)) { addLog([{ day: s.day, kind: 'good', text: `Built: ${MODULES[k].name.toLowerCase()}.` }]); rerender(); }
  };

  const dismissEvent = (crate?: CrateKey) => {
    if (s && crate) { openCrate(s, crate); addLog([{ day: s.day, kind: 'good', text: `Drone crate opened: ${CRATES[crate].name}.` }]); }
    setQueue((q) => q.slice(1));
  };

  const exit = () => {
    if (s && !scoreFinalizedRef.current) finalizeScore(finalReport(s).score);
    onExit();
  };

  if (!s) return <SetupScreen setup={setup} setSetup={setSetup} onStart={start} onExit={exit} />;

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto font-telemetry text-[13px] leading-snug" style={{ background: C.bg, color: '#fff' }}>
      <Game s={s} plan={plan} setPlan={setPlan} tab={tab} setTab={setTab} log={log} highScore={highScore} onRun={runDay} onJob={changeJob} onBuild={doBuild} onExit={exit} />
      {queue.length > 0 && <EventModal ev={queue[0]} onDone={dismissEvent} />}
      {s.phase === 'over' && (
        <Debrief
          s={s}
          researchBalance={researchBalance}
          highScore={highScore}
          newHighScore={newHighScore}
          onAgain={() => { stateRef.current = null; setQueue([]); rerender(); }}
          onExit={exit}
        />
      )}
    </div>
  );
};

/* ---------------- Setup ---------------- */

const SetupScreen: React.FC<{
  setup: { dest: Destination; diff: Difficulty };
  setSetup: (v: { dest: Destination; diff: Difficulty }) => void;
  onStart: () => void;
  onExit: () => void;
}> = ({ setup, setSetup, onStart, onExit }) => {
  const card = (active: boolean) => `text-left p-3 border-2 cursor-pointer ${active ? 'border-[#00F0FF] bg-[#00F0FF]/10' : 'border-[#2A3B5C] bg-[#050508] hover:border-[#00F0FF]'}`;
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto flex items-start md:items-center justify-center p-4" style={{ background: 'rgba(5,5,8,0.96)' }}>
      <div className="retro-window w-full max-w-3xl p-5 md:p-6 space-y-4">
        <div className="font-pixel text-[9px] text-[#FFB000]">▶ OUTPOST OPS // BASE COMMANDER TRAINING</div>
        <h1 className="font-pixel text-lg md:text-2xl tracking-wider leading-relaxed">RUN A MOON OR MARS OUTPOST</h1>
        <p className="font-telemetry text-sm text-[#A0AEC0] max-w-prose">
          Keep 4 astronauts alive for 30 days. Balance power, oxygen, water, food and radiation shielding.
          Day and night at your site come from real NASA/JPL Horizons data.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(['moon', 'mars'] as const).map((d) => (
            <button key={d} className={card(setup.dest === d)} onClick={() => setSetup({ ...setup, dest: d })} aria-pressed={setup.dest === d}>
              <div className="font-pixel text-[12px] mb-2" style={{ color: d === 'moon' ? C.cyan : C.amber }}>{d === 'moon' ? 'THE MOON' : 'MARS'}</div>
              <div className="font-telemetry text-xs text-[#A0AEC0]">
                {d === 'moon'
                  ? `${HORIZONS_SNAPSHOT.moon.site}. Full sun, then a ${HORIZONS_SNAPSHOT.moon.sunlight.filter((v) => v === 0).length}-day lunar night. Radiation scenario: 1.37 mSv per game day (unverified input).`
                  : `${HORIZONS_SNAPSHOT.mars.site}. About ${Math.round((HORIZONS_SNAPSHOT.mars.solarConstantWm2.mean / HORIZONS_SNAPSHOT.moon.solarConstantWm2.mean) * 100)}% of the Moon's sunlight, plus a dust storm. Radiation scenario: 0.64 mSv per sol (unverified input).`}
              </div>
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(['cadet', 'commander'] as const).map((d) => (
            <button key={d} className={card(setup.diff === d)} onClick={() => setSetup({ ...setup, diff: d })} aria-pressed={setup.diff === d}>
              <div className="font-pixel text-[11px] mb-2">{d === 'cadet' ? 'CADET' : 'COMMANDER'}</div>
              <div className="font-telemetry text-xs text-[#A0AEC0]">{d === 'cadet' ? 'More supplies, fewer flares and breakdowns.' : 'Lean supplies, more flares and breakdowns.'}</div>
            </button>
          ))}
        </div>
        <ol className="font-telemetry text-xs text-[#A0AEC0] list-decimal pl-5 space-y-1">
          <li><span className="text-white">Plan the day:</span> split crew work blocks between jobs.</li>
          <li><span className="text-white">Build:</span> spend build points on power, life support, food and shielding.</li>
          <li><span className="text-white">Run the day:</span> watch the forecast so nothing runs out before day 30.</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <button className="retro-btn h-11 px-5 text-xs" onClick={onStart}>START MISSION</button>
          <button className="retro-btn-secondary h-11 px-5 text-xs" onClick={onExit}>BACK TO TITLE</button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Main game ---------------- */

const Bar: React.FC<{ pct: number; color: string; h?: number }> = ({ pct, color, h = 8 }) => (
  <div className="w-full border border-[#2A3B5C] bg-[#050508]" style={{ height: h }}>
    <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color }} />
  </div>
);

function daysLeft(stock: number, cap: number, net: number, remaining: number): { label: string; color: string } {
  if (stock >= cap && net >= 0) return { label: 'FULL', color: C.green };
  if (net > 0.05) return { label: 'GROWING', color: C.green };
  if (net >= -0.05) return { label: 'STEADY', color: C.green };
  const d = stock / -net;
  if (d >= remaining) return { label: 'LASTS', color: C.green };
  return { label: `${Math.floor(d)} DAYS LEFT`, color: d < 5 ? C.red : C.amber };
}

const Gauge: React.FC<{ label: string; hint: string; color: string; value: number; cap: number; unit: string; net: number; remaining: number }> = ({ label, hint, color, value, cap, unit, net, remaining }) => {
  const displayNet = displayedResourceNet(value, cap, net);
  const st = daysLeft(value, cap, net, remaining);
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2"><span style={{ color }} className="font-bold">{label}</span><span className="tabular-nums">{Math.round(value)}<span className="text-[#A0AEC0]"> / {cap} {unit}</span></span></div>
      <div className="text-[12px] text-[#A0AEC0]">{hint}</div>
      <Bar pct={(value / cap) * 100} color={color} />
      <div className="flex justify-between gap-2 text-[12px]">
        <span style={{ color: displayNet >= 0 ? C.green : C.amber }}>{displayNet >= 0 ? '+' : '−'}{Math.abs(displayNet).toFixed(1)} / day</span>
        <span className="font-pixel text-[9px] px-1.5 py-0.5 border" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, right, className = '', children }) => (
  <section className={`border-2 border-[#2A3B5C] bg-[#0d111a] p-3 min-w-0 ${className}`} style={{ boxShadow: '3px 3px 0 #000' }}>
    <div className="flex justify-between items-center gap-2 mb-2.5">
      <h2 className="font-pixel text-[9px] tracking-wider text-[#00F0FF]">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const Game: React.FC<{
  s: OutpostState; plan: Plan; setPlan: (p: Plan) => void;
  tab: 'schedule' | 'build'; setTab: (t: 'schedule' | 'build') => void;
  log: LogEntry[]; highScore: number; onRun: () => void; onJob: (k: JobKey, d: number) => void; onBuild: (k: ModuleKey) => void; onExit: () => void;
}> = ({ s, plan, setPlan, tab, setTab, log, highScore, onRun, onJob, onBuild, onExit }) => {
  const D = DESTINATIONS[s.dest];
  const f = forecastDay(s, plan);
  const a = effectiveAllocation(s, plan);
  const env = environment(s);
  const remaining = MISSION_DAYS - s.day + 1;
  const proj = projectedDose(s, f);
  const allowed = allowedBlocks(s);
  const used = usedBlocks(plan.alloc);
  const light = nextLightChange(s);
  const site = HORIZONS_SNAPSHOT[s.dest];

  const bulletins: Array<[LineKind, string]> = [];
  if (s.flareToday) bulletins.push(['bad', 'Solar flare tonight. Compare the dose with and without shelter.']);
  else if (s.flareDays.includes(s.day + 1)) bulletins.push(['warn', 'Space weather: a solar flare is forecast for tomorrow.']);
  if (env.night) bulletins.push(['bad', `Lunar night. Solar arrays make nothing.${light ? ` Horizons shows sunrise in ${light.inDays} day${light.inDays > 1 ? 's' : ''}.` : ''}`]);
  else if (light && light.kind === 'sunset' && light.inDays <= 5) bulletins.push(['warn', `Horizons shows sunset in ${light.inDays} day${light.inDays > 1 ? 's' : ''}. Build reactors and batteries now.`]);
  if (s.storm) {
    if (env.storm) bulletins.push(['bad', `Dust storm until sol ${s.storm.start + s.storm.length - 1}. Sunlight is about a quarter of normal.`]);
    else if (s.day < s.storm.start && s.storm.start - s.day <= 2) bulletins.push(['warn', `Dust storm forecast in ${s.storm.start - s.day} sol${s.storm.start - s.day > 1 ? 's' : ''}. Charge the batteries.`]);
  }
  const drone = s.resupplyDays.find((d) => d > s.day);
  if (drone && drone - s.day <= 2) bulletins.push(['info', `Supply drone due on ${D.dayWord.toLowerCase()} ${drone}. You will pick one crate.`]);
  if (brokenTotal(s) > 0) bulletins.push(['warn', `${brokenTotal(s)} machine${brokenTotal(s) > 1 ? 's are' : ' is'} offline. Maintenance blocks repair them.`]);

  const surplus = f.generated - f.totalDemand;
  const scale = Math.max(f.totalDemand, f.generated + Math.min(s.res.battery, Math.max(0, -surplus)), 1);
  const supply: Array<[string, number, string]> = [
    ['Solar', f.solarKwh, C.amber],
    ['Reactor', f.reactorKwh, '#FF8D3F'],
    ['Battery', Math.min(s.res.battery, Math.max(0, -surplus)), '#8F9BC2'],
  ];
  let verdict: [string, string];
  if (surplus >= 0) verdict = [C.green, `Surplus ${surplus.toFixed(0)} kWh charges the battery${f.wastedKwh > 0.5 ? ` (${f.wastedKwh.toFixed(0)} wasted, battery full)` : ''}.`];
  else if (s.res.battery + surplus >= 0) verdict = [C.amber, `Short ${(-surplus).toFixed(0)} kWh. Battery covers it for ${(s.res.battery / -surplus).toFixed(1)} days at this rate.`];
  else verdict = [C.red, 'Blackout risk. Life support is powered first, then jobs slow down.'];

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-4 space-y-3">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-[#00F0FF] pb-2">
        <div className="font-pixel text-[11px] text-[#00F0FF]">OUTPOST OPS</div>
        <div className="text-[#A0AEC0] text-xs">{D.site}</div>
        <div className="flex flex-wrap gap-2 ml-auto items-center text-xs">
          <span className="border border-[#FFB000] px-2 py-0.5 tabular-nums">{D.dayWord.toUpperCase()} {s.day} / {MISSION_DAYS}</span>
          <span className="border border-[#2A3B5C] px-2 py-0.5">{env.night ? 'NIGHT' : env.storm ? 'DUST STORM' : `SUN ${Math.round(env.sunlight * 100)}%`}</span>
          <span className="border border-[#2A3B5C] px-2 py-0.5 tabular-nums">SAMPLES {s.science.toFixed(0)} / {SCIENCE_GOAL}</span>
          <span data-testid="outpost-score" className="border border-[#00FF66] px-2 py-0.5 tabular-nums text-[#00FF66]">SCORE {finalReport(s).score}</span>
          <span data-testid="outpost-high-score" className="border border-[#FFB000] px-2 py-0.5 tabular-nums text-[#FFB000]">OUTPOST HI {highScore}</span>
          <span className="border border-[#2A3B5C] px-2 py-0.5 tabular-nums" style={{ color: C.amber }}>BUILD PTS {Math.floor(s.buildPoints)}</span>
          <button className="retro-btn-secondary px-3 py-1 text-[9px]" onClick={onExit}>EXIT</button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)_360px] items-start">
        {/* Vitals */}
        <div className="space-y-3 min-w-0 order-2 lg:order-1">
          <Panel title="LIFE SUPPORT">
            <div className="space-y-3">
              <Gauge label="Battery" hint="Stored electricity for nights and storms" color={C.amber} value={s.res.battery} cap={f.batteryCap} unit="kWh" net={surplus} remaining={remaining} />
              <Gauge label="Oxygen" hint="Air for the crew to breathe" color={C.cyan} value={s.res.o2} cap={CAP.o2} unit="units" net={f.o2Net} remaining={remaining} />
              <Gauge label="Water" hint="Drinking and washing water" color={C.water} value={s.res.water} cap={CAP.water} unit="units" net={f.waterNet} remaining={remaining} />
              <Gauge label="Food" hint="Meals: each astronaut eats 1 a day" color={C.green} value={s.res.food} cap={CAP.food} unit="units" net={f.foodNet} remaining={remaining} />
              <div className="space-y-1">
                <div className="flex justify-between gap-2"><span style={{ color: C.rad }} className="font-bold">Radiation dose</span><span className="tabular-nums">{s.dose.toFixed(1)}<span className="text-[#A0AEC0]"> / {DOSE_LIMIT} mSv</span></span></div>
                <div className="text-[12px] text-[#A0AEC0]">Space radiation each astronaut has absorbed. Keep it under {DOSE_LIMIT}.</div>
                <Bar pct={(s.dose / DOSE_LIMIT) * 100} color={C.rad} />
                <div className="flex justify-between gap-2 text-[12px]">
                  <span>Shield layers {s.modules.shield} / 5</span>
                  <span className="font-pixel text-[9px] px-1.5 py-0.5 border" style={{ color: proj > DOSE_LIMIT ? C.red : proj > DOSE_LIMIT * 0.85 ? C.amber : C.green, borderColor: 'currentColor' }}>END ~{proj.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="CREW">
            <div className="space-y-2.5">
              {s.crew.map((c) => (
                <div key={c.name} className={c.aboard ? '' : 'opacity-40'}>
                  <div className="flex justify-between text-xs"><b>{c.name}</b><span className="text-[#A0AEC0]">{c.aboard ? c.role : 'Evacuated'}</span></div>
                  <div className="grid grid-cols-[52px_1fr] items-center gap-2 text-[11px] text-[#A0AEC0] mt-1">Health<Bar h={6} pct={c.hp} color={c.hp < 35 ? C.red : c.hp < 65 ? C.amber : C.green} /></div>
                  <div className="grid grid-cols-[52px_1fr] items-center gap-2 text-[11px] text-[#A0AEC0] mt-0.5">Morale<Bar h={6} pct={c.morale} color={c.morale < 35 ? C.red : c.morale < 60 ? C.amber : C.cyan} /></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center */}
        <div className="space-y-3 min-w-0 order-1 lg:order-2">
          <OutpostScene s={s} f={f} shelter={!!(s.flareToday && plan.shelter)} outdoorBlocks={a.build + a.ice + a.sci} />
          <Panel title="SUNLIGHT AT YOUR SITE" right={<span className="text-[11px] text-[#A0AEC0]">NASA/JPL Horizons</span>}>
            <SunStrip s={s} />
            <p className="text-[12px] text-[#A0AEC0] mt-2">
              Each bar is one {D.dayWord.toLowerCase()}: the share of it with the Sun above the horizon at {site.lat}° N, {site.lonE}° E, from {site.startUtc.slice(0, 10)}
              {s.dest === 'mars' ? `, times ${Math.round((site.solarConstantWm2.mean / HORIZONS_SNAPSHOT.moon.solarConstantWm2.mean) * 100)}% because Mars is farther from the Sun` : ''}.
            </p>
          </Panel>
          {bulletins.length > 0 && (
            <div className="space-y-2">
              {bulletins.map(([k, t], i) => (
                <div key={i} className="border-2 px-3 py-2 text-xs" style={{ borderColor: KIND_COLOR[k], background: `${KIND_COLOR[k]}14` }}>{t}</div>
              ))}
            </div>
          )}
          <Panel title="POWER BUDGET" right={<span className="text-[11px] text-[#A0AEC0] tabular-nums">{f.generated.toFixed(0)} made · {f.totalDemand.toFixed(0)} wanted kWh</span>}>
            <div className="grid grid-cols-[60px_1fr] gap-2 items-center text-[12px] text-[#A0AEC0] mb-2">
              Supply<StackBar parts={supply} scale={scale} />
              Demand<StackBar parts={SERVICES.map((sv) => [sv.label, f.demand[sv.key], SERVICE_COLOR[sv.key]] as [string, number, string])} scale={scale} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#A0AEC0] mb-2">
              {SERVICES.filter((sv) => f.demand[sv.key] > 0.01).map((sv) => (
                <span key={sv.key} className="inline-flex items-center gap-1"><i className="inline-block w-2 h-2" style={{ background: SERVICE_COLOR[sv.key] }} />{sv.label} {f.demand[sv.key].toFixed(0)}</span>
              ))}
            </div>
            <div className="text-xs font-bold" style={{ color: verdict[0] }}>{verdict[1]}</div>
            <div className="text-[11px] text-[#A0AEC0] mt-1">Power goes to the habitat first, then oxygen, water and greenhouses, then jobs.</div>
          </Panel>
          <Panel title="MISSION LOG">
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
              {log.map((l, i) => (
                <div key={i} className="grid grid-cols-[52px_1fr] gap-2"><span className="text-[#8494AD] tabular-nums">{D.dayWord.slice(0, 1)}{l.day}</span><span style={{ color: l.kind === 'info' ? '#fff' : KIND_COLOR[l.kind] }}>{l.text}</span></div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Command */}
        <div className="space-y-3 min-w-0 order-3">
          <FirstSteps s={s} plan={plan} />
          <Panel title="TODAY'S ORDERS">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['schedule', 'build'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`font-pixel text-[9px] py-2 border-2 ${tab === t ? 'bg-[#00F0FF] text-[#050508] border-[#00F0FF]' : 'border-[#2A3B5C] hover:border-[#00F0FF]'}`}>{t === 'schedule' ? 'CREW SCHEDULE' : 'BUILD'}</button>
              ))}
            </div>
            {tab === 'schedule' ? (
              <div className="space-y-2">
                <div className="text-[12px] text-[#A0AEC0]">{allowed} work blocks today (about 4 hours each).{2 * f.crew > allowed ? ` Low morale cost ${2 * f.crew - allowed}.` : ''}</div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${allowed}, 1fr)` }}>
                  {[...JOBS.flatMap((j) => Array(a[j.key]).fill(JOB_COLOR[j.key]) as string[]), ...(Array(a.rest).fill(REST_COLOR) as string[])].slice(0, allowed).map((col, i) => (
                    <i key={i} className="h-3 border border-black" style={{ background: col }} />
                  ))}
                </div>
                {JOBS.map((j) => {
                  const lockedOut = s.flareToday && plan.shelter && j.outdoor;
                  return (
                    <div key={j.key} className="grid grid-cols-[1fr_auto] gap-2 items-center border border-[#2A3B5C] bg-[#050508] p-2">
                      <div className="min-w-0"><div className="text-xs font-bold" style={{ color: JOB_COLOR[j.key] }}>{j.name}</div><div className="text-[11px] text-[#A0AEC0]">{j.hint}</div></div>
                      <div className="flex items-center gap-1">
                        <button aria-label={`Fewer ${j.name} blocks`} className="w-8 h-8 border-2 border-[#2A3B5C] hover:border-[#00F0FF] disabled:opacity-30" disabled={plan.alloc[j.key] <= 0} onClick={() => onJob(j.key, -1)}>−</button>
                        <span className="w-6 text-center font-pixel text-[12px] tabular-nums">{a[j.key]}</span>
                        <button aria-label={`More ${j.name} blocks`} className="w-8 h-8 border-2 border-[#2A3B5C] hover:border-[#00F0FF] disabled:opacity-30" disabled={used >= allowed || lockedOut} onClick={() => onJob(j.key, 1)}>+</button>
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center border border-dashed border-[#2A3B5C] p-2">
                  <div><div className="text-xs font-bold" style={{ color: REST_COLOR }}>Rest and exercise</div><div className="text-[11px] text-[#A0AEC0]">Leftover blocks. Keeps morale and health up.</div></div>
                  <span className="w-6 text-center font-pixel text-[12px]">{a.rest}</span>
                </div>
                {s.flareToday && (
                  <label className="flex gap-2 items-start border-2 border-[#FF3344] bg-[#FF3344]/10 p-2 text-[12px] cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#00F0FF]" checked={plan.shelter} onChange={(e) => setPlan({ ...plan, shelter: e.target.checked })} />
                    <span><b>Shelter from the flare.</b> Construction, ice mining and science stop today. The shelter cuts indoor flare dose by 85%.</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(Object.keys(MODULES) as ModuleKey[]).map((k) => {
                  const m = MODULES[k];
                  const brk = k in s.broken ? s.broken[k as keyof typeof s.broken] : 0;
                  return (
                    <div key={k} className="border border-[#2A3B5C] bg-[#050508] p-2 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <b className="text-xs">{m.name}</b>
                        <button className="retro-btn px-2 py-1 text-[8px] disabled:opacity-30 disabled:cursor-not-allowed" disabled={!canBuild(s, k)} onClick={() => onBuild(k)}>{s.modules[k] >= m.max ? 'MAX' : `BUILD ${m.cost}`}</button>
                      </div>
                      <div className="text-[11px] text-[#A0AEC0]">{m.desc}</div>
                      <div className="text-[11px] text-[#A0AEC0] tabular-nums">Built {s.modules[k]} of {m.max}{brk ? <span style={{ color: C.red }}> · {brk} offline</span> : null}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="retro-btn w-full h-12 mt-3 text-xs disabled:opacity-40" disabled={s.phase !== 'play'} onClick={onRun}>RUN {D.dayWord.toUpperCase()} {s.day}</button>
            <div className="text-[12px] text-[#A0AEC0] mt-2">
              Tonight: +{f.dose.toFixed(2)} mSv each{s.flareToday ? (plan.shelter ? ' (sheltered)' : ' (flare, no shelter)') : ''}. Expect {f.science > 0 ? `+${f.science.toFixed(0)} samples` : 'no samples'} and {f.buildPoints > 0 ? `+${f.buildPoints.toFixed(0)} build points` : 'no build points'}.
            </div>
          </Panel>
          <Panel title="FLIGHT DIRECTOR">
            <p className="text-xs">{tip(s, f, proj)}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
};

const StackBar: React.FC<{ parts: Array<[string, number, string]>; scale: number }> = ({ parts, scale }) => (
  <div className="flex h-6 border border-[#2A3B5C] bg-[#050508] overflow-hidden">
    {parts.filter((p) => p[1] > 0.01).map(([label, v, col]) => (
      <i key={label} title={`${label}: ${v.toFixed(0)} kWh`} style={{ width: `${(v / scale) * 100}%`, background: col, borderRight: '1px solid #000' }} />
    ))}
  </div>
);

const SunStrip: React.FC<{ s: OutpostState }> = ({ s }) => {
  const days = useMemo(() => Array.from({ length: MISSION_DAYS }, (_, i) => i + 1), []);
  const D = DESTINATIONS[s.dest];
  return (
    <div>
      <div className="flex items-end gap-[2px] h-16" role="img" aria-label={`Sunlight for each of the ${MISSION_DAYS} ${D.dayWord.toLowerCase()}s from NASA/JPL Horizons`}>
        {days.map((d) => {
          const raw = horizonsSunlight(s.dest, d);
          // Horizons knows the Sun's path a month ahead; dust storms are weather, so they
          // only show once the forecast (2 sols ahead) has announced them.
          const storm = environment(s, d).storm && d <= s.day + 2;
          const past = d < s.day;
          const today = d === s.day;
          return (
            <div key={d} className="flex-1 h-full flex flex-col justify-end relative" title={`${D.dayWord} ${d}: ${Math.round(raw * 100)}% sunlight${storm ? ', dust storm' : ''}`}>
              <div style={{ height: `${Math.max(4, raw * 100)}%`, background: raw < 0.05 ? '#1E293B' : storm ? '#8A6A4A' : C.amber, opacity: past ? 0.35 : 1, outline: today ? `2px solid ${C.cyan}` : 'none' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-[#8494AD] mt-1 tabular-nums"><span>{D.dayWord} 1</span><span>{D.dayWord} {MISSION_DAYS}</span></div>
    </div>
  );
};

/** Guided start for the first days: what to do, in order, ticked off as it happens. */
const FirstSteps: React.FC<{ s: OutpostState; plan: Plan }> = ({ s, plan }) => {
  const gh = s.modules.greenhouse > 0;
  const steps: Array<[boolean, string]> = [
    [gh, 'Open BUILD and build a greenhouse (5 points). Without one, food runs out.'],
    [gh && plan.alloc.farm >= s.modules.greenhouse, 'In CREW SCHEDULE, give each greenhouse 1 Farming block.'],
    [s.day > 1, 'Check the gauges on the left. Green LASTS means you are fine. Then press RUN DAY.'],
  ];
  if (s.dest === 'moon') steps.push([s.modules.reactor > 0, 'Before night falls (see the sunlight chart), save up for a fission reactor.']);
  if (s.day > 4 || steps.every(([done]) => done)) return null;
  return (
    <section className="border-2 border-[#FFB000] bg-[#FFB000]/10 p-3" aria-label="First steps">
      <h2 className="font-pixel text-[11px] text-[#FFB000] mb-2">FIRST STEPS</h2>
      <ol className="space-y-1.5 text-[13px]">
        {steps.map(([done, text], i) => (
          <li key={i} className="flex gap-2" style={{ color: done ? C.green : '#fff' }}>
            <span className="font-pixel text-[11px] mt-0.5" aria-hidden="true">{done ? '■' : '□'}</span>
            <span className={done ? 'line-through opacity-70' : ''}>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

function tip(s: OutpostState, f: ReturnType<typeof forecastDay>, proj: number): string {
  const left = (v: number, n: number) => (n < -0.05 ? v / -n : Infinity);
  const light = nextLightChange(s);
  if (s.day === 1) return 'Welcome, Commander. Each gauge shows how long a supply lasts at today’s rate. Aim for every one to say LASTS. Food runs out first without a greenhouse.';
  if (f.lifeSupportShort) return 'Brownout. When power runs short, life support is served first and jobs slow down. Add a reactor, solar arrays or a battery bank.';
  if (light && light.kind === 'sunset' && light.inDays <= 6 && s.modules.reactor < 2) return `Horizons says the Sun sets in ${light.inDays} days and stays down for about two weeks. Solar arrays will make nothing. Save for fission reactors and batteries now.`;
  if (left(s.res.battery, f.generated - f.totalDemand) < 4) return 'The battery will run flat soon at this rate. Build power or drop some power-hungry jobs.';
  if (left(s.res.o2, f.o2Net) < 5) return 'Oxygen is dropping. Oxygen generators need power and water, so check both.';
  if (left(s.res.water, f.waterNet) < 6) return 'Water is draining. Recyclers save used water and ice mining brings in new water.';
  if (left(s.res.food, f.foodNet) < 7) return 'Food will not last. Build a greenhouse and give it a farming block each day.';
  if (proj > DOSE_LIMIT) return `At this pace the crew passes the radiation limit by about ${(proj - DOSE_LIMIT).toFixed(0)} mSv. Soil shield layers cut the indoor dose; outdoor work skips the shield.`;
  if (brokenTotal(s) > 0) return 'A machine is offline. One maintenance block repairs one machine.';
  const morale = aboard(s).reduce((t, c) => t + c.morale, 0) / Math.max(1, aboard(s).length);
  if (morale < 50) return 'Morale is slipping. Leave some blocks for rest; low morale costs work blocks.';
  if (s.day > 6 && s.science < (SCIENCE_GOAL / MISSION_DAYS) * s.day * 0.8) return `You are behind on science. ${SCIENCE_GOAL} samples needs about ${Math.ceil(SCIENCE_GOAL / 3 / MISSION_DAYS * 10) / 10} science blocks a day.`;
  return ['Looking steady. Spend spare build points on shielding or backup power.', 'Batteries are cheap insurance for nights and storms.', 'Outdoor jobs skip the habitat shield, so they add radiation.', 'Check the power budget before adding jobs. Everything depends on power.'][s.day % 4];
}

/* ---------------- Modals ---------------- */

const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(5,5,8,0.85)' }} role="dialog" aria-modal="true">
    <div className="retro-window-amber w-full max-w-xl p-5 space-y-3 font-telemetry text-sm">{children}</div>
  </div>
);

const EventModal: React.FC<{ ev: OutpostEvent; onDone: (crate?: CrateKey) => void }> = ({ ev, onDone }) => (
  <Modal>
    <h2 className="font-pixel text-sm text-[#FFB000] leading-relaxed">{ev.title.toUpperCase()}</h2>
    <p>{ev.body}</p>
    {ev.fact && <p className="border-l-2 border-[#00F0FF] pl-3 text-[#A0AEC0] text-xs"><b className="text-[#00F0FF]">Real mission fact.</b> {ev.fact}</p>}
    {ev.kind === 'resupply' ? (
      <div className="grid sm:grid-cols-3 gap-2">
        {(Object.keys(CRATES) as CrateKey[]).map((k) => (
          <button key={k} className="text-left border-2 border-[#2A3B5C] hover:border-[#00F0FF] p-2" onClick={() => onDone(k)}>
            <div className="text-xs font-bold">{CRATES[k].name}</div>
            <div className="text-[12px] text-[#A0AEC0]">{CRATES[k].text}</div>
          </button>
        ))}
      </div>
    ) : (
      <div className="flex justify-end"><button autoFocus className="retro-btn px-4 py-2 text-[11px]" onClick={() => onDone()}>GOT IT</button></div>
    )}
  </Modal>
);

const Debrief: React.FC<{
  s: OutpostState;
  researchBalance: number;
  highScore: number;
  newHighScore: boolean;
  onAgain: () => void;
  onExit: () => void;
}> = ({ s, researchBalance, highScore, newHighScore, onAgain, onExit }) => {
  const r = finalReport(s);
  const top = mainCause(s);
  const researchReward = getOutpostResearchReward(s.dest, s.difficulty, s.result);
  const obj = (ok: boolean, text: string) => (
    <div className="flex gap-2 text-xs"><span style={{ color: ok ? C.green : '#64748B' }}>{ok ? '■' : '□'}</span><span>{text}</span></div>
  );
  return (
    <Modal>
      <h2 className="font-pixel text-sm leading-relaxed" style={{ color: s.result === 'complete' ? C.green : C.red }}>{s.result === 'complete' ? 'MISSION COMPLETE' : 'MISSION ABORTED'}</h2>
      <div className="font-pixel text-lg" style={{ color: C.amber }}>{'★'.repeat(r.stars)}<span className="text-[#2A3B5C]">{'★'.repeat(3 - r.stars)}</span></div>
      <div className="text-sm">Rank: <b>{r.rank}</b> · Score <b className="tabular-nums">{r.score}</b></div>
      <div className="border border-[#2A3B5C] bg-[#050508] p-3 space-y-1 text-xs">
        <div>Operations and mission score: <b>+{r.baseScore}</b></div>
        <div>Daily survival: <b>+{r.dailySurvivalScore}</b></div>
        <div>Healthy 30-day crew bonus: <b>+{r.performanceBonus}</b></div>
        {r.difficultyMultiplier > 1 && <div>Commander multiplier: <b>×{r.difficultyMultiplier}</b></div>}
        <div className="text-[#00FF66] font-bold">OUTPOST HI-SCORE: {highScore}</div>
        {newHighScore && <div role="status" className="font-pixel text-[#FFB000]">★ NEW HI-SCORE! ★</div>}
      </div>
      {s.result === 'complete' ? (
        <div className="border border-[#00FF66]/60 bg-[#00FF66]/5 p-3 space-y-1 text-xs">
          <div className="font-pixel text-[9px] text-[#00FF66]">RESEARCH POINTS EARNED</div>
          <div>
            Mission Reward ({DESTINATIONS[s.dest].name} - {researchReward.siteTier}):{' '}
            <b>+{researchReward.basePoints} RP</b>
          </div>
          {researchReward.difficultyBonusPoints > 0 && (
            <div>
              Commander Difficulty Bonus: <b>+{researchReward.difficultyBonusPoints} RP</b>
            </div>
          )}
          <div className="font-bold">Total Earned: +{researchReward.points} RP</div>
          <div className="text-[#00FF66]">Research Bank: {researchBalance} RP</div>
        </div>
      ) : (
        <div className="border border-[#FF3344]/60 bg-[#FF3344]/5 p-3 text-xs text-[#FF3344]">
          No completion research reward for an aborted mission.
        </div>
      )}
      <div className="space-y-1">
        {obj(r.crewSafe, 'Everyone stayed healthy for all 30 days')}
        {obj(r.scienceMet, `Collected ${SCIENCE_GOAL}+ science samples (you: ${s.science.toFixed(0)})`)}
        {obj(r.doseOk, `Stayed under ${DOSE_LIMIT} mSv each (you: ${s.dose.toFixed(1)})`)}
      </div>
      {top && (
        <div className="border-2 border-[#FF3344] bg-[#FF3344]/10 p-2 text-sm">
          <div className="font-pixel text-[9px] text-[#FF3344] mb-1">{s.result === 'complete' ? 'BIGGEST PROBLEM' : 'WHY THE MISSION FAILED'}</div>
          <p>Most often ({top.days} day{top.days > 1 ? 's' : ''}): {top.cause}.</p>
        </div>
      )}
      <div className="font-pixel text-[9px] text-[#00F0FF] pt-1">WHAT THE ENGINEERS WOULD SAY</div>
      <div className="space-y-2">
        {lessons(s).map((l) => (
          <div key={l.title} className="border border-[#2A3B5C] bg-[#050508] p-2 text-xs"><b className="block mb-0.5">{l.title}</b><span className="text-[#A0AEC0]">{l.body}</span></div>
        ))}
      </div>
      <p className="text-[11px] text-[#8494AD]">The {DOSE_LIMIT} mSv limit is game-sized. Real agencies set career limits in the hundreds of mSv. Sunlight data: NASA/JPL Horizons.</p>
      <div className="flex flex-wrap gap-2 justify-end">
        <button className="retro-btn-secondary px-4 py-2 text-[11px]" onClick={onExit}>TITLE SCREEN</button>
        <button autoFocus className="retro-btn px-4 py-2 text-[11px]" onClick={onAgain}>NEW MISSION</button>
      </div>
    </Modal>
  );
};
