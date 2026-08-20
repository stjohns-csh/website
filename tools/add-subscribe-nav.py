#!/usr/bin/env python3
"""Add "Subscribe to Parish Communications" to the Life at St. John's dropdown
and to the footer "Reading" column, in every HTML file.

Header, nav and footer are duplicated across all pages, so this is done by
script rather than by hand. Safe to run twice: it skips files that already
have the link.

    python3 tools/add-subscribe-nav.py
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

NAV_ANCHOR = '<li><a href="/reflections/">Sunday Reflections</a></li>'
NAV_ANCHOR_CURRENT = '<li><a href="/reflections/" aria-current="page">Sunday Reflections</a></li>'
NAV_NEW = '<li><a href="/subscribe/">Subscribe to Parish Communications</a></li>'
NAV_NEW_CURRENT = '<li><a href="/subscribe/" aria-current="page">Subscribe to Parish Communications</a></li>'

FOOT_ANCHOR = '<li><a href="/reflections/">Sunday Reflections</a></li>'
FOOT_NEW = '<li><a href="/subscribe/">Subscribe</a></li>'


def update(path: pathlib.Path) -> str:
    html = path.read_text(encoding="utf-8")
    # Guard on the href, not the bare path: the subscribe page's own form
    # action points at Mailchimp's ".../subscribe/post" endpoint.
    if 'href="/subscribe/"' in html:
        return "already has it"

    is_subscribe_page = path.parent.name == "subscribe"
    before = html

    # --- nav dropdown -------------------------------------------------
    # The Sunday Reflections item appears twice: once in the nav dropdown,
    # once in the footer's Reading column. Only the first is inside #life-menu.
    start = html.find('id="life-menu"')
    if start == -1:
        return "SKIPPED: no #life-menu"
    end = html.find("</ul>", start)
    block = html[start:end]

    anchor = NAV_ANCHOR_CURRENT if NAV_ANCHOR_CURRENT in block else NAV_ANCHOR
    if anchor not in block:
        return "SKIPPED: no Sunday Reflections item in #life-menu"

    new_item = NAV_NEW_CURRENT if is_subscribe_page else NAV_NEW
    block = block.replace(anchor, anchor + "\n" + new_item, 1)
    html = html[:start] + block + html[end:]

    # --- footer Reading column ---------------------------------------
    foot_start = html.find("<footer")
    if foot_start != -1 and FOOT_ANCHOR in html[foot_start:]:
        tail = html[foot_start:].replace(FOOT_ANCHOR, FOOT_ANCHOR + "\n" + FOOT_NEW, 1)
        html = html[:foot_start] + tail

    if html == before:
        return "no change"
    path.write_text(html, encoding="utf-8")
    return "updated"


def main() -> int:
    files = sorted(p for p in ROOT.rglob("*.html") if "node_modules" not in p.parts)
    problems = 0
    for path in files:
        result = update(path)
        if result.startswith("SKIPPED"):
            problems += 1
        print(f"{path.relative_to(ROOT)}: {result}")
    print(f"\n{len(files)} files, {problems} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
