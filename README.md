# CloudCasa Brand Resource Center

Static brand site for **CloudCasa by Catalogic**: logos, colors, typography, usage rules and downloads.
No framework and no runtime dependencies. Open `index.html` in a browser or host the folder on any static host.

## Layout

```
index.html              generated page (do not edit by hand)
index.template.html     page template: markup, CSS, copy
variants.json           every logo variant + brand colours (drives the download rows, ZIPs and checks)
assets/
  svg/                  SOURCE OF TRUTH for every logo (edit/replace these first)
  png/  docs/  source/  PNG (1x, 2x), PDF and AI exported from the SVGs
  packages/             ZIP downloads (generated)
  docs/brand-identity-cloudcasa-by-catalogic.pdf   brandbook (source of truth for the identity)
  js/tabs.js            ARIA tabs + hash routing
tools/                  build, ZIP, check and test scripts (+ illustrator/ export scripts)
tests/tabs.test.js      browser test
.github/workflows/ci.yml
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

Everything runs with the Python 3 standard library only.

| Task | Command |
|---|---|
| Rebuild the page after editing `index.template.html` or `variants.json` | `python3 tools/build.py` |
| Rebuild the ZIP packages after changing any asset | `python3 tools/build_zips.py` |
| Run all integrity checks (links, formats, colours, markup, ZIP contents) | `python3 tools/check.py` |
| Run the browser tests (needs Chrome; set `CHROME=` if not auto-detected) | `python3 tools/test_browser.py` |

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

`.github/workflows/ci.yml` runs the generated-file checks, `tools/check.py` and the browser tests on every push and pull
request. `check.py` also guards the layout rules: no inline `style`/`onclick`, every `<img>` has `alt`, `width` and
`height`, exactly one `<h1>`, one `header`/`main`/`footer`, and every tab controls an existing panel.

## Known limitations / hand-over notes

- The **brandbook PDF has no "All White" page** yet. The PDF is the source of truth and is edited by the design owner; the
  site already offers the all-white logo files.
- The two spot swatches are created **by name** (with the brandbook CMYK alternates), not picked from the Pantone library.
  Open one `*_spot.pdf` in Illustrator's Separations Preview before sending it to a printer.
- Illustrator-exported SVGs carry Adobe XMP metadata (document IDs); harmless, but it changes on every re-export.
- No `og:image` is set: Open Graph needs an absolute public URL, which depends on where the site is hosted.
- The CI workflow has been validated locally (YAML parses, every command passes from a clean clone) but was not run on GitHub yet.
