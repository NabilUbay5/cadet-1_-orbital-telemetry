import { FLIGHT_EPHEMERIS } from '../data/nasa/flightEphemeris.ts';
import { sampleEphemeris } from '../game/horizonsEphemeris.ts';

export function NasaTelemetryPanel({ metSeconds, wing }: { metSeconds: number; wing: 'state' | 'source' }) {
  const reading = sampleEphemeris(FLIGHT_EPHEMERIS, metSeconds);
  return (
    <section aria-label={wing === 'state' ? 'NASA orbital reference' : 'NASA reference provenance'}
      className="retro-window-amber p-3 bg-[#0d111a]/95 text-[9px] leading-relaxed">
      <div className="text-[#FFB000] text-[9px] font-bold mb-1">NASA / JPL HORIZONS</div>
      <div className="text-[#A0AEC0] text-[8px] mb-2">MOON / EARTH · REFERENCE REPLAY</div>
      {wing === 'state' ? (
        <>
          <dl className="space-y-1.5 font-telemetry">
            <div><dt className="text-[#A0AEC0]">GEOCENTRIC RANGE</dt><dd data-testid="nasa-range" className="text-[#00F0FF] text-sm">{reading ? `${reading.distanceKm.toFixed(1)} km` : '—'}</dd></div>
            <div><dt className="text-[#A0AEC0]">RELATIVE SPEED</dt><dd className="text-[#00FF66]">{reading ? `${reading.speedKmS.toFixed(6)} km/s` : '—'}</dd></div>
            <div><dt className="text-[#A0AEC0]">RADIAL VELOCITY</dt><dd className="text-[#FFFFFF]">{reading ? `${reading.rangeRateKmS.toFixed(4)} km/s` : '—'}</dd></div>
          </dl>
          <p className="text-[8px] text-[#A0AEC0] mt-2">Moon state at reference epoch + flight MET. Craft gauges show simulation.</p>
        </>
      ) : (
        <>
          <dl className="space-y-1.5 font-telemetry">
            <div><dt className="text-[#A0AEC0]">REFERENCE EPOCH · JD TDB</dt><dd data-testid="nasa-epoch" className="text-[#00F0FF]">{reading?.julianDayTdb.toFixed(6) ?? '—'}</dd></div>
            <div><dt className="text-[#A0AEC0]">FRAME / ORIGIN</dt><dd className="text-[#FFFFFF]">ICRF EQUATORIAL / EARTH CENTER</dd></div>
          </dl>
          <p className="mt-2 text-[8px] text-[#A0AEC0]">Bundled snapshot · retrieved {FLIGHT_EPHEMERIS.retrievedAt.slice(0, 10)} UTC. Interpolated between 10-minute states.</p>
          <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer"
            className="inline-block mt-2 text-[#FFB000] underline focus-visible:outline-2">View NASA data source ↗</a>
        </>
      )}
      {!reading && <p role="status" className="mt-2 text-[#FFB000]">Reference interval ended. NASA readings unavailable.</p>}
    </section>
  );
}
