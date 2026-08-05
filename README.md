# St. John's Episcopal Church — Website

This repository holds the complete source of the parish website published at **[stjcsh.org](https://stjcsh.org)**. It is a plain **static HTML site** — there is no complicated build step and no content management system to keep running. What you see in these files is exactly what gets published.

This repo is owned by the parish GitHub organization **`stjohns-csh`**, so it does not depend on any one person's personal account.

---

## How the site is published (deployment)

The site is hosted on **Netlify**, under the parish Netlify team **"St. John's Church."** Netlify watches this repository: when a change is saved to the `main` branch, Netlify automatically rebuilds and publishes the site within a minute or two. There is nothing to upload by hand.

Netlify settings that matter:

- **Publish directory:** the repository root (this folder). `index.html` is the home page.
- **Functions directory:** `netlify/functions` (set automatically by `netlify.toml`).
- **Domain:** `stjcsh.org`, using Netlify DNS. The domain is registered at GoDaddy (registrar only). Email is Google Workspace and is unaffected by anything in this repo.

---

## What's in here

```
index.html                     Home page
404.html                       "Page not found" page
_redirects                     Sends old WordPress URLs to the archive sites
netlify.toml                   Netlify configuration (functions)
assets/                        Stylesheet (site.css), logo, and all page photographs
welcome-to-st-johns/           Welcome page (+ clergy-and-staff/)
worship/                       Worship page (+ baptism/, weddings/, funeral-services/)
music/  news/  contact/        Standard pages
give/  pledge/                 Giving pages
live/                          Online / livestream worship page
community/caring-connection/   Caring Connection page
netlify/functions/             The three "self-updating" features (see below)
```

Each page lives in its own folder as an `index.html` file, which is why the web addresses are clean (for example, `stjcsh.org/worship/` rather than `worship.html`).

## Design

The look is the parish's **"Harbor Heritage"** theme:

- Signature blue **#004687**, dusty-blue accent **#8CA9C6**
- **Cormorant Garamond** for headings and the wordmark, **PT Sans** for body text
- Every page opens with a full-width hero photograph (the parish's own photography)

All styling lives in one file: `assets/site.css`.

## The three self-updating features

These small programs (in `netlify/functions/`) refresh parts of the site automatically. **They read public feeds only — there are no passwords or API keys involved**, which is why this repository is safe to be public.

- **`newsletter.mjs`** — shows the most recent "At St. John's" Mailchimp newsletters on the News page.
- **`latest-video.mjs`** — shows the most recent video from the church's YouTube channel on the home page.
- **`latest-sermon.mjs`** — shows the most recent sermon from the "Sermons from St. John's" YouTube playlist on the Worship page.

If a feed's address ever changes (a new Mailchimp list, a new YouTube channel), the address is written near the top of the matching file.

## Editing the site

For everyday content changes (service times, staff, wording), the friendly way is through the **Decap CMS editor** (planned, at `stjcsh.org/admin`) — it presents simple forms and saves changes here for you; you never touch code.

To edit the files directly, change the relevant `index.html`, save to `main`, and Netlify republishes automatically. Photographs go in `assets/`.

## What not to touch

- Don't delete `netlify.toml`, `_redirects`, or the `netlify/functions/` folder — these keep deployment, old-link redirects, and the auto-updating features working.
- Don't rename the top-level page folders (it would change and break existing web addresses).

## Related parish web accounts

Everything is anchored to the shared address **web@stjcsh.org** (not any individual):

- **GitHub:** organization `stjohns-csh` (this repo lives here)
- **Netlify:** team "St. John's Church" (hosting + DNS)
- **Domain registrar:** GoDaddy · **Email:** Google Workspace

A fuller plain-English maintenance guide and access map is kept with the parish's records.
