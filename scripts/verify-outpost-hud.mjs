/** Optional real-browser checks for Outpost command, comms, audio and responsive layout. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  let audioUrl;
  page.on('request', request => { if (new URL(request.url()).pathname === '/src/game/audioEngine.ts') audioUrl = request.url(); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  assert(audioUrl, 'Use the Vite dev server for audio instrumentation');
  await page.evaluate(async url => {
    const { audioEngine } = await import(url);
    window.__outpostAudio = audioEngine;
    window.__outpostCues = { incoming: 0, ticks: 0, clicks: 0 };
    for (const [method, key] of [['playCommsIncoming', 'incoming'], ['playTelemetryTick', 'ticks'], ['playUiClick', 'clicks']]) {
      const original = audioEngine[method].bind(audioEngine);
      audioEngine[method] = (...args) => { window.__outpostCues[key]++; return original(...args); };
    }
  }, audioUrl);
  await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
  await page.getByRole('button', { name: 'START MISSION', exact: true }).click();
  await page.getByRole('button', { name: 'Show full transmission', exact: true }).waitFor();
  await page.waitForFunction(() => window.__outpostCues.ticks > 0);
  assert.equal(await page.evaluate(() => window.__outpostCues.incoming), 1);
  await page.getByRole('button', { name: 'Show full transmission', exact: true }).click();
  assert.match(await page.locator('.outpost-comms-text').innerText(), /Build a greenhouse/);
  assert.equal(await page.locator('.outpost-drawer[open]').count(), 0);
  for (const title of ['SUNLIGHT AT YOUR SITE', 'POWER BUDGET', 'MISSION LOG']) {
    const drawer = page.locator('.outpost-drawer').filter({ hasText: title });
    await drawer.locator('summary').click();
    assert.equal(await drawer.evaluate(el => el.open), true);
    await drawer.locator('summary').press('Enter');
    assert.equal(await drawer.evaluate(el => el.open), false);
  }
  await page.getByRole('button', { name: 'Dismiss transmission' }).click();
  await page.getByRole('button', { name: 'More Farming blocks' }).click();
  assert.equal(await page.locator('.outpost-comms').count(), 0, 'Schedule edits should not repeat the same guidance');
  await page.getByRole('button', { name: /LAST TRANSMISSION/ }).click();
  assert.equal(await page.evaluate(() => window.__outpostCues.incoming), 1, 'Recall should be silent');
  const mute = page.getByRole('button', { name: 'Mute outpost audio' });
  await mute.click();
  assert.equal(await mute.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__outpostAudio.getIsMuted()), true);
  assert.equal(await page.evaluate(() => window.__outpostAudio.master.gain.value), 0);
  await mute.click();
  assert.equal(await page.evaluate(() => window.__outpostAudio.getIsMuted()), false);
  await page.getByRole('button', { name: 'BUILD', exact: true }).click();
  await page.locator('div.border').filter({ has: page.getByText('Greenhouse', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'BUILD 5', exact: true }) }).last().getByRole('button', { name: 'BUILD 5', exact: true }).click();
  await page.getByRole('button', { name: 'CREW SCHEDULE', exact: true }).click();
  await page.getByRole('button', { name: 'RUN DAY 1', exact: true }).click();
  await page.getByRole('button', { name: 'RUN DAY 2', exact: true }).click();
  await page.getByRole('button', { name: 'BUILD', exact: true }).click();
  await page.locator('div.border').filter({ has: page.getByText('Fission reactor', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'BUILD 8', exact: true }) }).last().getByRole('button', { name: 'BUILD 8', exact: true }).click();
  await page.getByRole('button', { name: /BRIEFING COMPLETE/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /BRIEFING COMPLETE/ }).getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: 'CREW SCHEDULE', exact: true }).click();
  for (const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844},{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('.outpost-ui').evaluate(el => el.scrollWidth > el.clientWidth), false, `Overflow at ${viewport.width}`);
    const button = page.getByRole('button', { name: 'RUN DAY 3', exact: true });
    await button.scrollIntoViewIfNeeded();
    assert.notEqual(await button.evaluate(el => getComputedStyle(el).clipPath), 'none');
    await page.locator('.outpost-ui').evaluate(el => { el.scrollTop = 0; });
    if (process.env.OUTPOST_SCREENSHOT_DIR) {
      await mkdir(process.env.OUTPOST_SCREENSHOT_DIR, {recursive:true});
      await page.screenshot({path:`${process.env.OUTPOST_SCREENSHOT_DIR}/outpost-${viewport.width}.png`});
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'RUN DAY 3', exact: true }).click();
  await page.getByRole('button', { name: 'Flight Director message', exact: true }).waitFor();
  assert.equal(await page.locator('.outpost-comms').evaluate(el => getComputedStyle(el).animationName), 'none');
  const cues = await page.evaluate(() => window.__outpostCues);
  assert(cues.clicks > 10);
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  const stoppedAt = await page.evaluate(() => window.__outpostCues.ticks);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__outpostCues.ticks), stoppedAt);
  assert.deepEqual(errors, []);
  console.log('PASS: drawers, skip/recall, shared mute, schedule/build/run, auto-collapsed briefing, five viewports, reduced motion, and comms cleanup.', cues);
} finally { await browser.close(); }
