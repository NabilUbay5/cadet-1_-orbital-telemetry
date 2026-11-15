/** Optional deterministic browser E2E: complete all mission tasks and certifications. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(30000);
  const errors = [];
  let engineModuleUrl;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/src/game/flightEngine.ts') engineModuleUrl = request.url();
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
  });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      errors.push(`${request.failure()?.errorText}: ${request.url()}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });

  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  assert(engineModuleUrl, 'The application must load its flight engine module');
  await page.evaluate(async moduleUrl => {
    const { FlightEngine } = await import(moduleUrl);
    const reset = FlightEngine.prototype.resetSimulation;
    FlightEngine.prototype.resetSimulation = function () {
      window.__missionTestEngine = this;
      return reset.call(this);
    };
  }, engineModuleUrl);
  const triviaQuestions = await page.evaluate(async () =>
    (await import('/src/data/triviaBank.ts')).TRIVIA_QUESTIONS
  );

  await page.getByRole('button', { name: /PRESS START/ }).click();
  await page.evaluate(() => {
    const engine = window.__missionTestEngine;
    engine.position.set(0, 0, 150);
    engine.velocity.set(0, 0, 0);
    engine.angularVelocity.set(0, 0, 0);
    engine.orientation.identity();
    engine.throttle = 0;
    engine.stabilizationTimer = 3.99;
  });
  await page.getByRole('dialog', { name: 'Astronaut certification: stage 1', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__missionTestEngine.stage1Complete), true);

  const passCertification = async stage => {
    await page.getByRole('dialog', { name: `Astronaut certification: stage ${stage}`, exact: true }).waitFor();
    const questions = triviaQuestions[stage];
    for (let index = 0; index < 3; index += 1) {
      const questionId = await page.locator('[data-question-id]').getAttribute('data-question-id');
      const question = questions.find(candidate => candidate.id === questionId);
      assert(question, `Displayed question ${questionId} must belong to Stage ${stage}`);

      const answer = page.locator('button').filter({
        has: page.getByText(question.options[question.correctIndex], { exact: true }),
      });
      assert.equal(await answer.count(), 1, 'The correct answer must identify exactly one option');
      await answer.click();
      await page.getByRole('button', {
        name: index === 2 ? /SUBMIT CERTIFICATION EXAM/ : /NEXT QUESTION/,
      }).click();
    }

    await page.getByText('★ CERTIFICATION PASSED! ★', { exact: true }).waitFor();
    if (stage < 3) {
      await page.getByRole('button', { name: /PROCEED TO NEXT MISSION STAGE/ }).click();
    } else {
      await page.getByRole('button', { name: /VIEW ASTRONAUT GRADUATION DIPLOMA/ }).click();
    }
  };

  await passCertification(1);
  await page.waitForFunction(() => window.__missionTestEngine.stage === 2);

  for (let collected = 1; collected <= 3; collected += 1) {
    await page.evaluate(() => {
      const engine = window.__missionTestEngine;
      const cube = engine.energyCubes.find(candidate => !candidate.collected);
      if (!cube) throw new Error('No uncollected energy cube remains');
      let bestPosition;
      let bestClearance = Number.NEGATIVE_INFINITY;

      for (let x = -4; x <= 4; x += 0.5) {
        for (let y = -4; y <= 4; y += 0.5) {
          if (x * x + y * y >= 25) continue;
          const candidate = cube.group.position.clone();
          candidate.x += x;
          candidate.y += y;
          const clearance = Math.min(...engine.asteroids.map(asteroid =>
            candidate.distanceTo(asteroid.mesh.position) - asteroid.radius - 3.2
          ));
          if (clearance > bestClearance) {
            bestClearance = clearance;
            bestPosition = candidate;
          }
        }
      }

      if (!bestPosition || bestClearance <= 0) throw new Error('Could not find a safe energy cube pickup position');
      engine.position.copy(bestPosition);
      engine.velocity.set(0, 0, 0);
      engine.throttle = 0;
    });
    await page.waitForFunction(expected => (
      window.__missionTestEngine.energyCubesCollectedCount >= expected
    ), collected);
  }
  await page.getByRole('dialog', { name: 'Astronaut certification: stage 2', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__missionTestEngine.stage2Complete), true);

  await passCertification(2);
  await page.waitForFunction(() => window.__missionTestEngine.stage === 3);
  await page.evaluate(() => {
    const engine = window.__missionTestEngine;
    const satellite = engine.satelliteRelay.group.position;
    let bestPosition;
    let bestClearance = Number.NEGATIVE_INFINITY;

    for (let x = -3.5; x <= 3.5; x += 0.5) {
      for (let y = -3.5; y <= 3.5; y += 0.5) {
        const offsetSquared = x * x + y * y;
        if (offsetSquared > 16) continue;
        const z = Math.sqrt(30 * 30 - offsetSquared);
        const candidate = satellite.clone().add(engine.position.clone().set(x, y, z));
        const clearance = Math.min(...engine.asteroids.map(asteroid =>
          candidate.distanceTo(asteroid.mesh.position) - asteroid.radius - 3.2
        ));
        if (clearance > bestClearance) {
          bestClearance = clearance;
          bestPosition = candidate;
        }
      }
    }

    if (!bestPosition || bestClearance <= 0) throw new Error('Could not find a safe satellite lock position');
    engine.position.copy(bestPosition);
    engine.velocity.set(0, 0, 0);
    engine.angularVelocity.set(0, 0, 0);
    engine.orientation.identity();
    engine.throttle = 0;
  });
  await page.waitForFunction(() => window.__missionTestEngine.stage3Complete, null, { timeout: 30000 });
  await page.getByRole('dialog', { name: 'Astronaut certification: stage 3', exact: true }).waitFor();

  await passCertification(3);
  const victory = page.getByRole('dialog', { name: 'Mission complete', exact: true });
  await victory.waitFor();
  await victory.getByText('CHIEF ORBITAL COMMANDER', { exact: true }).waitFor();
  await victory.getByText('3 / 3 CUBES', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => ({
    badges: window.__missionTestEngine.badgesUnlocked.length,
    stage1Complete: window.__missionTestEngine.stage1Complete,
    stage2Complete: window.__missionTestEngine.stage2Complete,
    stage3Complete: window.__missionTestEngine.stage3Complete,
  })), {
    badges: 3,
    stage1Complete: true,
    stage2Complete: true,
    stage3Complete: true,
  });
  assert.deepEqual(errors, []);
  console.log('All three mission tasks, certification exams, and the victory screen passed.');
} finally {
  await browser.close();
}
