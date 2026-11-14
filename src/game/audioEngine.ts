/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SUCCESS_NOTES = [1046.5, 1318.51, 1567.98, 2093] as const;
const QUIZ_NOTES = [659.25, 987.77, 1318.51] as const;
const DISPATCH_NOTES = [783.99, 1046.5, 1318.51] as const;
const SCANNER_NOTES = [880, 1174.66, 1760] as const;
const VICTORY_NOTES = [392, 523.25, 659.25, 783.99, 1046.5] as const;
const VOICE_COUNT = 16;

type Voice = { oscillator: OscillatorNode; gain: GainNode; until: number };

/** Lazy, gesture-unlocked Web Audio synthesis. All sources and voices are pooled. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private rumble: GainNode | null = null;
  private burst: GainNode | null = null;
  private voices: Voice[] = [];
  private muted = false;
  private boosting = false;
  private throttle = -1;
  private nextRcsAt = 0;
  private nextProximityAt = 0;

  constructor(private readonly createContext: () => AudioContext = () => {
    const host = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Context = host.AudioContext ?? host.webkitAudioContext;
    if (!Context) throw new Error('Web Audio unavailable');
    return new Context();
  }) {}

  /** Call on user gestures, never automatically on page load. Audio is optional. */
  public ensureRunning(): void {
    if (!this.ctx) {
      try {
        this.ctx = this.createContext();
        this.setup(this.ctx);
      } catch {
        this.dispose();
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  private setup(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.65;
    this.master.connect(ctx.destination);
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    this.hum = ctx.createOscillator();
    this.hum.type = 'square';
    this.hum.frequency.value = 48;
    this.hum.connect(this.humGain);
    this.hum.start();

    // A single quantized noise buffer drives continuous rumble and transient RCS.
    const length = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let value = 0;
    for (let i = 0; i < length; i++) {
      if (i % 6 === 0) value = Math.round((Math.random() * 2 - 1) * 4) / 4;
      samples[i] = value;
    }
    this.noise = ctx.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    this.noise.connect(filter);
    this.rumble = ctx.createGain();
    this.burst = ctx.createGain();
    this.rumble.gain.value = 0;
    this.burst.gain.value = 0;
    filter.connect(this.rumble);
    filter.connect(this.burst);
    this.rumble.connect(this.master);
    this.burst.connect(this.master);
    this.noise.start();

    for (let i = 0; i < VOICE_COUNT; i++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'square';
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start();
      this.voices.push({ oscillator, gain, until: 0 });
    }
  }

  /** No node/buffer creation in the physics loop. Boost cues fire only on entry. */
  public setThruster(throttle: number, boosting: boolean): void {
    const level = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle)) : 0;
    if (!this.ctx || !this.hum || !this.humGain || !this.rumble) return;
    if (level === this.throttle && boosting === this.boosting) return;
    if (boosting && !this.boosting) this.playBoostIgnition();
    this.throttle = level;
    this.boosting = boosting;
    const t = this.ctx.currentTime;
    this.hum.frequency.setTargetAtTime(48 + Math.floor(level * (boosting ? 72 : 40)), t, 0.04);
    this.humGain.gain.setTargetAtTime(level * (boosting ? 0.10 : 0.065), t, 0.04);
    this.rumble.gain.setTargetAtTime(level * (boosting ? 0.18 : 0.10), t, 0.04);
  }

  private tone(frequency: number, delay = 0, duration = 0.16, volume = 0.08): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Reserve future notes too; never steal a voice from an unfinished chime.
    for (const voice of this.voices) {
      if (voice.until > now) continue;
      const start = now + delay;
      const end = start + duration;
      voice.oscillator.frequency.setValueAtTime(frequency, start);
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(0, now);
      voice.gain.gain.setValueAtTime(0, start);
      voice.gain.gain.linearRampToValueAtTime(volume, start + 0.008);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, end);
      voice.gain.gain.setValueAtTime(0, end + 0.005);
      voice.until = end + 0.01;
      return;
    }
  }

  private sequence(notes: readonly number[], spacing = 0.06, duration = 0.18): void {
    for (let i = 0; i < notes.length; i++) this.tone(notes[i], i * spacing, duration);
  }

  public playBoostIgnition(): void {
    this.tone(110, 0, 0.15, 0.10);
    this.tone(220, 0.05, 0.20, 0.08);
    this.tone(440, 0.10, 0.18, 0.06);
  }

  public playRcsBurst(): void {
    if (!this.ctx || !this.burst || this.muted || this.ctx.currentTime < this.nextRcsAt) return;
    const t = this.ctx.currentTime;
    this.nextRcsAt = t + 0.09;
    this.burst.gain.cancelScheduledValues(t);
    this.burst.gain.setValueAtTime(0.09, t);
    this.burst.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    this.burst.gain.setValueAtTime(0, t + 0.065);
  }

  /** Rate scales with proximity, using simulation-provided distance in metres. */
  public updateProximity(distance: number): void {
    if (!this.ctx || this.muted || !Number.isFinite(distance) || distance >= 50 || distance < 0) return;
    const t = this.ctx.currentTime;
    if (t < this.nextProximityAt) return;
    this.nextProximityAt = t + 0.25 + Math.min(1, distance / 50) * 0.75;
    this.tone(distance < 28 ? 980 : 660, 0, 0.08, 0.05);
  }

  public playQuizAnswer(correct: boolean): void {
    if (correct) this.sequence(QUIZ_NOTES);
    else { this.tone(220, 0, 0.16); this.tone(164.81, 0.13, 0.24); }
  }

  public playQuizResult(passed: boolean): void {
    if (passed) this.sequence(SUCCESS_NOTES, 0.08, 0.28);
    else this.playQuizAnswer(false);
  }

  public playScannerPing(): void { this.sequence(SCANNER_NOTES, 0.04); }
  public playWaypointPass(): void { this.sequence(SUCCESS_NOTES, 0.045); }
  public playItemCollect(): void { this.tone(987.77); this.tone(1318.51, 0.07, 0.22); }
  public playWarning(): void { this.tone(980, 0, 0.12); this.tone(740, 0.08, 0.12); }
  public playDockSuccess(): void { this.sequence(VICTORY_NOTES, 0.12, 0.3); }
  public playRadioDispatch(): void { this.sequence(DISPATCH_NOTES, 0.05); }
  public playCollision(impactRatio = 0.5): void {
    const impact = Number.isFinite(impactRatio) ? Math.max(0, Math.min(1, impactRatio)) : 0.5;
    this.tone(140, 0, 0.12, 0.05 + impact * 0.05);
    this.tone(45, 0.08, 0.25, 0.08);
    this.playRcsBurst();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    // Master gain silences continuous channels AND already scheduled quiz/FX notes.
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.muted;
  }

  public getIsMuted(): boolean { return this.muted; }

  private stopSource(source: AudioScheduledSourceNode | null): void {
    // Also tolerate a partially initialized graph after device/setup failure.
    try { source?.stop(); source?.disconnect(); } catch { /* Already stopped or never started. */ }
  }

  /** Release sources/context on scene teardown; preserve the user's mute preference. */
  public dispose(): void {
    this.stopSource(this.hum);
    this.stopSource(this.noise);
    for (const voice of this.voices) this.stopSource(voice.oscillator);
    if (this.ctx) void this.ctx.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.hum = null;
    this.humGain = null;
    this.noise = null;
    this.rumble = null;
    this.burst = null;
    this.voices = [];
    this.throttle = -1;
    this.boosting = false;
    this.nextRcsAt = 0;
    this.nextProximityAt = 0;
  }
}

export const audioEngine = new AudioEngine();
