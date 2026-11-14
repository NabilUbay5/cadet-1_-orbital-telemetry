/** Browser/OfflineAudioContext smoke checks using the same optional tools as capture-previews. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('response', response => { if (response.status() >= 400) console.log('HTTP error:', response.status(), response.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
  const rendered = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/game/audioEngine.ts');
    async function render(mode) {
      const context = new OfflineAudioContext(1, 24000, 24000);
      context.close = () => Promise.resolve(); // OfflineAudioContext owns its rendering lifecycle.
      const engine = new AudioEngine(() => context);
      engine.ensureRunning();
      if (mode === 'muted') engine.toggleMute();
      if (mode === 'quiz') engine.playQuizAnswer(true);
      else engine.setThruster(0.7, mode === 'boost');
      const buffer = await context.startRendering();
      let squares = 0;
      let peak = 0;
      for (const sample of buffer.getChannelData(0)) {
        squares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      engine.dispose();
      return { rms: Math.sqrt(squares / buffer.length), peak };
    }
    return { normal: await render('normal'), boost: await render('boost'), quiz: await render('quiz'), muted: await render('muted') };
  });
  assert(rendered.normal.rms > 0.001);
  assert(rendered.boost.rms > rendered.normal.rms);
  assert(rendered.quiz.rms > 0.001);
  assert.equal(rendered.muted.peak, 0);
  assert(Object.values(rendered).every(signal => signal.peak < 1));
  console.log('OfflineAudioContext:', rendered);

  await page.getByRole('button', { name: /PRESS START/ }).click();
  const mute = page.getByRole('button', { name: 'Mute audio', exact: true });
  await mute.click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Mute audio"]')?.getAttribute('aria-pressed') === 'true');
  assert.equal(await mute.getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('m');
  await page.waitForFunction(() => document.querySelector('[aria-label="Mute audio"]')?.getAttribute('aria-pressed') === 'false');
  // Repeated keydown must not flicker mute while M is held.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', repeat: true })));
  await page.waitForTimeout(300);
  assert.equal(await mute.getAttribute('aria-pressed'), 'false');
  console.log('HUD mute, keyboard mute, and repeat-key handling passed.');

  await page.getByText('[ASTRONAUT CERTIFICATION: STAGE 1]', { exact: true }).waitFor({ timeout: 60000 });
  // Verify wrong-answer feedback, retry, and a complete successful certification.
  const questions = await page.evaluate(async () => (await import('/src/data/triviaBank.ts')).TRIVIA_QUESTIONS[1]);
  for (let i = 0; i < questions.length; i++) {
    const index = i === 0 ? (questions[i].correctIndex + 1) % 4 : questions[i].correctIndex;
    await page.getByRole('button', { name: `${'ABCD'[index]} ${questions[i].options[index]}`, exact: true }).click();
    await page.getByRole('button', { name: i === 2 ? /SUBMIT CERTIFICATION/ : /NEXT QUESTION/ }).click();
  }
  await page.getByText('★ EXAM SCORE INSUFFICIENT ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /RE-ATTEMPT CERTIFICATION/ }).click();
  for (let i = 0; i < questions.length; i++) {
    const index = questions[i].correctIndex;
    await page.getByRole('button', { name: `${'ABCD'[index]} ${questions[i].options[index]}`, exact: true }).click();
    await page.getByRole('button', { name: i === 2 ? /SUBMIT CERTIFICATION/ : /NEXT QUESTION/ }).click();
  }
  await page.getByText('★ CERTIFICATION PASSED! ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /PROCEED TO NEXT MISSION STAGE/ }).click();
  await page.keyboard.press('p');
  await page.getByText('★ GAME PAUSED ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /CONTINUE/ }).click();
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'EXIT TO LOBBY', exact: true }).click();
  await page.getByRole('button', { name: /PRESS START/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Quiz failure/retry/pass, stage transition, pause/resume, and lobby passed; no browser/shader errors.');
} finally { await browser.close(); }
