/** Capture actual app frames. Install Playwright externally; no app dependency needed. */
import { mkdir, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public/assets');
const frames = await mkdtemp(join(tmpdir(), 'cadet-preview-'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.getByRole('button', { name: 'Mute audio', exact: true }).waitFor();
  await page.getByRole('button', { name: '[X]', exact: true }).click();
  // Maintain a small pitch input so the automatic gyro quiz doesn't interrupt flight captures.
  await page.keyboard.down('r');
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  // Keep pitch held through the first part of the flight preview to avoid the quiz gate.
  await page.keyboard.down('Shift');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(output, 'telemetry-hud.png') });
  await page.keyboard.up('Shift');
  await page.keyboard.press('c');
  await page.keyboard.press('c');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(output, 'orbital-view.png') });
  await page.keyboard.press('c');
  // Sample real browser frames; the GIF is an accelerated, silent visual preview.
  const manifest = [];
  for (let i = 0; i < 72; i++) {
    if (i === 16) await page.keyboard.up('r');
    if (i === 12) await page.keyboard.down('Shift');
    if (i === 28) await page.keyboard.up('Shift');
    if (i === 32) await page.keyboard.press('Space');
    if (i === 40 || i === 48 || i === 60) await page.keyboard.press('c');
    if (i === 44) await page.keyboard.down('a');
    if (i === 48) await page.keyboard.up('a');
    const path = join(frames, `frame-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path });
    manifest.push(path);
    await page.waitForTimeout(100);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', '8', '-i', join(frames, 'frame-%03d.png'),
    '-filter_complex', 'scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer',
    '-loop', '0', join(output, 'demo-preview.gif')], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('ffmpeg GIF encoding failed');
  await writeFile(join(frames, 'frames.json'), JSON.stringify(manifest));
  console.log('Captured telemetry-hud.png, orbital-view.png, and 9-second demo-preview.gif.');
} finally {
  await browser.close();
  await rm(frames, { recursive: true, force: true });
}
