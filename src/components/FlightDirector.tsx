import { useEffect, useRef, useState } from 'react';
import { playOutpostTransmission, playOutpostTypewriter } from '../audio/outpostAudio.ts';

export interface DirectorMessage { id: string; text: string; urgent: boolean }

/** A keyed transmission owns its timers; interruption/unmount always cancels them. */
function Transmission({ message }: { message: DirectorMessage }) {
  const [visible, setVisible] = useState(true);
  const [count, setCount] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduce, setReduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const announced = useRef(false);
  const complete = reduce || count >= message.text.length;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(media?.matches ?? false);
    media?.addEventListener('change', update);
    return () => media?.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!announced.current) { playOutpostTransmission(); announced.current = true; }
  }, []);

  useEffect(() => {
    if (complete || !visible) return;
    // Three characters per tick: smooth text, quiet and bounded audio cadence.
    const timer = window.setInterval(() => {
      setCount(value => Math.min(message.text.length, value + 3));
      if (document.visibilityState !== 'hidden') playOutpostTypewriter();
    }, 65);
    return () => window.clearInterval(timer);
  }, [complete, message.text.length, visible]);

  useEffect(() => {
    if (!complete || !visible || held) return;
    const timer = window.setTimeout(() => setVisible(false), 12000);
    return () => window.clearTimeout(timer);
  }, [complete, visible, held]);

  if (!visible) return (
    <button className="outpost-button clip-tactical outpost-comms-recall" onClick={() => { setCount(message.text.length); setVisible(true); }}>
      ◉ LAST TRANSMISSION <span aria-hidden="true">↗</span>
    </button>
  );
  return (
    <aside className={`outpost-comms ${message.urgent ? 'outpost-comms-warning' : ''}`} aria-label="Flight Director transmission"
      onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false); }}>
      <div className="outpost-comms-heading">
        <span className="outpost-comms-icon" aria-hidden="true">◉</span>
        <span>FLIGHT DIRECTOR <small>{message.urgent ? 'PRIORITY CHANNEL' : 'COMMS LINK / ACTIVE'}</small></span>
        <button className="outpost-button clip-hex" aria-label="Dismiss transmission" onClick={() => setVisible(false)}>×</button>
      </div>
      {/* Screen readers receive one complete announcement, not every character. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message.text}</p>
      <button className="outpost-comms-text" aria-label={complete ? 'Flight Director message' : 'Show full transmission'}
        onClick={() => setCount(message.text.length)}>
        <span aria-hidden="true">{complete ? message.text : message.text.slice(0, count)}<span className="outpost-cursor">▋</span></span>
        <small>{complete ? 'TRANSMISSION RECEIVED' : 'TAP TO REVEAL MESSAGE'}</small>
      </button>
    </aside>
  );
}

export function FlightDirector({ message, suspended = false }: { message: DirectorMessage; suspended?: boolean }) {
  // Snapshot text per semantic event. Numeric forecast edits must not restart typing.
  const [active, setActive] = useState(message);
  if (suspended) return null;
  if (active.id !== message.id) { setActive(message); return null; }
  return <Transmission key={active.id} message={active} />;
}
