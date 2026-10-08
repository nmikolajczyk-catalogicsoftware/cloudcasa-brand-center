import { test as base, expect } from '@playwright/test';

export const TABS = ['overview', 'colors', 'typography', 'usage', 'downloads'];

/**
 * Every test gets a page that:
 *  - never talks to Google Fonts (deterministic, works offline),
 *  - FAILS the test on any console error/warning, uncaught exception, failed request,
 *    HTTP >= 400 response or CSP violation.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) problems.push(`console ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
    page.on('requestfailed', (request) => {
      if (!request.url().includes('fonts.gstatic.com')) problems.push(`request failed: ${request.url()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await use(page);
    expect(problems, 'browser reported problems').toEqual([]);
  },
});

export { expect };

/** Asserts that exactly one tab is selected and that only its panel is visible. */
export async function expectOnlyTab(page, name) {
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(page.locator(`[role="tab"][data-tab="${name}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await expect(page.locator(`#tab-${name}`)).toBeVisible();
  await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
}
