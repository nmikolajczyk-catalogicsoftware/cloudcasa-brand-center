# CloudCasa Brand Resource Center

Static brand site for CloudCasa by Catalogic. Open `index.html` in a browser; there is no runtime dependency.

## Editing the download rows

`index.html` is **generated**. Do not edit the download sections by hand.

- `variants.json` lists every logo variant (sections, groups, kinds). Add a variant by adding its kind to a group.
- `index.template.html` holds the rest of the page.
- Build: `python3 tools/build.py` (add `--check` to verify `index.html` is up to date).

Each variant `<base>_<kind>` expects these files:
`assets/svg/<name>.svg`, `assets/png/<name>.png`, `assets/png/<name>@2x.png`, `assets/source/<name>.ai`, `assets/docs/<name>.pdf`.

## Tabs

`assets/js/tabs.js` implements the ARIA tab pattern (arrow keys, Home/End) and hash routing: `#colors` opens a tab and
`#dl-bycat` deep-links to a download section. The same file is used by the Catalogic brand center; keep both copies identical.
