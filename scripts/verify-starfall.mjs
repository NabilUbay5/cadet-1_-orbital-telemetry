/** Actual engine integration/WebGL smoke; uses controlled fixed steps, not a full mission run. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  let engineUrl;
  page.on('request', request => { if (new URL(request.url()).pathname === '/src/game/flightEngine.ts') engineUrl = request.url(); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  assert(engineUrl, 'Use the Vite dev server for engine instrumentation');
  await page.evaluate(async url => {
    const { FlightEngine } = await import(url);
    const reset = FlightEngine.prototype.resetSimulation;
    FlightEngine.prototype.resetSimulation = function () { window.__starfallEngine = this; return reset.call(this); };
  }, engineUrl);
  await page.getByRole('button', { name: /FLIGHT ACADEMY/ }).click();
  const timing = await page.evaluate(() => {
    const e = window.__starfallEngine;
    e.resetSimulation(); e.stage = 2; // Keep the certification gate out of a visual-effect test.
    e.throttle = 0; e.velocity.set(0, 0, 0);
    for (let i = 0; i < 599; i++) e.updateSimulation(1 / 60);
    e.render();
    const before = e.starfall.mesh.visible;
    const met = e.metSeconds;
    e.setGameState('PAUSED');
    for (let i = 0; i < 180; i++) e.updateSimulation(1 / 60);
    e.render();
    const pausedMet = e.metSeconds;
    const paused = e.starfall.mesh.visible;
    e.setGameState('PLAYING');
    e.updateSimulation(1 / 60);
    for (let i = 0; i < 20; i++) e.updateSimulation(1 / 60);
    e.setGameState('PAUSED'); e.render();
    return { before, met, pausedMet, paused, spawned: e.starfall.mesh.visible, opacity: e.starfall.mesh.material.uniforms.opacity.value };
  });
  assert.equal(timing.before, false);
  assert.equal(timing.met, timing.pausedMet);
  assert.equal(timing.paused, false);
  assert.equal(timing.spawned, true);
  assert(timing.opacity > 0);

  for (const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const container = document.querySelector('[data-testid="flight-canvas"]');
      const canvas = container?.querySelector('canvas');
      return canvas?.width === Math.max(280, Math.floor(container.clientWidth / 3))
        && canvas?.height === Math.max(180, Math.floor(container.clientHeight / 3));
    });
    for (const mode of ['CHASE', 'COCKPIT', 'ORBIT']) {
      const bounds = await page.evaluate(mode => {
        const e = window.__starfallEngine;
        e.setCameraMode(mode);
        e.orientation.setFromAxisAngle(e._tmpVec.set(0, 1, 0), Math.PI * 0.75);
        for (let i = 0; i < 30; i++) e.updateCamera(1 / 60);
        e.render();
        const mesh = e.starfall.mesh;
        const attribute = mesh.geometry.getAttribute('position');
        const p = e._tmpVec;
        let maxX = 0, maxY = 0;
        for (let i = 0; i < attribute.count; i++) {
          p.fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrix).project(e.camera);
          maxX = Math.max(maxX, Math.abs(p.x)); maxY = Math.max(maxY, Math.abs(p.y));
        }
        return { visible: mesh.visible, maxX, maxY, width: e.renderer.domElement.width, height: e.renderer.domElement.height };
      }, mode);
      assert(bounds.visible && bounds.maxX < 1 && bounds.maxY < 1, `${mode}: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.width, Math.max(280, Math.floor(viewport.width / 3)));
      assert.equal(bounds.height, Math.max(180, Math.floor(viewport.height / 3)));
      if (process.env.STARFALL_SCREENSHOT_DIR && viewport.width === 1280) {
        await mkdir(process.env.STARFALL_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.STARFALL_SCREENSHOT_DIR}/starfall-${mode.toLowerCase()}.png` });
      }
    }
  }
  const expiry = await page.evaluate(() => {
    const e = window.__starfallEngine;
    const positions = e.starfall.mesh.geometry.getAttribute('position').array;
    const material = e.starfall.mesh.material;
    e.setGameState('PLAYING');
    for (let i = 0; i < 100; i++) e.updateSimulation(1 / 60);
    e.setGameState('PAUSED'); e.render();
    const expired = !e.starfall.mesh.visible;
    e.resetSimulation(); e.stage = 2;
    e.setGameState('PAUSED'); e.render();
    return { expired, resetHidden: !e.starfall.mesh.visible, resetMet: e.metSeconds,
      reused: positions === e.starfall.mesh.geometry.getAttribute('position').array && material === e.starfall.mesh.material };
  });
  assert.deepEqual(expiry, { expired: true, resetHidden: true, resetMet: 0, reused: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.__starfallEngine.starfall.reducedMotion);
  const reduced = await page.evaluate(() => {
    const e = window.__starfallEngine;
    e.setGameState('PLAYING');
    for (let i = 0; i < 620; i++) e.updateSimulation(1 / 60);
    e.setGameState('PAUSED'); e.render();
    return e.starfall.mesh.visible;
  });
  assert.equal(reduced, false);
  assert.deepEqual(errors, []);
  console.log('PASS: actual engine 10-second MET timing, pause/reset, expiry, pooled reuse, all camera modes at four viewports, reduced motion and shader compilation.');
} finally { await browser.close(); }
