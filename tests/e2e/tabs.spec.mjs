import { test, expect, expectOnlyTab, TABS } from './fixtures.mjs';

const tab = (page, name) => page.locator(`[role="tab"][data-tab="${name}"]`);

test.describe('tabs', () => {
  test('starts on the first tab with a correct ARIA state', async ({ page }) => {
    await page.goto('/');
    await expectOnlyTab(page, 'overview');
    await expect(page.getByRole('tablist')).toHaveAccessibleName(/.+/);
    for (const name of TABS) {
      const panel = page.locator(`#tab-${name}`);
      await expect(panel).toHaveAttribute('role', 'tabpanel');
      await expect(panel).toHaveAttribute('aria-labelledby', await tab(page, name).getAttribute('id'));
      await expect(tab(page, name)).toHaveAttribute('aria-controls', `tab-${name}`);
    }
  });

  for (const name of TABS) {
    test(`#${name} in the URL opens that tab`, async ({ page }) => {
      await page.goto(`/#${name}`);
      await expectOnlyTab(page, name);
    });

    test(`clicking the "${name}" tab selects it and updates the URL`, async ({ page }) => {
      await page.goto('/');
      await tab(page, name).click();
      await expectOnlyTab(page, name);
      await expect(page).toHaveURL(new RegExp(`#${name}$`));
    });
  }

  test('arrow keys, Home and End move selection and focus, wrapping at the ends', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit moves focus to buttons/links only with "Full Keyboard Access"'
    );
    await page.goto('/');
    await tab(page, 'overview').focus();
    await page.keyboard.press('ArrowRight');
    await expectOnlyTab(page, 'colors');
    await expect(tab(page, 'colors')).toBeFocused();
    await page.keyboard.press('End');
    await expectOnlyTab(page, 'downloads');
    await page.keyboard.press('ArrowRight');
    await expectOnlyTab(page, 'overview');
    await page.keyboard.press('ArrowLeft');
    await expectOnlyTab(page, 'downloads');
    await page.keyboard.press('Home');
    await expectOnlyTab(page, 'overview');
  });

  test('roving tabindex: only the selected tab is in the Tab order', async ({ page }) => {
    await page.goto('/#typography');
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(page.locator('[role="tab"][tabindex="-1"]')).toHaveCount(TABS.length - 1);
    await expect(tab(page, 'typography')).toHaveAttribute('tabindex', '0');
  });

  test('a deep link to a download section opens Downloads and shows the section', async ({ page }) => {
    const card = await (async () => {
      await page.goto('/');
      return page.locator('a.product-card-link').first();
    })();
    const id = (await card.getAttribute('href')).slice(1);
    await page.goto(`/#${id}`);
    await expectOnlyTab(page, 'downloads');
    await expect(page.locator(`#${id}`)).toBeInViewport();
  });

  test('a product card is a real link that opens its download section', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('a.product-card-link');
    expect(await cards.count()).toBeGreaterThan(0);
    const first = cards.first();
    const id = (await first.getAttribute('href')).slice(1);
    await first.click();
    await expectOnlyTab(page, 'downloads');
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
  });

  test('"View downloads" opens the Downloads tab', async ({ page }) => {
    await page.goto('/');
    await page.locator('.section-title-view-downloads').click();
    await expectOnlyTab(page, 'downloads');
  });

  for (const hash of ['%', '%E0%A4%A', 'unknown-section', '']) {
    test(`malformed or unknown hash "#${hash}" falls back to the first tab without errors`, async ({
      page,
    }) => {
      await page.goto(`/#${hash}`);
      await expectOnlyTab(page, 'overview');
    });
  }

  test('the id of a panel (#tab-colors) is a valid deep link to that tab', async ({ page }) => {
    await page.goto('/#tab-colors');
    await expectOnlyTab(page, 'colors');
  });

  test('browser Back and Forward walk through the visited tabs', async ({ page }) => {
    await page.goto('/');
    await tab(page, 'colors').click();
    await tab(page, 'usage').click();
    await expectOnlyTab(page, 'usage');
    await page.goBack();
    await expectOnlyTab(page, 'colors');
    await page.goBack();
    await expectOnlyTab(page, 'overview');
    await page.goForward();
    await expectOnlyTab(page, 'colors');
  });

  test('exactly one h1 and one of each landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    for (const landmark of ['banner', 'main', 'contentinfo']) {
      await expect(page.getByRole(landmark)).toHaveCount(1);
    }
  });

  test('skip link is the first focusable element and jumps to main', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit moves focus to links only with "Full Keyboard Access"');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});
