import { useRef, useState } from 'react';
import { SIMULATION_PREVIEWS, type SimulationMode } from '../data/simulationPreviews.ts';

export function SimulationPreview({ mode }: { mode: SimulationMode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const preview = SIMULATION_PREVIEWS[mode];
  return <>
    <button type="button" className="simulation-preview-trigger underline text-[#8BEAFF] text-[10px] min-h-9 text-left"
      aria-label={`Simulation Preview: ${preview.title}`} onClick={() => { setOpen(true); dialog.current?.showModal(); }}>SIMULATION PREVIEW ↗</button>
    <dialog ref={dialog} className="project-credits simulation-preview font-telemetry" aria-label={`${preview.title} Simulation Preview`}
      onClose={() => setOpen(false)} onKeyDown={event => event.stopPropagation()}>
      {open && <>
        <div className="flex justify-between items-center gap-3 mb-3">
          <div><p className="text-[11px] text-[#FFB000]">{preview.label}</p><h2 className="font-pixel text-sm text-[#00F0FF]">{preview.title} · Simulation Preview</h2></div>
          <button autoFocus className="retro-btn-secondary min-h-11 px-3" onClick={() => dialog.current?.close()}>CLOSE</button>
        </div>
        <p>{preview.summary}</p>
        <ul>{preview.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
        <div className="grid gap-4 sm:grid-cols-2">
          {preview.images.map(previewImage => <figure key={previewImage.file}>
            <img src={`${import.meta.env.BASE_URL}assets/${previewImage.file}`} alt={previewImage.alt} className="w-full border border-[#2A3B5C]" />
            <figcaption className="text-xs text-[#A0AEC0] mt-1">{previewImage.caption}</figcaption>
          </figure>)}
        </div>
        <p className="text-xs text-[#A0AEC0] mt-4">Actual application captures using the bundled Determination font. Still images are silent; in-game audio uses the global mute setting. Horizons data is bundled reference data, not a live feed.</p>
      </>}
    </dialog>
  </>;
}
