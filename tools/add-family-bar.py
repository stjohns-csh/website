#!/usr/bin/env python3
"""Add the "St. John's Family of Websites" bar to the bottom of the footer,
in every HTML file.

Header, nav and footer are duplicated across all pages, so this is done by
script rather than by hand. Safe to run more than once: the block is
replaced, not stacked.

    python3 tools/add-family-bar.py            # write the changes
    python3 tools/add-family-bar.py --check     # report only, change nothing
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

START = "<!-- family-bar:start -->"
END = "<!-- family-bar:end -->"
BLOCK_RE = re.compile(re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)

ANCHOR = "<!-- footer-socials:end -->\n"

BLOCK = (
    START + "\n"
    '<div class="family-bar"><div class="wrap">\n'
    '<span class="family-label">St. John&rsquo;s Family of Websites</span>\n'
    '<nav aria-label="St. John&rsquo;s family of websites">\n'
    '<a href="https://bluegreentheology.org">BlueGreen Theology</a>\n'
    '<a href="https://concertsbythepond.org">Concerts by the Pond</a>\n'
    '<a href="https://sjpwa.org">St. John&rsquo;s Pond Watershed Alliance</a>\n'
    '<a href="https://save-the-pond.org">Save the Pond</a>\n'
    "</nav>\n"
    "</div></div>\n"
    + END + "\n"
)


def update(path: pathlib.Path, check: bool) -> str:
    html = path.read_text(encoding="utf-8")
    before = html

    if BLOCK_RE.search(html):
        html = BLOCK_RE.sub(BLOCK, html, count=1)
    elif ANCHOR in html:
        html = html.replace(ANCHOR, ANCHOR + BLOCK, 1)
    else:
        return "SKIPPED: no footer-socials:end anchor"

    if html == before:
        return "no change"
    if not check:
        path.write_text(html, encoding="utf-8")
    return "would update" if check else "updated"


def main() -> int:
    check = "--check" in sys.argv
    files = sorted(p for p in ROOT.rglob("*.html") if "node_modules" not in p.parts)
    problems = 0
    for path in files:
        result = update(path, check)
        if result.startswith("SKIPPED"):
            problems += 1
        print(f"{path.relative_to(ROOT)}: {result}")
    print(f"\n{len(files)} files, {problems} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
