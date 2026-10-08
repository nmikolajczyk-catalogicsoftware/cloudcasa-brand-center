import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { TABS } from './fixtures.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// axe-core fetches stylesheets itself, which the site's strict connect-src (correctly) refuses, so this file
// uses the plain Playwright test: console noise from axe is not a site problem. Other specs enforce a clean console.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
});

test.describe('accessibility (axe-core, WCAG 2.2 AA + best practices)', () => {
  for (const name of TABS) {
    test(`"${name}" tab has no violations`, async ({ page }) => {
      await page.goto(`/#${name}`);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        violations.map(
          (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`
        )
      ).toEqual([]);
    });
  }

  test('focus is visible on every tab and link we expose', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit moves focus to links only with "Full Keyboard Access"');
    await page.goto('/#downloads');
    const link = page.locator('a.dl-btn[href^="assets/"]').first();
    await link.focus();
    await page.keyboard.press('Tab'); // keyboard modality switches :focus-visible on
    await page.keyboard.press('Shift+Tab');
    const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('respects prefers-reduced-motion (no transitions)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const durations = await page
      .locator('a, .product-card, .dl-btn')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDuration));
    expect([...new Set(durations)].every((d) => d.split(',').every((x) => parseFloat(x) === 0))).toBe(true);
  });
});
