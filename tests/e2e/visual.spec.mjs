import { test, expect, TABS } from './fixtures.mjs';

// Pixel baselines (see `npm run test:update-visual`). Run locally: the OS font stack changes the pixels.
for (const [label, viewport] of [
  ['desktop', { width: 1300, height: 900 }],
  ['mobile', { width: 390, height: 800 }],
]) {
  for (const name of TABS) {
    test(`@visual ${name} (${label})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/#${name}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}-${label}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
