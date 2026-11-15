/** Preview links, native modal keyboard behavior, served assets and capture metadata. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const metadata = JSON.parse(await readFile(new URL('../public/assets/preview-metadata.json', import.meta.url), 'utf8'));
  for (const entry of metadata.screenshots) {
    const png = await readFile(new URL(`../public/assets/${entry.file}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), entry.width);
    assert.equal(png.readUInt32BE(20), entry.height);
  }
  const gifUrl = new URL('../public/assets/demo-preview.gif', import.meta.url);
  const gif = await readFile(gifUrl);
  assert.equal(gif.readUInt16LE(6), metadata.animation.width);
  assert.equal(gif.readUInt16LE(8), metadata.animation.height);
  const frames = Number(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', gifUrl.pathname], { encoding: 'utf8' }).trim());
  assert.equal(frames, metadata.animation.frames);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  for (const viewport of [{width:1920,height:1080},{width:390,height:844},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    for (const mode of ['Outpost Ops', 'Flight Academy']) {
      const trigger = page.getByRole('button', { name: `Simulation Preview: ${mode}`, exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: `${mode} Simulation Preview`, exact: true });
      await dialog.waitFor();
      await page.waitForFunction(() => [...document.querySelector('dialog[open]').querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0));
      assert.equal(await dialog.locator('img').count(), 2);
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      assert((await dialog.innerText()).includes(mode === 'Outpost Ops' ? '14 Earth days' : '10 active flight seconds'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    }
  }
  await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
  await page.getByRole('button', { name: 'Simulation Preview: Outpost Ops', exact: true }).click();
  await page.getByRole('dialog', { name: 'Outpost Ops Simulation Preview', exact: true }).getByRole('button', { name: 'CLOSE', exact: true }).click();
  await page.getByRole('button', { name: 'BACK TO TITLE', exact: true }).click();
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.getByRole('button', { name: /^PAUSE/ }).click();
  await page.getByRole('dialog', { name: 'Flight paused', exact: true }).getByRole('button', { name: 'Simulation Preview: Flight Academy', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Flight Academy Simulation Preview', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('dialog', { name: 'Flight paused', exact: true }).waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  console.log(`PASS: ${metadata.screenshots.length} PNG dimensions and ${frames}-frame GIF match metadata; lobby/setup/pause preview dialogs, images, keyboard focus and responsive bounds pass.`);
} finally { await browser.close(); }
