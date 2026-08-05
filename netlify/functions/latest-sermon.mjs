// Returns the most recent sermon from the "Sermons from St. John's" YouTube
// playlist, via YouTube's public RSS feed — no API key, no quota.
// Cached at Netlify's edge for 30 minutes.

const PLAYLIST_ID = "PLLQ82jqNeBnDKasX8MTsz4e9XIuyEXsuT";
const FEED =
  "https://www.youtube.com/feeds/videos.xml?playlist_id=" + PLAYLIST_ID;

const ENTITIES = {
  "&amp;": "&", "&apos;": "'", "&#39;": "'", "&quot;": '"',
  "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  "&#8217;": "\u2019", "&#8216;": "\u2018",
  "&#8212;": "\u2014", "&#8211;": "\u2013"
};
function decode(t) {
  return t.replace(/&[#a-zA-Z0-9]+;/g, (m) => ENTITIES[m] || m);
}

function firstTag(block, tag) {
  const open = block.indexOf("<" + tag + ">");
  if (open === -1) return "";
  const start = open + tag.length + 2;
  const end = block.indexOf("</" + tag + ">", start);
  if (end === -1) return "";
  return decode(block.slice(start, end).trim());
}

export default async () => {
  const headers = {
    "content-type": "application/json",
    "cache-control": "public, max-age=1800, s-maxage=1800"
  };
  try {
    const res = await fetch(FEED);
    if (!res.ok) throw new Error("feed " + res.status);
    const xml = await res.text();

    const open = xml.indexOf("<entry>");
    if (open === -1) throw new Error("no entries");
    const close = xml.indexOf("</entry>", open);
    const block = xml.slice(open + 7, close);

    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = idMatch ? idMatch[1] : null;
    const title = firstTag(block, "title");
    const published = firstTag(block, "published").slice(0, 10);
    if (!videoId) throw new Error("no video id");

    return new Response(
      JSON.stringify({ videoId, title, published }),
      { headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ videoId: null, error: true }), {
      headers
    });
  }
};

export const config = { path: "/api/latest-sermon" };
