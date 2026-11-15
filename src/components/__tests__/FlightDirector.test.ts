import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { FlightDirector } from '../FlightDirector.tsx';
import { audioEngine } from '../../game/audioEngine.ts';

let dom: JSDOM;
let root: Root;
let intervals: Map<number, () => void>;
let timeouts: Map<number, () => void>;
let reduced = false;
let incoming: ReturnType<typeof spyOn>;
let ticks: ReturnType<typeof spyOn>;

beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>');
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  intervals = new Map(); timeouts = new Map(); reduced = false;
  let id = 0;
  dom.window.setInterval = ((callback: () => void) => { intervals.set(++id, callback); return id; }) as typeof dom.window.setInterval;
  dom.window.clearInterval = (timer) => { if (timer !== undefined) intervals.delete(timer); };
  dom.window.setTimeout = ((callback: () => void) => { timeouts.set(++id, callback); return id; }) as typeof dom.window.setTimeout;
  dom.window.clearTimeout = (timer) => { if (timer !== undefined) timeouts.delete(timer); };
  Object.defineProperty(dom.window, 'matchMedia', { value: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }) });
  incoming = spyOn(audioEngine, 'playCommsIncoming').mockImplementation(() => {});
  ticks = spyOn(audioEngine, 'playTelemetryTick').mockImplementation(() => {});
  root = createRoot(document.getElementById('root')!);
});
afterEach(() => {
  act(() => root.unmount());
  incoming.mockRestore(); ticks.mockRestore(); dom.window.close();
});
const first = { id: 'day1', text: 'Welcome Commander. Build a greenhouse.', urgent: false };
const render = (message = first, suspended = false) => act(() => root.render(React.createElement(FlightDirector, { message, suspended })));
const click = (selector: string) => act(() => (document.querySelector(selector) as HTMLButtonElement).click());

test('types, skips, expires and recalls without replaying the incoming alert', () => {
  render();
  expect(incoming).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[role="status"]')?.textContent).toBe(first.text);
  act(() => { for (const callback of intervals.values()) callback(); });
  expect(document.querySelector('.outpost-comms-text')?.textContent).toStartWith('Wel');
  expect(ticks).toHaveBeenCalledTimes(1);
  click('[aria-label="Show full transmission"]');
  expect(intervals.size).toBe(0);
  expect(document.querySelector('.outpost-comms-text')?.textContent).toContain(first.text);
  act(() => { for (const callback of [...timeouts.values()]) callback(); });
  expect(document.querySelector('.outpost-comms')).toBeNull();
  click('.outpost-comms-recall');
  expect(document.querySelector('.outpost-comms-text')?.textContent).toContain(first.text);
  expect(incoming).toHaveBeenCalledTimes(1);
});

test('same event keeps its text; a new event interrupts and unmount cancels timers', () => {
  render();
  click('[aria-label="Show full transmission"]');
  render({ ...first, text: 'Numeric forecast changed.' });
  expect(document.querySelector('.outpost-comms-text')?.textContent).toContain(first.text);
  expect(incoming).toHaveBeenCalledTimes(1);
  render({ id: 'day2', text: 'Night begins. Protect life support.', urgent: true });
  expect(incoming).toHaveBeenCalledTimes(2);
  expect(document.querySelector('.outpost-comms-warning')).not.toBeNull();
  expect(intervals.size).toBe(1);
  act(() => root.unmount());
  expect(intervals.size).toBe(0); expect(timeouts.size).toBe(0);
  root = createRoot(document.getElementById('root')!);
});

test('modal suspension delays alerts and reduced motion reveals text without ticks', () => {
  reduced = true;
  render(first, true);
  expect(incoming).not.toHaveBeenCalled();
  expect(intervals.size).toBe(0);
  render({ id: 'day3', text: 'Supply drone has landed.', urgent: false });
  expect(incoming).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.outpost-comms-text')?.textContent).toContain('Supply drone has landed.');
  expect(intervals.size).toBe(0);
  expect(ticks).not.toHaveBeenCalled();
});
