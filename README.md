# CloudCasa Brand Resource Center

Static brand site for **CloudCasa by Catalogic**: logos, colors, typography, usage rules and downloads.
No framework and no runtime dependencies. Open `index.html` in a browser or host the folder on any static host.

## Layout

```
index.html              generated page (do not edit by hand)
index.template.html     page template: markup and copy
variants.json           every logo variant + brand colours (drives the download rows, ZIPs and checks)
vercel.json             security headers (strict CSP) served in production
.vercelignore           dev files that are not deployed
assets/
  svg/                  SOURCE OF TRUTH for every logo (edit/replace these first)
  png/  docs/  source/  PNG (1x, 2x), PDF and AI exported from the SVGs
  css/  js/             one stylesheet, one script (ARIA tabs + hash routing)
  packages/             ZIP downloads (generated)
  docs/brand-identity-cloudcasa-by-catalogic.pdf   brandbook (source of truth for the identity)
tools/                  build, ZIP and check scripts, lint config (package.json), illustrator/ export scripts
tests/                  Playwright end-to-end tests (own package.json) and the local static server
.github/                CI workflow and Dependabot
```

A variant is `<base>_<kind>`, e.g. `cloudcasa-by-catalogic_logo_stacked_spot`, and always exists in five files:
`svg/<name>.svg`, `png/<name>.png`, `png/<name>@2x.png`, `docs/<name>.pdf`, `source/<name>.ai`.

## Brand colours (from the brandbook, pages 7-9)

| Name | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|
| Plum (gradient start) | `#863E73` | 134, 62, 115 | 0, 54, 14, 47 | 689 C |
| Pink (gradient end, spot logo) | `#DD248D` | 221, 36, 141 | 0, 84, 36, 13 | Pink C |
| Black | `#171717` | 23, 23, 23 | 5, 0, 0, 93 | Black 6 C |

The logo gradient runs at 44 degrees from Plum to Pink. `tools/check.py` fails if an SVG contains any other colour.

## Everyday tasks

The build and checks use only the Python 3 standard library. Lint and tests need Node (CI uses Node 22).

| Task | Command |
|---|---|
| Rebuild the page after editing `index.template.html` or `variants.json` | `python3 tools/build.py` |
| Rebuild the ZIP packages after changing any asset | `python3 tools/build_zips.py` |
| File and markup integrity (links, formats, colours, signatures, proportions, headers) | `python3 tools/check.py` |
| Install lint tooling, then lint (ESLint, Stylelint, html-validate, Prettier) | `npm ci --prefix tools && npm run lint --prefix tools` |
| Auto-format code | `npm run format --prefix tools` |
| Install test tooling and browsers (once) | `cd tests && npm ci && npx playwright install chromium webkit` |
| Run the end-to-end tests | `cd tests && npm test` |
| Pixel-compare against the local baselines (macOS only) / refresh them | `npm run test:visual` / `npm run test:update-visual` |

**Add or change a variant:** put the SVG in `assets/svg/`, export the other formats (below), add the kind to a group in
`variants.json`, then run `build.py`, `build_zips.py` and `check.py`.

**Export from Illustrator** (macOS + Adobe Illustrator; macOS asks once to let the terminal control it):

```bash
tools/illustrator/run.sh export-variants.jsx /tmp/out assets/svg/cloudcasa_logo_color.svg   # AI + PDF + PNG 1x/2x
tools/illustrator/run.sh export-spot.jsx     /tmp/out assets/svg/cloudcasa_logo_color.svg   # *_spot: real spot swatches
```

Copy the results from `/tmp/out/{ai,pdf,png,svg}` into `assets/{source,docs,png,svg}`. The spot script builds a CMYK
document with the swatches `PANTONE Pink C` and `PANTONE Black 6 C` (AI/PDF) and a flat RGB version (SVG/PNG).

## Quality gates

CI (`.github/workflows/ci.yml`) runs on every push and pull request:

1. **Generated files are current:** `build.py --check`, `build_zips.py --check`.
2. **`tools/check.py`:** every local link resolves; every variant has SVG, PNG, PNG 2x, PDF and AI; SVGs use only brand
   colours; files have the right signature (PNG, `%PDF-`, well-formed SVG); PNG, PDF and AI proportions match the SVG;
   `*_spot` PDF/AI really contain the `PANTONE` swatches; the CSP has no `unsafe-*` and the security headers exist;
   no inline `style`/`onclick`/`<style>`, every `<img>` has `alt`/`width`/`height`, one `h1`, one `header`/`main`/`footer`.
3. **Lint:** ESLint, Stylelint, html-validate (incl. WCAG rules), Prettier.
4. **Playwright**, in Chromium, Firefox, WebKit (Safari engine), mobile Chrome and mobile Safari. Every test also
   fails on any console message, uncaught error, failed request, HTTP >= 400 or CSP violation:
   - tabs: ARIA state, keyboard (arrows/Home/End), hash routing, malformed hashes, Back/Forward, skip link, landmarks;
   - accessibility: axe-core with WCAG 2.2 AA + best practices on every tab, focus visibility, reduced motion;
   - downloads: every referenced asset returns the right type and file signature, every row offers 5 formats, ZIPs exist;
   - deployment: the exact headers from `vercel.json`, dev files return 404, size budget, image dimensions/lazy loading;
   - responsive: no horizontal scroll at 320-1440 px on every tab, 24x24 px minimum targets; works without JavaScript.

Pixel baselines (`npm run test:visual`) are stored for macOS only and are not run in CI (font rendering differs per OS).

Accessibility decisions worth knowing: the brand pink `#DD248D` is 4.46:1 on white, just below the 4.5:1 AA threshold
for small text, so text and solid buttons use the darker `--pink-dark` (`#B81C74`); the logo, swatches and gradients keep
the brand pink. Secondary text is `#5F6C6D`.

## Known limitations / hand-over notes

- The **brandbook PDF intentionally has no "All White" page** (decision: not added). The PDF is the source of truth for the
  identity; the site still offers the all-white logo files.
- The two spot swatches are created **by name** (with the brandbook CMYK alternates), not picked from the Pantone library.
  Open one `*_spot.pdf` in Illustrator's Separations Preview before sending it to a printer.
- Illustrator-exported SVGs carry Adobe XMP metadata (document IDs); harmless, but it changes on every re-export.
- No `og:image` is set: Open Graph needs an absolute public URL.
- **Firefox is only exercised in CI.** Playwright's Firefox build hung on the macOS 27.0.1 machine used for development, so
  the Firefox results of the test suite were never seen locally. The other four profiles passed locally.
- Fonts come from Google Fonts (allowed explicitly in the CSP). Self-hosting them would remove the third-party request.
- The two brand-center repositories share `tabs.js` and the tooling as copies; keep them in sync when changing one.
