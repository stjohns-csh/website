#!/usr/bin/env python3
"""Add "Sermons" to the Worship dropdown and the footer's Worship column, on every page.

Safe to run twice: a page that already links /sermons/ in a given place is left alone.
Pages with no Worship menu (privacy, terms, the sign-up and card pages) are skipped
and reported, not treated as errors.

    python3 tools/add-sermons-nav.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ANCHOR = '<li><a href="/live/">Watch Live</a></li>\n'
ANCHOR_CURRENT = '<li><a href="/live/" aria-current="page">Watch Live</a></li>\n'
NEW = '<li><a href="/sermons/">Sermons</a></li>\n'
NEW_CURRENT = '<li><a href="/sermons/" aria-current="page">Sermons</a></li>\n'

changed = skipped = problems = 0
for path in sorted(ROOT.rglob("*.html")):
    rel = path.relative_to(ROOT)
    if "node_modules" in rel.parts or rel.parts[0].startswith("_"):
        continue
    s = path.read_text(encoding="utf-8")
    if 'id="worship-menu"' not in s:
        print("skip (no Worship menu):", rel); skipped += 1; continue
    is_sermons = rel.as_posix() == "sermons/index.html"
    out, n = s, 0
    # 1. the dropdown: the Watch Live item inside id="worship-menu"
    start = out.index('id="worship-menu"')
    end = out.index("</ul>", start)
    block = out[start:end]
    if 'href="/sermons/"' not in block:
        anchor = next((a for a in (ANCHOR, ANCHOR_CURRENT) if a in block), None)
        if not anchor:
            print("PROBLEM: no Watch Live in menu:", rel); problems += 1; continue
        block = block.replace(anchor, anchor + (NEW_CURRENT if is_sermons else NEW), 1)
        out = out[:start] + block + out[end:]; n += 1
    # 2. the footer's Worship column (always after the nav, so search past the menu)
    f = out.index("<footer")
    foot = out[f:]
    if 'href="/sermons/"' not in foot:
        if ANCHOR not in foot:
            print("PROBLEM: no Watch Live in footer:", rel); problems += 1; continue
        foot = foot.replace(ANCHOR, ANCHOR + NEW, 1)
        out = out[:f] + foot; n += 1
    if n:
        path.write_text(out, encoding="utf-8"); changed += 1
        print("updated (%d place%s):" % (n, "" if n == 1 else "s"), rel)
print("\n%d updated, %d skipped, %d problems" % (changed, skipped, problems))
