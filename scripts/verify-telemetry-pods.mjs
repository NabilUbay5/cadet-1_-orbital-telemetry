import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4173';
const vitePath = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [vitePath, '--host=127.0.0.1', '--port=4173', '--strictPort'], {
  stdio: 'inherit',
});

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready (code ${server.exitCode})`);
    }
    try {
      const response = await fetch(appUrl);
      if (response.ok) return;
      lastError = new Error(`Vite returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Vite did not become ready: ${lastError}`);
}

try {
  await waitForServer();
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  };
  if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(appUrl, { waitUntil: 'networkidle' });
    const researchBalance = page.getByTestId('research-balance');
    await researchBalance.waitFor();
    assert.equal((await researchBalance.textContent())?.trim(), '0 RP');
    await page.evaluate(() => localStorage.setItem('cadet-1-research-points', '400'));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal((await page.getByTestId('research-balance').textContent())?.trim(), '400 RP');
    await page.getByRole('button', { name: /FLIGHT ACADEMY/ }).click();
    assert.equal((await page.getByTestId('research-balance').textContent())?.trim(), '400 RP');

    const podCounter = page.getByTestId('telemetry-pod-counter');
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="telemetry-pod-counter"]')?.textContent?.trim() === '0 / 3'
        && document.querySelectorAll('[title^="POD ["]').length === 3;
    });

    await page.keyboard.down('w');
    try {
      await page.waitForFunction(() => {
        return document.querySelector('[data-testid="telemetry-pod-counter"]')?.textContent?.trim() === '1 / 3'
          && document.querySelectorAll('[title^="POD ["]').length === 2;
      }, undefined, { timeout: 10000 });
    } finally {
      await page.keyboard.up('w');
    }
    assert.equal(await podCounter.textContent(), '1 / 3');
    console.log('PASS: thrust collects a telemetry pod and updates the HUD and radar');

    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('dialog', { name: 'Flight paused' }).waitFor();
    await page.getByRole('button', { name: 'RESTART' }).click();
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="telemetry-pod-counter"]')?.textContent?.trim() === '0 / 3'
        && document.querySelectorAll('[title^="POD ["]').length === 3;
    });
    assert.equal((await page.getByTestId('research-balance').textContent())?.trim(), '400 RP');
    assert.deepEqual(errors, []);
    console.log('PASS: restart restores pods and preserves the saved research balance');
  } finally {
    await browser.close();
  }
} finally {
  if (server.exitCode === null) {
    const serverExited = once(server, 'exit');
    server.kill('SIGTERM');
    await serverExited;
  }
}
