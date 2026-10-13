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
- The two repos share `tabs.js`, the tooling and the page chrome as copies. Change one, mirror the other. The header (`.hero`) must stay identical in both: one markup, 124px high on desktop with the logo vertically aligned to the title block, logo stacked above the text on mobile. Only colours differ.
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

## Gotchas found in the assets

- The five `catalogic-*` SVGs carried a stray invisible `fill:none` `<rect>` the size of the full logo (166.76 wide even on the 35.49 icon). It shows in Illustrator outline view (Cmd+Y) and widens the `.ai` bounding box, so it was removed and the `.ai` re-exported from the SVG (`tools/illustrator/run.sh export-variants.jsx OUT_DIR assets/svg/*.svg`, copy only `OUT_DIR/ai/*.ai` into `assets/source/`, rebuild ZIPs).
- DO NOT remove `<rect>`s blindly. In the `dpx-*`, `vstor-*` and `guardmode-*` SVGs the rect is the content of `<clipPath id="clippath">`; deleting it leaves an empty clip that hides the whole logo (this once shipped to production: product logos vanished from the Overview and Typography tabs). `tools/check.py` now fails on an empty `clipPath`/`mask`, and `tests/e2e/svg-render.spec.mjs` renders every SVG and fails if it is nearly empty.
- Visual snapshots have a 0.2% pixel tolerance and `--update-snapshots` does not rewrite snapshots that are within tolerance. A broken logo can get baked into a baseline. After an asset change, view the screenshots yourself; to force a refresh delete `tests/e2e/visual.spec.mjs-snapshots/*-visual-darwin.png` and run `npm run test:update-visual`.
- Download preview tiles (`.dl-preview-white` / `-color`) must have the same border width, otherwise the mark in the colour tile renders 2px smaller. Measure sizes in the browser before concluding two marks differ: light-on-dark looks bigger than it is.
- `cloudcasa_icon_white` is already fully white (the icon has no wordmark), so a separate `all-white` icon would be a duplicate. For Catalogic/DPX/vStor/GuardMode `*-icon-white` keeps the coloured mark, so `all-white` is meaningful there.
- Copy: "All White" is only for when "White + Green Accent" does not work (e.g. the green clashes). The Usage rule says "white version", not "all-white".

## ZIP packages

- `python3 tools/build_zips.py` writes `assets/packages/*.zip` with this layout in every ZIP: `svg/`, `png/` (1x and @2x), `pdf/`, `source/` (the `.ai` files). Same layout in both repos.
- Entries carry the build date (not a fixed date) and a ZIP is only rewritten when its content changed, so rebuilding is idempotent. Delete a ZIP first to force a new timestamp. `--check` and `check.py` compare content only.
- After changing any SVG/PNG/PDF/AI, rebuild the ZIPs, otherwise `check.py` fails with "differs from assets file".

## Verify before handing over

1. Working tree clean and pushed (`git status -sb` shows no ahead/behind).
2. CI green on GitHub (`gh` is not installed on this machine; check in the browser or ask).
3. Local: `python3 tools/check.py`, lint (`npm ci --prefix tools && npm run lint --prefix tools`), `cd tests && npm test`.
4. Production smoke test: `cd tests && BASE_URL=<prod url> npm run test:production`. Last run on cloudcasa: 205 passed, 0 failed, 99 skipped (skips are defined in the tests).
5. Quick manual probes with curl: `curl -sI <url>/` shows 200 plus CSP/HSTS/X-Frame-Options; `/package.json` and `/.git/config` must be 404; a few `/assets/png/...all-white.png` return 200.
6. The Catalogic repo has the same setup in `dpx/tests/` (`cd dpx/tests && BASE_URL=<prod url> npm run test:production`). Last run: 205 passed, 0 failed, 99 skipped.
7. After a header, CSS or copy change run `npm run test:visual`; if the new look is intended, view the `*-actual.png` in `test-results/`, then `npm run test:update-visual` and commit the baselines.

## Machine gotchas (observed on the original author's Mac; may differ on yours)

- `git push` over SSH to the Catalogic repo hangs on the author's machine. Push over HTTPS, one commit at a time, with retries: `git -c http.postBuffer=524288000 -c http.version=HTTP/1.1 push https://github.com/nmikolajczyk-catalogicsoftware/Catalogic-brand-resource-center.git "${sha}:refs/heads/main"`. Always write `"${sha}:refs/..."`: in zsh a bare `$sha:refs` is mangled by the `:r` modifier. Kill hung pushes (`pkill -f "git push"`) before retrying.
- `npm test` includes Firefox, which hangs locally. Use `npm run test:chromium`, or `npx playwright test --project=webkit --project=mobile-chrome --project=mobile-safari`.
- If `npm` is not on PATH in the Claude Code shell, add your Node 22 install to PATH first (nvm: `$HOME/.nvm/versions/node/<version>/bin`).
- macOS has no `timeout` command; do not wrap with it.
- Playwright Firefox hung on the author's macOS 27 machine, so Firefox results come from CI only. `test:production` uses chromium, webkit and both mobile profiles.
- Visual baselines are macOS-only and not run in CI.

## Working rules learned

- Do not claim something about a file you did not open. Names suggest, images prove. Say plainly what was and was not checked (PNG viewed, PDF/ZIP not opened).
- Do not push, deploy or share links with others without the user's go-ahead; checking and reading is fine. Approval covers the commits that existed when it was given; ask again for later ones.
- After pushing, poll production until the new version is live (compare a changed file or `last-modified`), then verify on the live URL instead of assuming the deploy finished.
- User writes Polish; answer in Polish, keep code, commits and docs in English.
