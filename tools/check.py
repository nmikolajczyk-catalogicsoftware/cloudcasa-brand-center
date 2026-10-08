#!/usr/bin/env python3
"""Repository integrity checks (no dependencies, no browser). Exit code 1 on any problem.

    python3 tools/check.py
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
import build_zips  # noqa: E402

ROOT = build.ROOT
ASSETS = ROOT / "assets"
errors = []


def fail(msg):
    errors.append(msg)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
        if dict(attrs).get("id"):
            self.ids.append(dict(attrs)["id"])


def main():
    data = json.loads((ROOT / "variants.json").read_text())
    html = (ROOT / "index.html").read_text()

    # 1. generated files are current
    if build.build() != html:
        fail("index.html is out of date (run tools/build.py)")
    for problem in build_zips.problems():
        fail(f"zip: {problem} (run tools/build_zips.py)")

    # 2. every variant has every format
    stems = [s for group in build.variant_stems(data).values() for s in group]
    for stem in stems:
        for disk, ext in [("svg", ".svg"), ("png", ".png"), ("png", "@2x.png"), ("docs", ".pdf"), ("source", ".ai")]:
            if not (ASSETS / disk / f"{stem}{ext}").exists():
                fail(f"missing asset: assets/{disk}/{stem}{ext}")

    # 3. SVGs only use brand colours
    allowed = {c.lower() for c in data["brand_colors"]}
    for svg in sorted((ASSETS / "svg").glob("*.svg")):
        colours = {c.lower() for c in re.findall(r"#[0-9a-fA-F]{6}\b", svg.read_text())}
        if colours - allowed:
            fail(f"{svg.name}: off-brand colours {sorted(colours - allowed)}")

    # 4. every local link/src resolves
    for ref in sorted(set(re.findall(r'(?:href|src)="(assets/[^"]+)"', html))):
        if not (ROOT / ref).exists():
            fail(f"broken link: {ref}")

    # 5. markup hygiene
    page = Page()
    page.feed(html)
    tags = page.tags
    if re.search(r"<body.*?\sstyle=|<[a-z]+[^>]*\sstyle=", html[html.index("<body"):]):
        fail("inline style attribute found (use a CSS class)")
    if "onclick=" in html:
        fail("inline onclick handler found (use assets/js/tabs.js)")
    for tag, attrs in tags:
        if tag == "img":
            if "alt" not in attrs:
                fail(f"img without alt: {attrs.get('src')}")
            if "width" not in attrs or "height" not in attrs:
                fail(f"img without width/height: {attrs.get('src')}")
    for landmark in ("header", "main", "footer"):
        if sum(t == landmark for t, _ in tags) != 1:
            fail(f"expected exactly one <{landmark}>")
    if sum(t == "h1" for t, _ in tags) != 1:
        fail("expected exactly one <h1>")
    duplicates = {i for i in page.ids if page.ids.count(i) > 1}
    if duplicates:
        fail(f"duplicate ids: {sorted(duplicates)}")
    for tag, attrs in tags:
        if attrs.get("role") == "tab" and attrs.get("aria-controls") not in page.ids:
            fail(f"tab controls a missing panel: {attrs.get('aria-controls')}")
        if "data-dl" in attrs and attrs["data-dl"] not in page.ids:
            fail(f"card links to a missing section: {attrs['data-dl']}")


if __name__ == "__main__":
    main()
    if errors:
        print("\n".join(f"FAIL {e}" for e in errors))
        sys.exit(1)
    print("all checks passed")
