#!/usr/bin/env python3
"""
Write sitemap.xml from whatever HTML pages actually exist.

Run this after adding or removing a page. It walks the repo, applies the same
URL rule the canonical tags use (a directory index becomes its directory, with
a trailing slash), and takes each page's last-modified date from git.

404.html is left out on purpose — an error page should not be in a sitemap.

    python3 tools/build-sitemap.py
"""

import datetime
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://stjcsh.org"
EXCLUDE = {"404.html"}

# Pages a newcomer is most likely to want. Search engines treat priority as a
# hint at best, but it costs nothing to say what matters.
PRIORITY = {
    "/": "1.0",
    "/worship/": "0.9",
    "/welcome-to-st-johns/": "0.9",
    "/events/": "0.8",
    "/live/": "0.8",
    "/contact/": "0.8",
}


def url_for(path: pathlib.Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel


def last_modified(path: pathlib.Path) -> str:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path)],
            cwd=ROOT, capture_output=True, text=True, timeout=10,
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except Exception:
        pass
    return datetime.date.today().isoformat()


def main() -> int:
    pages = sorted(
        p for p in ROOT.rglob("*.html")
        if ".git" not in p.parts
        and "node_modules" not in p.parts
        and p.name not in EXCLUDE
    )

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for p in pages:
        path = url_for(p)
        lines += [
            "  <url>",
            f"    <loc>{SITE}{path}</loc>",
            f"    <lastmod>{last_modified(p)}</lastmod>",
            f"    <priority>{PRIORITY.get(path, '0.7')}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")

    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote sitemap.xml with {len(pages)} pages.")
    for p in pages:
        print("  " + SITE + url_for(p))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
