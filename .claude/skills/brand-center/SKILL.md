---
name: brand-center
description: Work on, verify and hand over the Catalogic brand resource sites (CloudCasa brand center, Catalogic brand resource center with DPX/vStor/GuardMode). Use for logo variant questions, editing variants.json or the page template, running checks/tests, smoke-testing the Vercel deployments, or preparing a release hand-over.
---

# Brand center sites

## The two repos (clone them side by side)

| Repo | Brands | Production |
|---|---|---|
| `cloudcasa-brand-center` | cloudcasa, cloudcasa-by-catalogic | https://cloudcasa-brand-center.vercel.app/ |
| `Catalogic-brand-resource-center` | catalogic, dpx, vstor, guardmode | https://catalogic-brand-resource-center.vercel.app/ |

- Catalogic repo: the deployed site root is its `dpx/` folder. Repo path `dpx/assets/png/x.png` is served as `/assets/png/x.png`. Do not probe `/dpx/...` (404 is expected, not a bug).
- The two repos share `tabs.js` and the tooling as copies. Change one, mirror the other.
- Read each repo's README first; it is accurate and lists every command.

## Logo variants (verified by viewing the PNGs)

- `*_white`: symbol keeps its brand colour (magenta gradient for CloudCasa/Catalogic, green for DPX/vStor/GuardMode), only the wordmark is white. For dark backgrounds with a coloured mark.
- `*_all-white`: symbol and wordmark both white. For dark or one-colour backgrounds.
- Same pattern for stacked layouts (`_stacked_`) and for `*-icon-white` (icon only, still coloured).
- `*_black`, `*_color`, `*_spot` (Pantone swatches) are the other kinds. A variant always exists as SVG, PNG, PNG@2x, PDF, AI.
- White files look empty on a white preview. To judge them, composite on a dark background first (e.g. with Python/PIL or a browser page), do not conclude from the blank image.
- The CloudCasa brandbook PDF intentionally has no "All White" page.

## Editing

- `index.html` is generated. Edit `index.template.html` and `variants.json`, then `python3 tools/build.py`, `python3 tools/build_zips.py`, `python3 tools/check.py`.
- `assets/svg/` is the source of truth for logos; other formats are exports (Illustrator scripts in `tools/illustrator/`).
- Only brand colours may appear in SVGs (`#863E73`, `#DD248D`, `#171717` for CloudCasa); `check.py` enforces it.
- Strict CSP in `vercel.json`: no inline `style`/`onclick`/`<style>`/`unsafe-*`. Brand pink on small text fails AA contrast; use `--pink-dark`.

## Verify before handing over

1. Working tree clean and pushed (`git status -sb` shows no ahead/behind).
2. CI green on GitHub (`gh` is not installed on this machine; check in the browser or ask).
3. Local: `python3 tools/check.py`, lint (`npm ci --prefix tools && npm run lint --prefix tools`), `cd tests && npm test`.
4. Production smoke test: `cd tests && BASE_URL=<prod url> npm run test:production`. Last run on cloudcasa: 205 passed, 0 failed, 99 skipped (skips are defined in the tests).
5. Quick manual probes with curl: `curl -sI <url>/` shows 200 plus CSP/HSTS/X-Frame-Options; `/package.json` and `/.git/config` must be 404; a few `/assets/png/...all-white.png` return 200.
6. The Catalogic repo has the same test setup in its `tests/`; if you run its suite, use the same `BASE_URL` approach (not run so far, only curl probes).

## Machine gotchas (observed on the original author's Mac; may differ on yours)

- If `npm` is not on PATH in the Claude Code shell, add your Node 22 install to PATH first (nvm: `$HOME/.nvm/versions/node/<version>/bin`).
- macOS has no `timeout` command; do not wrap with it.
- Playwright Firefox hung on the author's macOS 27 machine, so Firefox results come from CI only. `test:production` uses chromium, webkit and both mobile profiles.
- Visual baselines are macOS-only and not run in CI.

## Working rules learned

- Do not claim something about a file you did not open. Names suggest, images prove. Say plainly what was and was not checked (PNG viewed, PDF/ZIP not opened).
- Do not push, deploy or share links with others without the user's go-ahead; checking and reading is fine.
- User writes Polish; answer in Polish, keep code, commits and docs in English.
