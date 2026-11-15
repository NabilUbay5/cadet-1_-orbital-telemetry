import { useRef } from 'react';
import { AI_DISCLOSURE, PROJECT_SOURCES, SI_CATEGORIES, SOFTWARE_CREDITS } from '../data/projectCredits.ts';

export function ProjectCredits() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="retro-btn-secondary min-h-9 px-3 text-[8px]" onClick={() => dialog.current?.showModal()}>CREDITS & SOURCES</button>
    <dialog ref={dialog} aria-labelledby="project-credits-title" className="project-credits font-telemetry"
      onKeyDown={event => event.stopPropagation()}>
      <div className="flex justify-between gap-3 items-center mb-4">
        <h2 id="project-credits-title" className="font-pixel text-[#00F0FF] text-sm">CREDITS & SOURCES</h2>
        <button autoFocus className="retro-btn-secondary min-h-11 px-3" onClick={() => dialog.current?.close()}>CLOSE</button>
      </div>
      <p>CADET-1 is an independent educational game. NASA/JPL names identify data sources; no NASA endorsement is implied.</p>
      <h3>AI (SI) tool use</h3>
      <ul>{SI_CATEGORIES.map(category => <li key={category}>{category}</li>)}</ul>
      <p>{AI_DISCLOSURE}</p>
      <h3>Data and literature</h3>
      <ul>{PROJECT_SOURCES.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
      <p>Horizons snapshots drive outpost sunlight and a flight reference replay. Craft dynamics are arcade simulation. The 1.37/0.64 mSv radiation values are unverified scenario inputs; the cited publications are literature references. The NASA Open APIs portal is planned only.</p>
      <h3>Open-source tools and font</h3>
      <ul>{SOFTWARE_CREDITS.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
      <p>Motion and Lucide were unused template dependencies and have been removed. Models, pixel badges and effects are procedural project artwork. All citations are optional external links; gameplay requires no live API requests.</p>
    </dialog>
  </>;
}
