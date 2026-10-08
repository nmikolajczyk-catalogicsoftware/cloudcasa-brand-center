import { test, expect, TABS } from './fixtures.mjs';

const WIDTHS = [320, 375, 414, 768, 1024, 1440];

test.describe('responsive layout', () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      browserName !== 'chromium' || testInfo.project.name !== 'chromium',
      'viewport sweep runs once, in desktop Chromium'
    );
  });

  for (const width of WIDTHS) {
    for (const name of TABS) {
      test(`no horizontal scrolling at ${width}px on "${name}"`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/#${name}`);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          offenders: [...document.querySelectorAll('body *')]
            .filter(
              (el) =>
                el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 &&
                el.offsetParent !== null &&
                !el.closest('.nav')
            )
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
        }));
        expect(overflow.scrollWidth, `offenders: ${overflow.offenders.join(', ')}`).toBeLessThanOrEqual(
          overflow.clientWidth
        );
      });
    }
  }

  test('interactive controls meet the 24x24px minimum target size (WCAG 2.2 AA)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const small = [];
    for (const name of TABS) {
      await page.goto(`/#${name}`);
      small.push(
        ...(await page.evaluate(() =>
          [...document.querySelectorAll('a, button, [role="tab"]')]
            .filter((el) => el.offsetParent !== null && !el.closest('p'))
            .map((el) => ({ el, box: el.getBoundingClientRect() }))
            .filter(({ box }) => box.width < 24 || box.height < 24)
            .map(
              ({ el, box }) =>
                `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 25)}" ${Math.round(box.width)}x${Math.round(box.height)}`
            )
        ))
      );
    }
    expect([...new Set(small)]).toEqual([]);
  });
});
