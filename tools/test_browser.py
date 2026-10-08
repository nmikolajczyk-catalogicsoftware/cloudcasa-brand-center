#!/usr/bin/env python3
"""Run tests/tabs.test.js in headless Chrome against index.html (needs Google Chrome / Chromium).

    python3 tools/test_browser.py            # auto-detects Chrome, or set CHROME=/path/to/chrome
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "google-chrome-stable",
              "chromium", "chromium-browser", "chrome"]


def find_chrome():
    for candidate in [os.environ.get("CHROME")] + CANDIDATES:
        if candidate and (Path(candidate).exists() or shutil.which(candidate)):
            return candidate
    sys.exit("Chrome not found; set CHROME=/path/to/chrome")


def run(chrome, page, hash_):
    page_html = (ROOT / "index.html").read_text()
    script = f"<script>{(ROOT / 'tests' / 'tabs.test.js').read_text()}</script>"
    temp = ROOT / "_browser_test.html"
    temp.write_text(page_html.replace("</body>", script + "</body>"))
    try:
        out = subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files",
                              "--virtual-time-budget=8000", "--dump-dom", f"file://{temp}{hash_}"],
                             capture_output=True, text=True, timeout=120).stdout
    finally:
        temp.unlink(missing_ok=True)
    start = out.find("<title>")
    title = out[start + 7:out.find("</title>", start)] if start >= 0 else ""
    return [r.replace("&gt;", ">").replace("&amp;", "&") for r in title.split(" || ") if r]


if __name__ == "__main__":
    chrome, failed, total = find_chrome(), 0, 0
    for hash_ in ["", "#typography", "#downloads", "#%", "#%E0%A4%A", "#unknown-section"]:
        results = run(chrome, "index.html", hash_)
        if not results:
            sys.exit(f"no test output for hash '{hash_}'")
        for line in results:
            total += 1
            if line.startswith("FAIL"):
                failed += 1
                print(f"[{hash_ or 'no hash'}] {line}")
    print(f"{total - failed}/{total} browser checks passed")
    sys.exit(1 if failed else 0)
