#!/usr/bin/env python3
"""
Add social-share tags, favicon links, and canonical URLs to every page.

Why this exists
---------------
Header, nav, and footer are duplicated across all the HTML files, so anything
that belongs in every page has to be written by a script rather than by hand.
This one handles the <head>: the tags that decide what a shared link looks
like in a text message or on Facebook, and what icon shows in a browser tab.

It is safe to run more than once. Existing blocks are replaced, not stacked.

    python3 tools/add-head-meta.py            # write the changes
    python3 tools/add-head-meta.py --check    # report only, change nothing
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://stjcsh.org"
OG_IMAGE = f"{SITE}/assets/og-image.jpg"
OG_IMAGE_ALT = "St. John&rsquo;s Episcopal Church, Cold Spring Harbor"
BRAND_BLUE = "#004687"

START = "<!-- head-meta:start -->"
END = "<!-- head-meta:end -->"
BLOCK_RE = re.compile(re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S)
DESC_RE = re.compile(r'<meta name="description" content="(.*?)">')
# Anchor: we insert immediately after the description tag, which every page has.
ANCHOR_RE = re.compile(r'(<meta name="description" content=".*?">\n)')


def canonical_for(path: pathlib.Path) -> str:
    """Directory-index pages canonicalise to their directory, with trailing slash."""
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return SITE + "/"
    if rel.endswith("/index.html"):
        return f"{SITE}/{rel[:-len('index.html')]}"
    return f"{SITE}/{rel}"


def build_block(title: str, desc: str, canonical: str, indexable: bool) -> str:
    lines = [START]

    if indexable:
        lines.append(f'<link rel="canonical" href="{canonical}">')
    else:
        lines.append('<meta name="robots" content="noindex,follow">')

    lines += [
        "",
        "<!-- How this link looks when someone shares it -->",
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="St. John&#x27;s Episcopal Church">',
        f'<meta property="og:title" content="{title}">',
        f'<meta property="og:description" content="{desc}">',
        f'<meta property="og:url" content="{canonical}">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{OG_IMAGE_ALT}">',
        '<meta property="og:locale" content="en_US">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{title}">',
        f'<meta name="twitter:description" content="{desc}">',
        f'<meta name="twitter:image" content="{OG_IMAGE}">',
        "",
        "<!-- Browser tab and home-screen icons -->",
        '<link rel="icon" href="/favicon.ico" sizes="any">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">',
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">',
        f'<meta name="theme-color" content="{BRAND_BLUE}">',
        END,
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    check_only = "--check" in sys.argv
    files = sorted(
        p for p in ROOT.rglob("*.html")
        if ".git" not in p.parts and "node_modules" not in p.parts
    )
    if not files:
        print("No HTML files found — is the path right?")
        return 1

    changed = skipped = 0
    for path in files:
        html = path.read_text(encoding="utf-8")

        title_m = TITLE_RE.search(html)
        desc_m = DESC_RE.search(html)
        if not title_m or not desc_m:
            print(f"  SKIP {path.relative_to(ROOT)} — no <title> or description")
            skipped += 1
            continue

        # Strip any previous run before measuring the anchor.
        cleaned = BLOCK_RE.sub("", html)

        indexable = path.name != "404.html"
        block = build_block(
            title_m.group(1).strip(),
            desc_m.group(1).strip(),
            canonical_for(path),
            indexable,
        )

        new, n = ANCHOR_RE.subn(lambda m: m.group(1) + block, cleaned, count=1)
        if n != 1:
            print(f"  SKIP {path.relative_to(ROOT)} — anchor not found")
            skipped += 1
            continue

        if new == html:
            print(f"  ok   {path.relative_to(ROOT)} — already current")
            continue

        changed += 1
        print(f"  {'would update' if check_only else 'updated'} {path.relative_to(ROOT)}")
        if not check_only:
            path.write_text(new, encoding="utf-8")

    print(f"\n{changed} changed, {skipped} skipped, {len(files)} files seen.")
    return 1 if skipped else 0


if __name__ == "__main__":
    raise SystemExit(main())
