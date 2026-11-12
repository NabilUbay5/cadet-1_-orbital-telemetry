/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // 8-bit Continuous Engine Channels
  private thrusterOsc: OscillatorNode | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterNoiseGain: GainNode | null = null;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      // AudioContext unavailable
    }
  }

  public ensureRunning() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.isInitialized && this.ctx) {
      this.setupChiptuneEngines();
      this.isInitialized = true;
    }
  }

  /**
   * Continuous 8-bit pulse & noise engine
   */
  private setupChiptuneEngines() {
    if (!this.ctx) return;

    try {
      // Channel 1: 8-bit Square Pulse for engine hum
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start();

      this.thrusterOsc = osc;
      this.thrusterGain = oscGain;

      // Channel 2: Lo-Fi 8-Bit Stepped Noise for thruster rumble
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      // Quantized 4-bit amplitude noise steps
      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        if (i % 6 === 0) {
          // Downsample / bitcrush step
          const raw = Math.random() * 2 - 1;
          lastVal = Math.round(raw * 4) / 4;
        }
        data[i] = lastVal;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noiseSource.start();

      this.thrusterNoiseGain = noiseGain;
    } catch {
      // Audio engine setup fallback
    }
  }

  public setThruster(throttle: number, isBoosting: boolean) {
    if (!this.ctx || !this.thrusterGain || !this.thrusterOsc || !this.thrusterNoiseGain) return;
    if (this.isMuted) {
      this.thrusterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.thrusterNoiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }

    const t = this.ctx.currentTime;
    const boostMult = isBoosting ? 1.8 : 1.0;
    // 8-bit stepped frequencies (musical notes rather than continuous glide)
    const baseFreq = 48 + Math.floor(throttle * 40 * boostMult);
    const targetGain = throttle > 0.02 ? Math.min(0.18, 0.03 + throttle * 0.12 * (isBoosting ? 1.3 : 1.0)) : 0;
    const noiseGain = throttle > 0.02 ? Math.min(0.12, 0.02 + throttle * 0.08 * (isBoosting ? 1.5 : 1.0)) : 0;

    this.thrusterOsc.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.thrusterGain.gain.setTargetAtTime(targetGain, t, 0.04);
    this.thrusterNoiseGain.gain.setTargetAtTime(noiseGain, t, 0.04);
  }

  /**
   * 8-Bit White Noise Pulse for RCS Micro-Thrusters
   */
  public playRcsBurst() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const sampleCount = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let val = 0;
      for (let i = 0; i < sampleCount; i++) {
        if (i % 4 === 0) {
          val = (Math.random() > 0.5 ? 1 : -1) * (1 - i / sampleCount);
        }
        data[i] = val;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Crystal Scanner Ping (Arpeggiated high square wave)
   */
  public playScannerPing() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      const notes = [880, 1174.66, 1760]; // A5 -> D6 -> A6 arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.04);

        gain.gain.setValueAtTime(0.12, t + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + i * 0.04);
        osc.stop(t + i * 0.04 + 0.2);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Triumphant Waypoint Vector Chime (Classic NES Major triad arpeggio)
   */
  public playWaypointPass() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      // C6 -> E6 -> G6 -> C7 fast 8-bit flourish
      const notes = [1046.5, 1318.51, 1567.98, 2093.0];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.045);

        gain.gain.setValueAtTime(0.14, t + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.045 + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + i * 0.045);
        osc.stop(t + i * 0.045 + 0.24);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Item Pickup Coin Chime
   */
  public playItemCollect() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      // Classic B5 -> E6 two-note coin chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Asteroid Collision (Bit-crushed LFSR noise burst + square down-pitch)
   */
  public playCollision(impactRatio: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;

      // 1. Bitcrushed Low Square drop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.setValueAtTime(90, t + 0.05);
      osc.frequency.setValueAtTime(45, t + 0.12);

      oscGain.gain.setValueAtTime(0.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);

      // 2. 8-bit Noise Explosion burst
      const sampleCount = Math.floor(this.ctx.sampleRate * 0.22);
      const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let val = 0;
      for (let i = 0; i < sampleCount; i++) {
        if (i % 8 === 0) {
          val = (Math.random() * 2 - 1) * (1 - i / sampleCount);
        }
        data[i] = val;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = this.ctx.createGain();
      const vol = Math.min(0.35, 0.15 + impactRatio * 0.2);
      noiseGain.gain.setValueAtTime(vol, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Alternating Hazard Alarm
   */
  public playWarning() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.setValueAtTime(740, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Docking Success / Victory Chiptune Fanfare
   */
  public playDockSuccess() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      // Classic victory sequence: G4 -> C5 -> E5 -> G5 -> C6 held!
      const melody = [
        { freq: 392.0, time: 0.0, dur: 0.1 },
        { freq: 523.25, time: 0.1, dur: 0.1 },
        { freq: 659.25, time: 0.2, dur: 0.1 },
        { freq: 783.99, time: 0.3, dur: 0.15 },
        { freq: 1046.5, time: 0.48, dur: 0.6 },
      ];

      melody.forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(note.freq, t + note.time);

        gain.gain.setValueAtTime(0.18, t + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.time + note.dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + note.time);
        osc.stop(t + note.time + note.dur + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * 8-Bit Radio Dispatch / Mission Announcement Chirp
   */
  public playRadioDispatch() {
    if (!this.ctx || this.isMuted) return;
    this.ensureRunning();

    try {
      const t = this.ctx.currentTime;
      // High-pitched 8-bit teletype / radio chirp (G5 -> C6 -> E6 fast)
      [783.99, 1046.5, 1318.51].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.05);

        gain.gain.setValueAtTime(0.12, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.18);
      });
    } catch {
      // Audio fallback
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.thrusterGain && this.thrusterNoiseGain && this.ctx) {
      this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.thrusterNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
