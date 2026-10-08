#!/usr/bin/env python3
"""Repository integrity checks (no dependencies, no browser). Exit code 1 on any problem.

    python3 tools/check.py
"""
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
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


# ---- file-level integrity -------------------------------------------------------------------

def svg_size(path):
    """(width, height) from the viewBox; also proves the SVG is well-formed XML with an <svg> root."""
    root = ET.parse(path).getroot()
    if not root.tag.endswith("}svg") and root.tag != "svg":
        raise ValueError("root element is not <svg>")
    _, _, w, h = (float(v) for v in root.attrib["viewBox"].split())
    return w, h


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    return struct.unpack(">II", data[16:24])


def pdf_mediabox(data):
    match = re.search(rb"/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]", data)
    if not match:
        raise ValueError("no MediaBox")
    x0, y0, x1, y1 = (float(v) for v in match.groups())
    return x1 - x0, y1 - y0


def same_aspect(w, h, aspect, tolerance=0.005, pixels=None):
    """True if w:h matches `aspect` within a relative tolerance, or (for raster sizes that Illustrator
    rounds to whole pixels) within `pixels` pixels on either side."""
    if abs(w / h - aspect) / aspect <= tolerance:
        return True
    return pixels is not None and (abs(h * aspect - w) <= pixels or abs(w / aspect - h) <= pixels)


def check_file_integrity(stems):
    for stem in stems:
        try:
            sw, sh = svg_size(ASSETS / "svg" / f"{stem}.svg")
        except Exception as exc:  # noqa: BLE001 - report any parse problem
            fail(f"{stem}.svg: {exc}")
            continue
        aspect = sw / sh

        sizes = {}
        for suffix in ("", "@2x"):
            path = ASSETS / "png" / f"{stem}{suffix}.png"
            try:
                sizes[suffix] = png_size(path.read_bytes())
            except Exception as exc:  # noqa: BLE001
                fail(f"{path.name}: {exc}")
                continue
            w, h = sizes[suffix]
            if not same_aspect(w, h, aspect, pixels=1.5):
                fail(f"{path.name}: {w}x{h} does not match the SVG proportions {sw:g}x{sh:g}")
        if len(sizes) == 2 and abs(sizes["@2x"][0] - 2 * sizes[""][0]) > 2:
            fail(f"{stem}: @2x PNG is not twice the 1x width ({sizes['@2x'][0]} vs {sizes[''][0]})")

        for folder, ext in (("docs", "pdf"), ("source", "ai")):
            path = ASSETS / folder / f"{stem}.{ext}"
            data = path.read_bytes()
            if not data.startswith(b"%PDF-"):
                fail(f"{path.name}: not PDF-compatible (missing %PDF- header)")
                continue
            try:
                w, h = pdf_mediabox(data)
                if not same_aspect(w, h, aspect, tolerance=0.01):
                    fail(f"{path.name}: page {w:g}x{h:g}pt does not match the SVG proportions {sw:g}x{sh:g}")
            except ValueError as exc:
                fail(f"{path.name}: {exc}")
            if stem.endswith("_spot"):
                names = [b"PANTONE Pink C"] + ([] if "icon" in stem else [b"PANTONE Black 6 C"])
                for name in names:
                    if name not in data:
                        fail(f"{path.name}: spot swatch {name.decode()} not found")


def check_deploy_config():
    config = json.loads((ROOT / "vercel.json").read_text())
    headers = {h["key"]: h["value"] for rule in config["headers"] for h in rule["headers"]}
    csp = headers.get("Content-Security-Policy", "")
    if not csp:
        fail("vercel.json: missing Content-Security-Policy")
    for forbidden in ("unsafe-inline", "unsafe-eval", "*"):
        if re.search(rf"(?<![\w-]){re.escape(forbidden)}(?![\w-])", csp.replace("https://", "")):
            fail(f"vercel.json: CSP contains {forbidden!r}")
    for directive in ("default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"):
        if directive not in csp:
            fail(f"vercel.json: CSP is missing {directive}")
    for key in ("X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"):
        if key not in headers:
            fail(f"vercel.json: missing header {key}")
    if not (ROOT / ".vercelignore").exists():
        fail("missing .vercelignore")


def main():
    data = json.loads((ROOT / "variants.json").read_text())
    html = (ROOT / "index.html").read_text()

    # 1. generated files are current
    try:
        if build.build() != html:
            fail("index.html is out of date (run tools/build.py)")
    except Exception as exc:  # noqa: BLE001 - a broken asset must be reported, not crash the checker
        fail(f"index.html cannot be generated: {exc!r}")
    try:
        for problem in build_zips.problems():
            fail(f"zip: {problem} (run tools/build_zips.py)")
    except Exception as exc:  # noqa: BLE001
        fail(f"zip check crashed: {exc!r}")

    # 2. every variant has every format
    stems = [s for group in build.variant_stems(data).values() for s in group]
    for stem in stems:
        for disk, ext in [("svg", ".svg"), ("png", ".png"), ("png", "@2x.png"), ("docs", ".pdf"), ("source", ".ai")]:
            if not (ASSETS / disk / f"{stem}{ext}").exists():
                fail(f"missing asset: assets/{disk}/{stem}{ext}")

    check_file_integrity(stems)
    check_deploy_config()
    for style_tag in re.findall(r"<style", html):
        fail("inline <style> block found (use assets/css/*.css so the CSP can stay strict)")

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
    tab_names = {attrs.get("data-tab") for tag, attrs in tags if attrs.get("role") == "tab"}
    for tag, attrs in tags:
        if attrs.get("role") == "tab" and attrs.get("aria-controls") not in page.ids:
            fail(f"tab controls a missing panel: {attrs.get('aria-controls')}")
        href = attrs.get("href", "")
        if tag == "a" and href.startswith("#") and len(href) > 1:
            if href[1:] not in page.ids and href[1:] not in tab_names:
                fail(f"in-page link points nowhere: {href}")


if __name__ == "__main__":
    main()
    if errors:
        print("\n".join(f"FAIL {e}" for e in errors))
        sys.exit(1)
    print("all checks passed")
