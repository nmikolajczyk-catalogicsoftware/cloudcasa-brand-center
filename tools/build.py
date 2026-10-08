#!/usr/bin/env python3
"""Generate index.html from index.template.html + variants.json.

The download rows are plain static HTML (no client-side patching), so the
page works without JavaScript. Run from the repo root:  python3 tools/build.py
Pass --check to fail if the committed index.html is out of date.
"""
import json
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "<!-- @@DOWNLOAD_SECTIONS@@ -->"
ZIP_ICON = ('<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left:6px;vertical-align:-1px;">'
            '<path d="M6 1V8M6 8L3 5M6 8L9 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="M2 10.5H10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>')
# (label, css class, folder, file suffix) in display order
BUTTONS = [("SVG", "dl-btn-svg", "svg", ".svg"), ("PNG", "dl-btn-png", "png", ".png"),
           ("PNG 2x", "dl-btn-png", "png", "@2x.png"), ("AI", "dl-btn-ai", "source", ".ai"),
           ("PDF", "dl-btn-pdf", "docs", ".pdf")]


def row(group, kind):
    stem = f'{group["base"]}_{kind["suffix"]}'
    badge = f' <span class="badge">{kind["badge"]}</span>' if kind.get("badge") else ""
    alt = escape(f'{group["label"]} logo, {kind["alt"]}')
    buttons = "".join(
        f'<a class="dl-btn {cls}" href="assets/{folder}/{stem}{ext}" download>{label}</a>'
        for label, cls, folder, ext in BUTTONS)
    return (f'    <div class="dl-row"><div class="dl-left"><div class="dl-preview dl-preview-wide dl-preview-{kind["preview"]}">'
            f'<img src="assets/svg/{stem}.svg" alt="{alt}"></div>'
            f'<div class="dl-info"><span class="dl-name">{kind["name"]}{badge}</span>'
            f'<span class="dl-desc">{kind["desc"]}</span></div></div>'
            f'<div class="dl-buttons">{buttons}</div></div>\n')


def section(sec, kinds):
    out = (f'  <div class="section-title section-title-with-action" id="{sec["id"]}"><span>{sec["title"]}</span>'
           f'<div class="section-title-actions"><a class="section-title-zip" href="assets/packages/{sec["zip"]}" download>'
           f'Download ZIP{ZIP_ICON}</a></div></div>\n  <div class="dl-section-card">\n')
    for group in sec["groups"]:
        if group.get("name"):
            out += f'    <div class="dl-group">{group["name"]}</div>\n'
        out += "".join(row(group, kinds[k]) for k in group["kinds"])
    return out + "  </div>\n\n"


def build():
    data = json.loads((ROOT / "variants.json").read_text())
    template = (ROOT / "index.template.html").read_text()
    assert template.count(MARKER) == 1, "template must contain exactly one marker"
    return template.replace(MARKER, "".join(section(s, data["kinds"]) for s in data["sections"]))


if __name__ == "__main__":
    html = build()
    target = ROOT / "index.html"
    if "--check" in sys.argv:
        sys.exit(0 if target.read_text() == html else "index.html is out of date; run tools/build.py")
    target.write_text(html)
    print(f"wrote {target.relative_to(ROOT)} ({len(html) // 1024} KB)")
