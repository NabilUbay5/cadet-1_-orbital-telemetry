/** Real app captures. Read-only engine instrumentation waits for natural starfall; quiz entry is controlled. */
import { mkdir, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public/assets');
const frames = await mkdtemp(join(tmpdir(), 'cadet-preview-'));
const appUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const testCount = Number(process.env.PREVIEW_TEST_COUNT);
if (!Number.isInteger(testCount) || testCount < 1) throw new Error('Set PREVIEW_TEST_COUNT to the freshly verified bun test pass count.');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);
  const errors = [], captured = [];
  let engineUrl;
  page.on('request', request => { if (new URL(request.url()).pathname === '/src/game/flightEngine.ts') engineUrl = request.url(); });
  const monitor = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  };
  monitor(page);
  const save = async (page, file, description) => {
    await page.screenshot({ path: join(output, file) });
    captured.push({ file, ...page.viewportSize(), description });
  };
  let frame = 0;
  const sample = async count => {
    for (let i = 0; i < count; i++) {
      await page.screenshot({ path: join(frames, `frame-${String(frame++).padStart(3, '0')}.png`) });
      await page.waitForTimeout(100);
    }
  };
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await save(page, 'lobby-preview.png', 'Lobby: main Outpost mode, Flight Academy bonus, shared preview links and Determination typography.');
  for (const destination of ['THE MOON', 'MARS']) {
    await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
    await page.getByRole('button').filter({ has: page.getByText(destination, { exact: true }) }).click();
    await page.getByRole('button', { name: 'START MISSION', exact: true }).click();
    await page.getByRole('button', { name: 'Show full transmission', exact: true }).click();
    await page.getByRole('button', { name: destination === 'MARS' ? 'RUN SOL 1' : 'RUN DAY 1', exact: true }).waitFor();
    await save(page, destination === 'MARS' ? 'outpost-mars.png' : 'outpost-moon.png', `${destination}: day/sol 1, tactical HUD, collapsed drawers and revealed Flight Director transmission.`);
    await sample(24);
    await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  }
  if (!engineUrl) throw new Error('Use the Vite dev server for natural starfall observation.');
  await page.evaluate(async url => {
    const { FlightEngine } = await import(url);
    const reset = FlightEngine.prototype.resetSimulation;
    FlightEngine.prototype.resetSimulation = function () { window.__previewEngine = this; return reset.call(this); };
  }, engineUrl);
  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.getByRole('button', { name: '[X]', exact: true }).click();
  // Initial tilt keeps the quiz locked. Wait for a real 10-second MET spawn; never move its timer.
  await page.waitForFunction(() => {
    const effect = window.__previewEngine.starfall;
    return effect.mesh.visible && effect.age / effect.duration > 0.4 && effect.age / effect.duration < 0.7;
  }, null, { timeout: 60000 });
  await save(page, 'telemetry-hud.png', 'Desktop Flight Academy: full NASA reference HUD, RP/pods, lives and naturally triggered starfall.');
  await sample(24);
  await page.keyboard.press('c'); await page.keyboard.press('c');
  await page.waitForTimeout(300);
  await save(page, 'orbital-view.png', 'Orbit camera: current spacecraft, planetary limb and full flight HUD.');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  monitor(mobile);
  await mobile.goto(appUrl, { waitUntil: 'networkidle' });
  await mobile.evaluate(() => document.fonts.ready);
  await mobile.getByRole('button', { name: /PRESS START/ }).click();
  await mobile.getByTestId('hud-mini-status').waitFor({ state: 'visible' });
  await save(mobile, 'academy-mobile-portrait.png', '390×844 touch viewport: minimized HUD with persistent stage/directive pill and touch controls.');
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByTestId('hud-mini-status').waitFor({ state: 'visible' });
  await mobile.waitForTimeout(250);
  await save(mobile, 'academy-mobile-landscape.png', '844×390 touch viewport: minimized landscape HUD, stage/directive pill and touch controls.');
  await mobile.close();
  // Only this still uses controlled task completion, to show the actual certification UI.
  await page.evaluate(() => window.__previewEngine.completeStageTask(1));
  await page.getByRole('dialog', { name: 'Astronaut certification: stage 1', exact: true }).waitFor();
  await save(page, 'certification-quiz.png', 'Actual Stage 1 certification dialog; entered using a controlled task trigger, not a full mission playthrough.');
  if (errors.length) throw new Error(errors.join('\n'));
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '8', '-i', join(frames, 'frame-%03d.png'),
    '-filter_complex', 'scale=800:450:flags=neighbor,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer',
    '-loop', '0', join(output, 'demo-preview.gif')], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('ffmpeg GIF encoding failed');
  await writeFile(join(output, 'preview-metadata.json'), JSON.stringify({
    schemaVersion: 2, capturedAtUtc: new Date().toISOString(),
    sourceBaseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    includesWorkingTreeChanges: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
    font: 'Determination (self-hosted, anonymous-1438277, CC BY 3.0)', renderer: 'Chromium WebGL2 / SwiftShader',
    verifiedUnitTestCount: testCount, screenshots: captured,
    animation: { file: 'demo-preview.gif', frames: frame, fps: 8, durationSeconds: frame / 8, width: 800, height: 450,
      audio: 'silent', scope: 'Sampled actual Moon, Mars and Flight Academy frames; accelerated montage, not measured frame rate or a full mission.' },
  }, null, 2) + '\n');
  console.log(`Captured ${captured.length} PNGs, ${frame / 8}-second silent GIF, and preview metadata.`);
} finally { await browser.close(); await rm(frames, { recursive: true, force: true }); }
