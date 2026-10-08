import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.mjs';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const expected = Object.fromEntries(
  config.headers.flatMap((rule) => rule.headers.map((h) => [h.key.toLowerCase(), h.value]))
);

test.describe('deployment', () => {
  test('security headers from vercel.json are served on pages, assets and 404s', async ({ request }) => {
    for (const path of ['/', '/assets/css/styles.css', '/assets/js/tabs.js', '/does-not-exist']) {
      const headers = (await request.get(path)).headers();
      for (const [key, value] of Object.entries(expected)) expect(headers[key], `${path} ${key}`).toBe(value);
    }
  });

  test('the CSP is strict: no unsafe-inline, no unsafe-eval, no wildcards, no remote scripts', async () => {
    const csp = expected['content-security-policy'];
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    expect(csp).not.toMatch(/(^|[\s;])\*($|[\s;])/);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  test('build and dev files are not published', async ({ request }) => {
    for (const path of [
      '/tools/build.py',
      '/tests/serve.mjs',
      '/variants.json',
      '/index.template.html',
      '/README.md',
      '/package.json',
      '/.vercelignore',
      '/vercel.json',
    ]) {
      const status = (await request.get(path)).status();
      expect(status, path).toBe(404);
    }
  });

  test('no inline script or style is needed: the page works under the CSP with no console errors', async ({
    page,
  }) => {
    await page.goto('/#downloads'); // the fixture fails the test on any CSP violation
    await expect(page.locator('#tab-downloads')).toBeVisible();
  });

  test('performance budget: document, CSS and JS stay small', async ({ request }) => {
    const size = async (path) => (await (await request.get(path)).body()).length;
    expect(await size('/')).toBeLessThan(80 * 1024);
    expect(await size('/assets/css/styles.css')).toBeLessThan(40 * 1024);
    expect(await size('/assets/js/tabs.js')).toBeLessThan(5 * 1024);
  });

  test('images reserve space and below-the-fold previews are lazy', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').evaluateAll((els) =>
      els.map((el) => ({
        src: el.getAttribute('src'),
        w: el.getAttribute('width'),
        h: el.getAttribute('height'),
        lazy: el.loading === 'lazy',
        row: Boolean(el.closest('.dl-row')),
      }))
    );
    expect(images.filter((i) => !i.w || !i.h)).toEqual([]);
    expect(images.filter((i) => i.row && !i.lazy)).toEqual([]);
  });

  test('document language, title, description and social meta are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Brand Resource Center/);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="theme-color"]',
      'link[rel="icon"]',
    ]) {
      await expect(page.locator(selector), selector).toHaveCount(1);
    }
  });
});
