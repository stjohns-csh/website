#!/usr/bin/env python3
"""
Put a row of social links in the footer of every page.

The footer is duplicated across all the HTML files, so this has to be a script.
It replaces the single diocese line at the bottom of the footer with a row that
holds the diocese line on the left and the social icons on the right.

To add or remove an account, edit SOCIALS below and run this again. It is safe
to run repeatedly — it recognises its own previous output and replaces it.

    python3 tools/add-footer-socials.py           # write the changes
    python3 tools/add-footer-socials.py --check   # report only, change nothing

If you add an account here, add its URL to the "sameAs" list in the structured
data at the top of index.html too. That is how Google learns the accounts
belong to the same parish.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# name, URL, and an inline SVG path. Icons are drawn rather than loaded so the
# footer costs no extra requests and stays crisp at any size.
SOCIALS = [
    (
        "Facebook",
        "https://www.facebook.com/stjcsh",
        "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.9 3.77-3.9 1.1 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33v7C18.34 21.21 22 17.06 22 12.06Z",
    ),
    (
        "YouTube",
        "https://www.youtube.com/channel/UC7hsIp3gxQDWVRZxvYROo-g",
        "M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.5 2.5 0 0 0 2.42 7.19 26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z",
    ),
    # Instagram — uncomment and set the real handle once it is confirmed.
    # (
    #     "Instagram",
    #     "https://www.instagram.com/HANDLE/",
    #     "M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.8.22 2.43.46.66.26 1.22.6 1.77 1.16.56.55.9 1.11 1.16 1.77.24.63.41 1.36.46 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.8-.46 2.43a4.9 4.9 0 0 1-1.16 1.77c-.55.56-1.11.9-1.77 1.16-.63.24-1.36.41-2.43.46-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.8-.22-2.43-.46a4.9 4.9 0 0 1-1.77-1.16 4.9 4.9 0 0 1-1.16-1.77c-.24-.63-.41-1.36-.46-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.8.46-2.43.26-.66.6-1.22 1.16-1.77A4.9 4.9 0 0 1 5.45 2.52c.63-.24 1.36-.41 2.43-.46C8.94 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.98.04-1.5.2-1.86.34-.47.18-.8.4-1.15.75-.35.35-.57.68-.75 1.15-.14.36-.3.88-.34 1.86-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.98.2 1.5.34 1.86.18.47.4.8.75 1.15.35.35.68.57 1.15.75.36.14.88.3 1.86.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.98-.04 1.5-.2 1.86-.34.47-.18.8-.4 1.15-.75.35-.35.57-.68.75-1.15.14-.36.3-.88.34-1.86.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.98-.2-1.5-.34-1.86a3.1 3.1 0 0 0-.75-1.15 3.1 3.1 0 0 0-1.15-.75c-.36-.14-.88-.3-1.86-.34-1.05-.05-1.37-.06-4.04-.06Zm0 3.06a5.14 5.14 0 1 1 0 10.28 5.14 5.14 0 0 1 0-10.28Zm0 8.48a3.34 3.34 0 1 0 0-6.68 3.34 3.34 0 0 0 0 6.68Zm6.54-8.68a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z",
    # ),
]

DIOCESE = "A parish of the Episcopal Diocese of Long Island."

START = "<!-- footer-socials:start -->"
END = "<!-- footer-socials:end -->"

# Either the original single line, or a block this script wrote before.
TARGET_RE = re.compile(
    re.escape(START) + r".*?" + re.escape(END)
    + r"|<p style=\"margin-top:26px;font-size:\.86rem;opacity:\.85\">"
    + re.escape(DIOCESE) + r"</p>",
    re.S,
)


def build_block() -> str:
    links = []
    for name, url, path in SOCIALS:
        links.append(
            f'<a href="{url}" aria-label="St. John&rsquo;s on {name}" title="{name}">'
            f'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
            f'<path fill="currentColor" d="{path}"/></svg></a>'
        )
    return (
        f"{START}\n"
        '<div class="footbar">\n'
        f"<p>{DIOCESE}</p>\n"
        '<nav class="social" aria-label="St. John&rsquo;s on social media">\n'
        + "\n".join(links)
        + "\n</nav>\n"
        "</div>\n"
        f"{END}"
    )


def main() -> int:
    check_only = "--check" in sys.argv
    block = build_block()

    files = sorted(
        p for p in ROOT.rglob("*.html")
        if ".git" not in p.parts and "node_modules" not in p.parts
    )
    changed = missing = 0

    for path in files:
        html = path.read_text(encoding="utf-8")
        new, n = TARGET_RE.subn(lambda _m: block, html, count=1)
        if n != 1:
            print(f"  MISSING footer line in {path.relative_to(ROOT)}")
            missing += 1
            continue
        if new == html:
            print(f"  ok   {path.relative_to(ROOT)} — already current")
            continue
        changed += 1
        print(f"  {'would update' if check_only else 'updated'} {path.relative_to(ROOT)}")
        if not check_only:
            path.write_text(new, encoding="utf-8")

    accounts = ", ".join(n for n, _, _ in SOCIALS)
    print(f"\n{changed} changed, {missing} missing, {len(files)} files seen.")
    print(f"Linking: {accounts}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
