/** Verify the supplied font actually renders, is self-hosted, and ships with its notices. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const appUrl = process.env.APP_URL || 'http://127.0.0.1:4173';
  const errors = [];
  const external = [];
  const capture = async name => {
    if (!process.env.FONT_SCREENSHOT_DIR) return;
    await mkdir(process.env.FONT_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.FONT_SCREENSHOT_DIR}/${name}.png` });
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === new URL(appUrl).origin) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  await page.addInitScript(() => {
    window.__canvasFonts = new Set();
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      window.__canvasFonts.add(this.font);
      return fillText.apply(this, args);
    };
  });
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /OUTPOST OPS/ }).waitFor();
  assert(await page.evaluate(async () => {
    const faces = await document.fonts.load('16px "Determination"');
    await document.fonts.ready;
    return faces.some(face => face.family.replace(/["']/g, '') === 'Determination' && face.status === 'loaded');
  }), 'Determination must load successfully through @font-face');

  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const checkRenderedFont = async selector => {
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    assert(nodeId, `${selector} must exist`);
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    assert(fonts.some(font => font.isCustomFont && font.familyName === 'Determination' && font.glyphCount > 0),
      `Expected actual Determination glyphs for ${selector}: ${JSON.stringify(fonts)}`);
  };
  await checkRenderedFont('h1');
  await checkRenderedFont('button');
  assert.match(await page.locator('body').evaluate(body => getComputedStyle(body).fontFamily), /Determination/);
  await capture('title');

  const fontRoot = new URL('./fonts/determination/', page.url());
  for (const file of ['determination.ttf', 'license.txt', 'readme.txt']) {
    const response = await context.request.get(new URL(file, fontRoot).href);
    assert.equal(response.status(), 200, `${file} must be served under the app's base path`);
    const expected = await readFile(new URL(`../public/fonts/determination/${file}`, import.meta.url));
    const actual = await response.body();
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash(actual), hash(expected), `${file} must be distributed unchanged`);
  }
  const fontRequests = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(entry => new URL(entry.name).pathname.endsWith('/fonts/determination/determination.ttf')).map(entry => entry.name));
  assert(fontRequests.includes(new URL('determination.ttf', fontRoot).href), 'The page must request the local font under its base path');

  // A loaded app can enter either mode without a remote font request or network.
  await context.setOffline(true);
  await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
  await checkRenderedFont('.font-telemetry');
  await page.getByRole('button', { name: 'START MISSION', exact: true }).click();
  await page.waitForFunction(() => window.__canvasFonts.size > 0);
  assert((await page.evaluate(() => [...window.__canvasFonts])).every(font => font.includes('Determination')),
    'Outpost canvas text must use the same loaded family');
  await capture('outpost');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.getByTestId('nasa-range').waitFor();
  await checkRenderedFont('.hud-header span:nth-child(2)'); // The rendered MET label, not a textless container.
  await checkRenderedFont('[data-testid="nasa-range"]');
  await capture('hud');
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log('PASS: Determination renders title/buttons, telemetry and HUD; canvas uses the loaded face.');
  console.log(`PASS: font and notices match source bytes at ${fontRoot.href}; both modes work disconnected.`);
} finally { await browser.close(); }
