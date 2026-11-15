/** Final demo smoke. Stages/quiz entry are controlled; answers and navigation use real UI. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], warnings = [];
  let engineUrl, triviaUrl;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/src/game/flightEngine.ts') engineUrl = request.url();
    if (new URL(request.url()).pathname === '/src/data/triviaBank.ts') triviaUrl = request.url();
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const categories = ['Coding, Debugging, or Troubleshooting', 'Writing, Editing, or Translation', 'Research or Information Gathering'];
  for (const category of categories) assert((await page.locator('meta[name="ai-tool-use"]').getAttribute('content')).includes(category));
  await page.getByRole('button', { name: 'CREDITS & SOURCES', exact: true }).click();
  const credits = page.getByRole('dialog', { name: 'CREDITS & SOURCES', exact: true });
  for (const category of categories) await credits.getByText(category, { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await credits.waitFor({ state: 'hidden' });
  assert(engineUrl && triviaUrl, 'Run against the Vite dev server');
  await page.evaluate(async url => {
    const { FlightEngine } = await import(url);
    const reset = FlightEngine.prototype.resetSimulation;
    FlightEngine.prototype.resetSimulation = function () { window.__demoEngine = this; return reset.call(this); };
  }, engineUrl);
  const save = async name => {
    if (!process.env.DEMO_SCREENSHOT_DIR) return;
    await mkdir(process.env.DEMO_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.DEMO_SCREENSHOT_DIR}/${name}.png` });
  };
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport);
    for (const dest of ['THE MOON', 'MARS']) {
      await page.getByRole('button', { name: /OUTPOST OPS/ }).click();
      await page.getByRole('button', { name: dest, exact: false }).filter({ has: page.getByText(dest, { exact: true }) }).click();
      await page.getByRole('button', { name: 'START MISSION', exact: true }).click();
      await page.getByRole('heading', { name: "TODAY'S ORDERS", exact: true }).waitFor();
      assert.equal(await page.locator('.outpost-ui').evaluate(el => el.scrollWidth > el.clientWidth), false);
      await save(`${dest === 'MARS' ? 'mars' : 'moon'}-${viewport.width}`);
      await page.getByRole('button', { name: 'EXIT', exact: true }).click();
    }
    await page.getByRole('button', { name: /FLIGHT ACADEMY/ }).click();
    const bank = await page.evaluate(async url => (await import(url)).TRIVIA_QUESTIONS, triviaUrl);
    for (const stage of [1, 2, 3]) {
      await page.evaluate(stage => { const e = window.__demoEngine; e.advanceToStage(stage); e.completeStageTask(stage); }, stage);
      const quiz = page.getByRole('dialog', { name: `Astronaut certification: stage ${stage}`, exact: true });
      await quiz.waitFor();
      assert.equal(await page.locator('.cockpit-hud').evaluate(el => el.inert), true);
      const bounds = await quiz.locator('.retro-window').boundingBox();
      const outer = await quiz.boundingBox();
      assert(bounds.y >= outer.y, 'Quiz header must remain reachable on short viewports');
      await save(`quiz-${stage}-${viewport.width}`);
      for (let i = 0; i < 3; i++) {
        const id = await quiz.locator('[data-question-id]').getAttribute('data-question-id');
        const question = bank[stage].find(candidate => candidate.id === id);
        assert(question);
        await quiz.getByRole('button').filter({ has: page.getByText(question.options[question.correctIndex], { exact: true }) }).click();
        await quiz.getByRole('button', { name: i === 2 ? /SUBMIT CERTIFICATION/ : /NEXT QUESTION/ }).click();
      }
      await quiz.getByRole('button', { name: stage < 3 ? /PROCEED TO NEXT MISSION STAGE/ : /VIEW ASTRONAUT GRADUATION DIPLOMA/ }).click();
    }
    await page.getByRole('dialog', { name: 'Mission complete', exact: true }).waitFor();
    await page.getByRole('button', { name: /EXIT LOBBY/ }).click();
    console.log(`PASS ${viewport.width}x${viewport.height}: Moon, Mars, all three quiz gates, certification victory and lobby.`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  console.log('PASS: SI credits/metadata, responsive scene/quiz navigation, zero console errors or warnings. Controlled stage entry is not a full piloted mission.');
} finally { await browser.close(); }
