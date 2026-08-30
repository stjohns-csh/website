// Published Parish Life items, read from the touts sheet.
//
// Same shape as the four functions already running here: the page fetches
// this, the visitor never touches the upstream. Reads the Apps Script webhook
// (env: SHEET_WEBHOOK_URL) — the same sheet the Newsletter Workshop writes to,
// so Kim publishes in the Workshop and the website follows with no deploy.
//
// TWO THINGS THIS FUNCTION IS CAREFUL ABOUT, both worth keeping if it is edited:
//
// 1. This endpoint is PUBLIC and the sheet is NOT. The sheet holds unpublished
//    parish content, submitter email addresses, editorial notes, and one day
//    something pastorally sensitive before it is ready. So nothing is passed
//    through: every field returned is named explicitly in `publicItem` below.
//    Adding a field to the sheet must never add it to this response by accident.
//
// 2. The text is typed by parish staff into a Google Form. It is returned as
//    plain text with any markup stripped, and the page renders it with
//    textContent rather than innerHTML. A public page that injected sheet
//    content as HTML would be one careless paste away from a problem.

const TZ = "America/New_York";
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ, day: "numeric", month: "long", year: "numeric"
});

// Cheap and deliberate: strip tags rather than sanitise them. Nothing in a
// blurb needs markup, and the page renders as text regardless.
function toText(s) {
  if (!s) return "";
  return String(s)
    // Drop script/style wholesale — tag AND contents. Stripping only the tags
    // would leave the code sitting in the page as visible text.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "’").replace(/&quot;/gi, '"')
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paragraphs(s) {
  return toText(s).split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
}

// Roughly 200 characters, but cut at a word and never mid-sentence-fragment.
function excerpt(s) {
  const flat = paragraphs(s).join(" ");
  if (flat.length <= 200) return flat;
  const cut = flat.slice(0, 200);
  const space = cut.lastIndexOf(" ");
  return (space > 120 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "") + "…";
}

// Cloudinary master URL -> a width-limited derivative. The transformation goes
// between /upload/ and the version segment; if the URL is not Cloudinary it is
// returned untouched rather than mangled.
function sized(url, width) {
  if (!url) return null;
  const u = String(url).trim();
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(u)) return u || null;
  return u.replace("/upload/", "/upload/c_limit,w_" + width + ",q_auto,f_auto/");
}

function dateParts(value) {
  if (!value) return { iso: "", label: "" };
  const d = new Date(value);
  if (isNaN(d)) return { iso: "", label: "" };
  return { iso: d.toISOString().slice(0, 10), label: DATE_FMT.format(d) };
}

// The whitelist. Everything the public sees is here and nowhere else.
function publicItem(t, { full }) {
  const when = dateParts(t.web_published_at);
  const source = t.long_version && String(t.long_version).trim()
    ? t.long_version
    : t.body;

  const item = {
    slug: String(t.web_slug || "").trim(),
    title: toText(t.title),
    // The SUBJECT, which is `wp_category` — the field the Curator's Categorize
    // editor writes and the field the page's chips are named after. NOT
    // `category`, which holds the newsletter section ("This Week & Upcoming")
    // and would match none of the filters. The `wp_` prefix is a fossil of the
    // dead WordPress site; the column itself is very much alive.
    category: toText(t.wp_category),
    type: toText(t.type),
    byline: toText(t.byline),
    date: when.iso,
    dateLabel: when.label,
    image: sized(t.image_url, full ? 1600 : 800),
    excerpt: excerpt(source)
  };

  if (full) {
    item.standfirst = toText(t.web_standfirst);
    item.paragraphs = paragraphs(source);
  }
  return item;
}

export default async (request) => {
  const headers = {
    "content-type": "application/json",
    // Long enough that the sheet is not hit on every visit, short enough that
    // something published on a Thursday morning is up well before the email.
    "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600"
  };

  const webhook = process.env.SHEET_WEBHOOK_URL;
  if (!webhook) {
    // Fail quietly and let the page keep whatever it is already showing.
    return new Response(JSON.stringify({ items: [], error: "unconfigured" }), { headers });
  }

  const wanted = new URL(request.url).searchParams.get("slug");

  try {
    const res = await fetch(webhook + "?action=list&status=*");
    if (!res.ok) throw new Error("sheet webhook returned " + res.status);
    const data = await res.json();
    if (!data || data.ok === false) throw new Error(data && data.error ? String(data.error) : "sheet said no");

    const rows = Array.isArray(data.touts) ? data.touts : [];

    // The gate. An item reaches the public page only if it has been published
    // to the website AND has a slug to live at — a row missing either is a
    // half-finished edit, not a page.
    const published = rows.filter((t) =>
      String(t.web_status || "").trim().toLowerCase() === "published" &&
      String(t.web_slug || "").trim()
    );

    // Newest first, on the website publish date rather than when the blurb
    // arrived in the Workshop.
    published.sort((a, b) =>
      String(b.web_published_at || "").localeCompare(String(a.web_published_at || ""))
    );

    if (wanted) {
      const hit = published.find((t) => String(t.web_slug).trim() === wanted);
      if (!hit) return new Response(JSON.stringify({ item: null }), { headers, status: 404 });
      return new Response(JSON.stringify({ item: publicItem(hit, { full: true }) }), { headers });
    }

    return new Response(
      JSON.stringify({ items: published.map((t) => publicItem(t, { full: false })) }),
      { headers }
    );
  } catch (err) {
    // Never a 500 to the visitor. The page falls back to what it was built
    // with, which is a real page, not an error.
    console.error("parish-life:", err.message);
    return new Response(JSON.stringify({ items: [], error: true }), { headers });
  }
};

export const config = { path: "/api/parish-life" };
