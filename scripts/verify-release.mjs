/** Production smoke: local assets only, then replay and JSON export fully disconnected. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(`${message.text()} (${message.location().url})`); });
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === new URL(appUrl).origin) return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  // A fresh context has no cached app assets: only the local static server is allowed.
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /PRESS START/ }).waitFor();
  await context.setOffline(true);
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.keyboard.down('r'); // Avoid the automatic quiz gate while sampling flight.
  const initialEpoch = await page.getByTestId('nasa-epoch').innerText();
  await page.waitForFunction(first => document.querySelector('[data-testid="nasa-epoch"]')?.textContent !== first, initialEpoch);
  await page.getByRole('button', { name: /^PAUSE/ }).click();
  await page.keyboard.up('r');
  await page.getByRole('dialog', { name: 'Flight paused' }).waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Flight Log', exact: true }).click(),
  ]);
  assert.match(download.suggestedFilename(), /^cadet1-flight-log-.*\.json$/);
  const log = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(log.schemaVersion, 1);
  assert.equal(log.nasaReference.frame, 'ICRF equatorial');
  assert.equal(new URL(log.nasaReference.queryUrl).hostname, 'ssd.jpl.nasa.gov');
  assert(log.samples.length > 0 && log.samples.length <= log.capacity);
  assert(log.samples.at(-1).metSeconds > 0);
  assert(log.samples.every(sample => Number.isFinite(sample.nasaReference?.distanceKm)
    && sample.nasaReference.distanceKm > 350000 && sample.nasaReference.distanceKm < 410000));
  await page.getByRole('button', { name: 'EXIT TO LOBBY', exact: true }).click();
  await page.getByRole('button', { name: 'CREDITS & SOURCES', exact: true }).click();
  await page.getByRole('dialog', { name: 'CREDITS & SOURCES', exact: true }).getByText('Research or Information Gathering', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  for (const destination of ['THE MOON', 'MARS']) {
    await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
    await page.getByText(/1\.37 mSv per game day \(unverified input\)/).waitFor();
    await page.getByText(/0\.64 mSv per sol \(unverified input\)/).waitFor();
    await page.getByRole('button').filter({ has: page.getByText(destination, { exact: true }) }).click();
    await page.getByRole('button', { name: 'START MISSION', exact: true }).click();
    await page.getByText('SUNLIGHT AT YOUR SITE', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  }
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(errors, []);
  console.log('PASS: fresh production load from local server without external requests;');
  console.log('disconnected NASA replay, real flight-log download with provenance, and Moon/Mars Outpost Ops with bundled credits.');
  console.log('Scope: local serving supports offline launch; remote-site offline reload requires an app cache, which is not provided.');
} finally {
  await browser.close();
}
