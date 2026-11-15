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

  // Focused title controls own Enter/Space; global shortcuts must not start a flight.
  for (const key of ['Enter', 'Space']) {
    await page.getByRole('button', { name: /OUTPOST OPS/ }).focus();
    await page.keyboard.press(key);
    await page.getByText('RUN A MOON OR MARS OUTPOST', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Mute audio', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'BACK TO TITLE', exact: true }).click();
  }
  // Unfocused Enter still opens the upstream main mission shortcut.
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Enter');
  await page.getByText('RUN A MOON OR MARS OUTPOST', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'BACK TO TITLE', exact: true }).click();
  await page.getByRole('button', { name: /PRESS START/ }).focus();
  await page.keyboard.press('Enter');
  console.log('Focused title Enter/Space activation and default Enter navigation passed.');
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

  // Stage 1 starts tilted. Fly level through real keyboard input and HUD feedback;
  // do not overwrite engine state or weaken the four-second stabilization gate.
  const quiz = page.getByText('[ASTRONAUT CERTIFICATION: STAGE 1]', { exact: true });
  const held = new Set();
  const deadline = performance.now() + 60000;
  let steeringInputs = 0;
  let lastAttitude;
  try {
    while (!(await quiz.isVisible()) && performance.now() < deadline) {
      lastAttitude = await page.evaluate(() => {
        const hud = document.querySelector('.cockpit-hud')?.textContent ?? '';
        const pitch = hud.match(/P:\s*(-?\d+)°/);
        const yaw = hud.match(/Y:\s*(-?\d+)°/);
        return pitch && yaw ? { pitch: Number(pitch[1]), yaw: Number(yaw[1]) } : null;
      });
      assert(lastAttitude, 'Flight HUD must report pitch and yaw while steering');
      const wanted = new Set();
      if (lastAttitude.pitch > 1) wanted.add('r');
      else if (lastAttitude.pitch < -1) wanted.add('f');
      if (lastAttitude.yaw > 1) wanted.add('d');
      else if (lastAttitude.yaw < -1) wanted.add('a');
      for (const key of held) if (!wanted.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
      for (const key of wanted) if (!held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
        steeringInputs++;
      }
      await page.waitForTimeout(150);
    }
  } finally {
    for (const key of held) await page.keyboard.up(key);
  }
  assert(await quiz.isVisible(), `Steering did not unlock certification; last HUD attitude: ${JSON.stringify(lastAttitude)}`);
  assert(steeringInputs > 0, 'The tilted start must require real steering before the quiz');
  console.log(`Stage 1 stabilization reached through HUD-guided steering (${steeringInputs} control inputs).`);
  // Certification is a modal input lock, not an ordinary resumable pause.
  assert.equal(await page.locator('.cockpit-hud').evaluate(hud => hud.inert), true);
  // Verify browser focus behavior directly; role locators can still match inert DOM.
  await page.locator('[aria-label="Mute audio"]').evaluate(button => button.focus());
  assert.equal(await page.getByRole('dialog', { name: 'Astronaut certification: stage 1', exact: true }).evaluate(
    dialog => dialog === document.activeElement), true);
  const quizEpoch = await page.getByTestId('nasa-epoch').innerText();
  for (const key of ['p', 'Escape', 'Space']) {
    await page.keyboard.press(key);
    // Check each shortcut independently; P and Escape must not cancel each other out.
    await page.waitForTimeout(400);
    assert.equal(await page.getByTestId('nasa-epoch').innerText(), quizEpoch, `${key} must not resume flight`);
  }
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  assert.equal(await page.getByTestId('nasa-epoch').innerText(), quizEpoch);
  assert.equal(await page.getByRole('dialog', { name: 'Flight paused', exact: true }).count(), 0);
  console.log('Quiz blocks flight resume, thrust, and scanner shortcuts.');
  // Verify wrong-answer feedback, retry, and a complete successful certification.
  const questions = await page.evaluate(async () => (await import('/src/data/triviaBank.ts')).TRIVIA_QUESTIONS[1]);
  const answerCurrentQuestion = async wrong => {
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
    const question = questions.find(candidate => candidate.id === id);
    assert(question, `Displayed question ${id} must belong to the Stage 1 bank`);
    const index = wrong ? (question.correctIndex + 1) % 4 : question.correctIndex;
    // Match the answer text, not its old letter: the UI independently shuffles options.
    const options = page.locator('button').filter({ has: page.getByText(question.options[index], { exact: true }) });
    assert.equal(await options.count(), 1, 'Answer text must identify exactly one option');
    // Check native Space activation too: the engine must leave quiz controls alone.
    await options.focus();
    await page.keyboard.press('Space');
  };
  // The current quiz draws three questions from a larger randomized bank.
  for (let i = 0; i < 3; i++) {
    await answerCurrentQuestion(i === 0);
    await page.getByRole('button', { name: i === 2 ? /SUBMIT CERTIFICATION/ : /NEXT QUESTION/ }).click();
  }
  await page.getByText('★ EXAM SCORE INSUFFICIENT ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /RE-ATTEMPT CERTIFICATION/ }).click();
  for (let i = 0; i < 3; i++) {
    await answerCurrentQuestion(false);
    await page.getByRole('button', { name: i === 2 ? /SUBMIT CERTIFICATION/ : /NEXT QUESTION/ }).click();
  }
  await page.getByText('★ CERTIFICATION PASSED! ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /PROCEED TO NEXT MISSION STAGE/ }).click();
  assert.equal(await page.locator('.cockpit-hud').evaluate(hud => hud.inert), false);
  await page.keyboard.press('p');
  await page.getByText('★ GAME PAUSED ★', { exact: true }).waitFor();
  await page.getByRole('button', { name: /CONTINUE/ }).click();
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'EXIT TO LOBBY', exact: true }).click();
  await page.getByRole('button', { name: /PRESS START/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Quiz failure/retry/pass, stage transition, pause/resume, and lobby passed; no browser/shader errors.');
} finally { await browser.close(); }
