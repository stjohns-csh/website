// Returns a small JSON summary of the most recent Mailchimp campaigns.
// The feed itself is ~1.6MB, so it never reaches the visitor.
// Cached at Netlify's edge for an hour: the feed is fetched ~24 times a day.

const FEED =
  "https://us12.campaign-archive.com/feed?u=6ddc235ebe44ba28f3c710f6e&id=1735e0b8f3";

const ENTITIES = {
  "&amp;": "&", "&apos;": "'", "&#39;": "'", "&quot;": '"',
  "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  "&#8217;": "\u2019", "&#8216;": "\u2018",
  "&#8212;": "\u2014", "&#8211;": "\u2013"
};

function decode(text) {
  return text.replace(/&[#a-zA-Z0-9]+;/g, (m) => ENTITIES[m] || m);
}

// Pull <tag>…</tag> out of a block without building a regex from a string.
function pick(block, tag) {
  const plain = "<" + tag + ">";
  let start = block.indexOf(plain);
  if (start !== -1) {
    start += plain.length;
  } else {
    const attrs = block.indexOf("<" + tag + " ");
    if (attrs === -1) return "";
    const gt = block.indexOf(">", attrs);
    if (gt === -1) return "";
    start = gt + 1;
  }
  const end = block.indexOf("</" + tag + ">", start);
  if (end === -1) return "";
  let value = block.slice(start, end).trim();
  if (value.startsWith("<![CDATA[")) value = value.slice(9);
  if (value.endsWith("]]>")) value = value.slice(0, -3);
  return decode(value.trim());
}

// Mailchimp serves resized copies from dim.mcusercontent.com with a crop baked
// into the query string. Point at the untouched original instead.
function original(url) {
  const m = url.match(
    /^https:\/\/dim\.mcusercontent\.com\/cs\/([^/]+)\/images\/([^?]+)/i
  );
  return m ? "https://mcusercontent.com/" + m[1] + "/images/" + m[2] : url;
}

// Every <img src> in a chunk of campaign HTML, normalised and de-iconed.
function candidates(html) {
  const found = [];
  let cursor = 0;
  while (true) {
    const i = html.indexOf("<img", cursor);
    if (i === -1) break;
    const gt = html.indexOf(">", i);
    if (gt === -1) break;
    const m = html.slice(i, gt).match(/src\s*=\s*["']([^"']+)["']/i);
    if (m) {
      const url = original(decode(m[1]));
      const junk =
        !/^https?:\/\//i.test(url) ||
        /cdn-images\.mailchimp\.com/i.test(url) ||
        /block-icons|social-block|awesomebar|spacer|\.gif(\?|$)/i.test(url);
      if (!junk && found.indexOf(url) === -1) found.push(url);
    }
    cursor = gt + 1;
  }
  return found;
}

export default async () => {
  const headers = {
    "content-type": "application/json",
    "cache-control": "public, max-age=1800, s-maxage=3600"
  };

  try {
    const res = await fetch(FEED);
    if (!res.ok) throw new Error("feed returned " + res.status);
    const xml = await res.text();

    // Pass one: read each campaign and note every image it uses.
    const raw = [];
    let cursor = 0;
    while (raw.length < 8) {
      const open = xml.indexOf("<item>", cursor);
      if (open === -1) break;
      const close = xml.indexOf("</item>", open);
      if (close === -1) break;
      const block = xml.slice(open + 6, close);
      const title = pick(block, "title");
      const link = pick(block, "link");
      const date = pick(block, "pubDate");
      const body = pick(block, "content:encoded") || pick(block, "description");
      if (title && link) {
        raw.push({ title, link, date, imgs: body ? candidates(body) : [] });
      }
      cursor = close + 7;
    }

    // Pass two: an image used in more than one issue is boilerplate — the
    // masthead, a footer logo, a recurring banner. Only unique images can be
    // this week's news.
    const seen = new Map();
    raw.forEach((item) => {
      item.imgs.forEach((u) => seen.set(u, (seen.get(u) || 0) + 1));
    });

    const items = raw.map((item) => {
      const unique = item.imgs.filter((u) => seen.get(u) === 1);
      const photo =
        unique.find((u) => /\.jpe?g(\?|$)/i.test(u)) || unique[0] || null;
      return { title: item.title, link: item.link, date: item.date, image: photo };
    });

    return new Response(JSON.stringify({ items: items.slice(0, 6) }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], error: true }), { headers });
  }
};

export const config = { path: "/api/newsletter" };
