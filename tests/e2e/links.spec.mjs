import { test, expect } from './fixtures.mjs';

const TYPES = {
  svg: /^image\/svg\+xml/,
  png: /^image\/png/,
  pdf: /^application\/pdf/,
  ai: /^application\/(postscript|pdf|illustrator)/,
  zip: /^application\/zip/,
  css: /^text\/css/,
  js: /^application\/javascript/,
};
const MAGIC = {
  png: (b) => b.subarray(0, 8).toString('latin1') === '\x89PNG\r\n\x1a\n',
  pdf: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  ai: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  zip: (b) => b.subarray(0, 2).toString('latin1') === 'PK',
  svg: (b) => b.toString('utf8', 0, 400).includes('<svg') || b.toString('utf8', 0, 400).includes('<?xml'),
};

test.describe('downloads and assets', () => {
  test.setTimeout(90_000);

  test('every local asset referenced by the page loads with the right type and signature', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const refs = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('a[href], img[src], link[href], script[src]')]
          .map((el) => el.getAttribute('href') ?? el.getAttribute('src'))
          .filter((url) => url && url.startsWith('assets/'))
      ),
    ]);
    expect(refs.length).toBeGreaterThan(50);

    const failures = [];
    const check = async (ref) => {
      const ext = ref.split('.').pop();
      const response = await request.get(`/${ref}`);
      const body = await response.body();
      if (response.status() !== 200) failures.push(`${ref}: HTTP ${response.status()}`);
      else if (!TYPES[ext]?.test(response.headers()['content-type'] ?? ''))
        failures.push(`${ref}: content-type ${response.headers()['content-type']}`);
      else if (body.length === 0) failures.push(`${ref}: empty`);
      else if (MAGIC[ext] && !MAGIC[ext](body)) failures.push(`${ref}: wrong file signature`);
    };
    // Small batches: ~100 files incl. multi-MB ZIPs, and every browser project runs this at once
    for (let start = 0; start < refs.length; start += 8) {
      await Promise.all(refs.slice(start, start + 8).map(check));
    }
    expect(failures).toEqual([]);
  });

  test('every download button has the download attribute and a visible label', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('a.dl-btn[href^="assets/"]').evaluateAll((els) =>
      els.map((el) => ({
        label: el.textContent.trim(),
        download: el.hasAttribute('download'),
        href: el.getAttribute('href'),
      }))
    );
    expect(buttons.length).toBeGreaterThan(40);
    expect(buttons.filter((b) => !b.download || !b.label)).toEqual([]);
  });

  test('every download row offers SVG, PNG, PNG 2x, PDF and AI', async ({ page }) => {
    await page.goto('/');
    const rows = await page
      .locator('.dl-row')
      .evaluateAll((els) =>
        els.map((row) => [...row.querySelectorAll('.dl-btn')].map((b) => b.textContent.trim()))
      );
    const logoRows = rows.filter((labels) => labels.length > 1);
    expect(logoRows.length).toBeGreaterThan(15);
    for (const labels of logoRows) expect(labels.sort()).toEqual(['AI', 'PDF', 'PNG', 'PNG 2x', 'SVG']);
  });

  test('every section ZIP link points to an existing archive', async ({ page, request }) => {
    await page.goto('/');
    const zips = await page
      .locator('a.section-title-zip')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(zips.length).toBeGreaterThan(0);
    for (const zip of zips) {
      const response = await request.get(`/${zip}`);
      expect(response.status(), zip).toBe(200);
      expect((await response.body()).length, zip).toBeGreaterThan(1000);
    }
  });

  test('external links open safely and use https', async ({ page }) => {
    await page.goto('/');
    const external = await page
      .locator('a[href^="http"]')
      .evaluateAll((els) => els.map((el) => ({ href: el.href, target: el.target, rel: el.rel })));
    expect(external.filter((l) => !l.href.startsWith('https://'))).toEqual([]);
    expect(external.filter((l) => l.target === '_blank' && !/noopener/.test(l.rel))).toEqual([]);
  });

  test('every in-page link has a target', async ({ page }) => {
    await page.goto('/');
    const missing = await page.evaluate(() => {
      const tabs = new Set([...document.querySelectorAll('[role="tab"]')].map((t) => t.dataset.tab));
      return [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href').slice(1))
        .filter((id) => id && !tabs.has(id) && !document.getElementById(id));
    });
    expect(missing).toEqual([]);
  });
});
