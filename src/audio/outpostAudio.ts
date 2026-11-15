import { audioEngine } from '../game/audioEngine.ts';

/** Unlock only from a user gesture; transmission timers never create a context. */
export function playOutpostControl(heavy = false): void {
  audioEngine.ensureRunning();
  audioEngine.playUiClick(heavy);
}

export function playOutpostTransmission(): void { audioEngine.playCommsIncoming(); }
export function playOutpostTypewriter(): void { audioEngine.playTelemetryTick(); }
