import { describe, expect, test } from 'bun:test';
import { AudioEngine } from '../audioEngine.ts';

// Minimal graph double: records node creation and automation without requiring a DOM.
function contextDouble() {
  const parameter = () => ({
    value: 0, events: [] as number[],
    setValueAtTime(value: number) { this.events.push(value); },
    setTargetAtTime(value: number) { this.events.push(value); },
    linearRampToValueAtTime(value: number) { this.events.push(value); },
    exponentialRampToValueAtTime(value: number) { this.events.push(value); },
    cancelScheduledValues() {},
  });
  let stopped = 0;
  let closed = 0;
  let buffers = 0;
  const gains: ReturnType<typeof parameter>[] = [];
  const oscillators: ReturnType<typeof parameter>[] = [];
  const ctx = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: {},
    createGain() { const gain = parameter(); gains.push(gain); return { gain, connect() {} }; },
    createOscillator() {
      const frequency = parameter(); oscillators.push(frequency);
      return { frequency, type: '', connect() {}, start() {}, stop() { stopped++; } };
    },
    createBuffer(_channels: number, length: number) {
      buffers++; return { getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      return { buffer: null, loop: false, connect() {}, start() {}, stop() { stopped++; } };
    },
    createBiquadFilter() { return { type: '', frequency: parameter(), connect() {} }; },
    close() { closed++; return Promise.resolve(); },
    resume() { return Promise.resolve(); },
  };
  return { ctx, gains, oscillators, counts: () => ({ stopped, closed, buffers }) };
}

describe('procedural audio lifecycle', () => {
  test('unlocks lazily and reuses sources through thrust, boost, RCS and quiz cues', () => {
    const graph = contextDouble();
    let contexts = 0;
    const audio = new AudioEngine(() => { contexts++; return graph.ctx as unknown as AudioContext; });
    audio.setThruster(1, true);
    expect(contexts).toBe(0);
    audio.ensureRunning();
    audio.ensureRunning();
    expect(contexts).toBe(1);
    const initialNodes = graph.oscillators.length;
    audio.setThruster(0.5, false);
    audio.setThruster(1, true);
    const notesAfterIgnition = graph.oscillators.reduce((n, p) => n + p.events.length, 0);
    audio.setThruster(1, true);
    expect(graph.oscillators.reduce((n, p) => n + p.events.length, 0)).toBe(notesAfterIgnition);
    audio.playRcsBurst();
    audio.playQuizAnswer(true);
    audio.playQuizAnswer(false);
    audio.playQuizResult(true);
    audio.updateProximity(20);
    expect(graph.oscillators.length).toBe(initialNodes);
    expect(graph.counts().buffers).toBe(1);
    audio.dispose();
    expect(graph.counts().stopped).toBe(initialNodes + 1);
    expect(graph.counts().closed).toBe(1);
    audio.dispose();
    expect(graph.counts().closed).toBe(1);
  });

  test('master mute silences every channel, persists across teardown, and blocks new cues', () => {
    const graph = contextDouble();
    const audio = new AudioEngine(() => graph.ctx as unknown as AudioContext);
    audio.ensureRunning();
    audio.playQuizResult(true);
    expect(audio.toggleMute()).toBe(true);
    expect(graph.gains[0].events.at(-1)).toBe(0);
    const noteCount = graph.oscillators.reduce((n, p) => n + p.events.length, 0);
    audio.playQuizResult(false);
    expect(graph.oscillators.reduce((n, p) => n + p.events.length, 0)).toBe(noteCount);
    expect(audio.toggleMute()).toBe(false);
    expect(graph.gains[0].events.at(-1)).toBeGreaterThan(0);
    audio.toggleMute();
    const gainCount = graph.gains.length;
    audio.dispose();
    audio.ensureRunning();
    expect(graph.gains[gainCount].value).toBe(0); // New master starts muted.
    expect(audio.getIsMuted()).toBe(true);
    audio.dispose();
  });

  test('missing Web Audio is nonfatal and allows a later retry', () => {
    let attempts = 0;
    const audio = new AudioEngine(() => { attempts++; throw new Error('unsupported'); });
    expect(() => audio.ensureRunning()).not.toThrow();
    expect(() => audio.setThruster(1, true)).not.toThrow();
    audio.ensureRunning();
    expect(attempts).toBe(2);
  });
});
