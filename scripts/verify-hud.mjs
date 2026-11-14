/** Optional browser smoke: real HUD/downloads; terminal screens use controlled engine transitions. */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  // Capture the actual app engine without adding a test hook to production code.
  await page.evaluate(async () => {
    const { FlightEngine } = await import('/src/game/flightEngine.ts');
    const reset = FlightEngine.prototype.resetSimulation;
    FlightEngine.prototype.resetSimulation = function () {
      window.__hudTestEngine = this;
      return reset.call(this);
    };
  });
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.keyboard.down('r'); // Keep the automatic Stage 1 quiz from interrupting layout checks.
  await page.getByRole('button', { name: '[X]', exact: true }).click();
  await page.getByRole('region', { name: 'NASA orbital reference', exact: true }).waitFor();
  const firstEpoch = await page.getByTestId('nasa-epoch').innerText();
  await page.waitForFunction(first => document.querySelector('[data-testid="nasa-epoch"]')?.textContent !== first, firstEpoch);

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const container = document.querySelector('[data-testid="flight-canvas"]');
      const canvas = container?.querySelector('canvas');
      return canvas?.width === Math.max(280, Math.floor(container.clientWidth / 3))
        && canvas?.height === Math.max(180, Math.floor(container.clientHeight / 3));
    });
    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="flight-canvas"] canvas');
      return {
        rendering: getComputedStyle(canvas).imageRendering,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        wings: [...document.querySelectorAll('.hud-wing')].map(wing => ({
          width: wing.clientWidth, scrollWidth: wing.scrollWidth,
          left: wing.getBoundingClientRect().left, right: wing.getBoundingClientRect().right,
        })),
      };
    });
    assert.equal(layout.rendering, 'pixelated');
    assert.equal(layout.pageOverflow, false);
    for (const wing of layout.wings) {
      assert(wing.left >= 0 && wing.right <= viewport.width, `Wing outside viewport: ${JSON.stringify({ viewport, wing })}`);
      assert(wing.scrollWidth <= wing.width + 1, `Wing content overflow: ${JSON.stringify({ viewport, wing })}`);
    }
    console.log('Canvas and wings:', viewport, layout);
    if (process.env.HUD_SCREENSHOT_DIR) {
      await mkdir(process.env.HUD_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: `${process.env.HUD_SCREENSHOT_DIR}/hud-${viewport.width}x${viewport.height}.png` });
    }
  }
  await page.waitForFunction(() => window.__hudTestEngine.metSeconds >= 1.1, null, { timeout: 60000 });
  await page.keyboard.up('r');
  await page.getByRole('button', { name: /^PAUSE/ }).click();
  const exportLog = async label => {
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: 'Export Flight Log', exact: true }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^cadet1-flight-log-.*\.json$/);
    const log = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(log.schemaVersion, 1);
    assert(log.samples.length > 0 && log.samples.length <= log.capacity);
    assert.equal(log.nasaReference.frame, 'ICRF equatorial');
    assert(log.samples[0].nasaReference.distanceKm > 350000);
    console.log(`${label} export: ${log.samples.length} samples with NASA provenance`);
    return log;
  };
  await page.getByRole('dialog', { name: 'Flight paused', exact: true }).waitFor();
  const pausedLog = await exportLog('Pause');
  assert(pausedLog.samples.length >= 2, 'The live engine must record across simulation seconds');
  await page.getByRole('button', { name: 'CONTINUE [ESC]', exact: true }).click();
  await page.evaluate(() => window.__hudTestEngine.triggerVictoryFinal());
  await page.getByRole('dialog', { name: 'Mission complete', exact: true }).waitFor();
  await exportLog('Victory (controlled transition)');
  // After restart, prior flight readings must not leak into the new log.
  await page.getByRole('button', { name: /NEXT CYCLE/ }).click();
  await page.keyboard.press('p');
  const restarted = await exportLog('Restart');
  assert(restarted.samples.every(sample => sample.metSeconds < 1));
  await page.evaluate(() => window.__hudTestEngine.triggerDefeat('HUD smoke test'));
  await page.getByRole('dialog', { name: 'Mission ended', exact: true }).waitFor();
  await exportLog('Defeat (controlled transition)');
  assert.deepEqual(errors, []);
  console.log('NASA replay, responsive HUD, one-third canvas, all modal exports, and log reset passed.');
} finally {
  await browser.close();
}
