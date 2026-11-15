/** Real pointer/touch navigation; never use locator.click/tap to auto-scroll title buttons. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const appUrl = process.env.APP_URL || 'http://127.0.0.1:3000';

try {
  for (const viewport of [
    { width: 1280, height: 800 }, { width: 390, height: 844 },
    { width: 320, height: 568 }, { width: 568, height: 320 },
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      for (const gesture of ['touch', 'wheel']) {
        for (const mode of ['outpost', 'flight']) {
          await page.goto(appUrl, { waitUntil: 'networkidle' });
          const title = page.getByTestId('title-screen');
          await title.waitFor();
          const button = page.getByRole('button', { name: mode === 'outpost' ? /OUTPOST OPS/ : /PRESS START/ });
          let reachable = false;
          let gestures = 0;
          // Read positions and send real gestures. Browser automation must not
          // rescue an unreachable button with implicit scrollIntoView().
          for (let attempt = 0; attempt < 10; attempt++) {
            const rect = await button.boundingBox();
            assert(rect);
            if (rect.x >= 0 && rect.x + rect.width <= viewport.width
              && rect.y >= 0 && rect.y + rect.height <= viewport.height) {
              reachable = await button.evaluate(element => {
                const r = element.getBoundingClientRect();
                return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
              });
              if (reachable) break;
            }
            const distance = Math.round(viewport.height * 0.6) * (rect.y < 0 ? 1 : -1);
            // The padding area must receive scrolling too, not pass it to the canvas.
            if (gesture === 'touch') {
              const start = viewport.height * (distance < 0 ? 0.8 : 0.2);
              const point = y => [{ x: 12, y, id: 1 }];
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(start) });
              for (let step = 1; step <= 8; step++) {
                await cdp.send('Input.dispatchTouchEvent', {
                  type: 'touchMove', touchPoints: point(start + distance * step / 8),
                });
                await page.waitForTimeout(35);
              }
              // A deliberate drag/hold avoids a fling racing the coordinate tap.
              await page.waitForTimeout(100);
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            } else {
              await page.mouse.move(12, viewport.height / 2);
              await page.mouse.wheel(0, -distance);
            }
            gestures++;
            await page.waitForTimeout(150);
          }
          assert(reachable, `${mode} cannot be reached by ${gesture} at ${viewport.width}x${viewport.height}`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          if (process.env.TITLE_SCREENSHOT_DIR && gesture === 'touch' && mode === 'flight') {
            await mkdir(process.env.TITLE_SCREENSHOT_DIR, { recursive: true });
            await page.screenshot({ path: `${process.env.TITLE_SCREENSHOT_DIR}/title-${viewport.width}x${viewport.height}.png` });
          }
          const rect = await button.boundingBox();
          assert(rect);
          if (gesture === 'touch') await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
          else await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
          if (mode === 'outpost') await page.getByText('RUN A MOON OR MARS OUTPOST', { exact: true }).waitFor();
          else await page.getByRole('button', { name: 'Mute audio', exact: true }).waitFor();
          console.log(`PASS ${viewport.width}x${viewport.height}: ${gesture} opened ${mode} (${gestures} scroll gestures)`);
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
