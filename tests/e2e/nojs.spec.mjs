import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every panel is shown, the tab bar is hidden and downloads stay reachable', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ contentType: 'text/css', body: '' })
    );
    await page.goto('/');
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(5);
    await expect(page.locator('.nav')).toBeHidden();
    await expect(page.locator('#tab-downloads .dl-btn').first()).toBeVisible();
    expect(await page.locator('#tab-downloads a[download]').count()).toBeGreaterThan(40);
  });
});
