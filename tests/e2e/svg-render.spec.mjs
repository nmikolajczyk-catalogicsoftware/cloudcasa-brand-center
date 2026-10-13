import { readdirSync } from 'node:fs';
import { test, expect } from './fixtures.mjs';

const dir = new URL('../../assets/svg/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));

test.describe('logo SVGs', () => {
  test('there are SVGs to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    test(`${file} actually paints something (not clipped or masked away)`, async ({ page }) => {
      await page.goto('/');
      const painted = await page.evaluate(async (src) => {
        // Firefox gives an SVG that only has a viewBox a size of 0, so give it an explicit size
        // (derived from the viewBox) and load it from a data: URI, which the CSP allows.
        const text = await (await fetch(src)).text();
        const [, , vw, vh] = text
          .match(/viewBox="([^"]+)"/)[1]
          .split(/[\s,]+/)
          .map(Number);
        const w = 200;
        const h = Math.max(1, Math.round((w * vh) / vw));
        const sized = text.replace(
          /<svg\b([^>]*)>/,
          (_, attrs) => `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${w}" height="${h}">`
        );
        const img = new Image();
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 20) n++;
        return n / (w * h);
      }, `assets/svg/${file}`);
      expect(painted, `${file} is (almost) empty when rendered`).toBeGreaterThan(0.02);
    });
  }
});
