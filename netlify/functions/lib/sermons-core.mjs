// The thinking behind /api/sermons, kept apart from the network calls so it can
// be tested against real data without a server.
//
// Source of truth: the Newsletter Workshop's sermon box. Each issue's "Issue
// Settings" row holds the week's service link and sermon link (pasted by Kim,
// with the title filled in from YouTube). Nothing here reads the email itself.

const MONTHS = ["January","February","March","April","May","June","July","August",
  "September","October","November","December"];

// YYYY-MM-DD helpers that never touch the machine's time zone.
export function iso(y, m, d) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function toUTC(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUTC(dt) {
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
export function addDays(isoDate, n) {
  const dt = toUTC(isoDate);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}
export function todayET(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p; // en-CA gives YYYY-MM-DD
}
// The Sundays an issue might be keyed to: the coming one and the ones before it.
export function recentSundays(n, now = new Date()) {
  let d = todayET(now);
  while (toUTC(d).getUTCDay() !== 0) d = addDays(d, 1); // up to the coming Sunday
  const out = [];
  for (let i = 0; i < n; i++) out.push(addDays(d, -7 * i));
  return out;
}
export function previousSunday(isoDate) {
  let d = addDays(isoDate, -1);
  while (toUTC(d).getUTCDay() !== 0) d = addDays(d, -1);
  return d;
}

// A YouTube link -> { video, start }. Handles youtube.com/live/, /watch?v=,
// /embed/, youtu.be/, and t= or start= as seconds ("1361", "1361s", "1h2m3s").
export function parseVideoUrl(url) {
  const s = String(url || "").trim();
  let m = s.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|live\/|shorts\/)([\w-]{11})/i)
       || s.match(/^https?:\/\/youtu\.be\/([\w-]{11})/i);
  if (!m) return null;
  let start = 0;
  const t = s.match(/[?&#](?:t|start)=([0-9hms]+)/i);
  if (t) {
    const v = t[1].toLowerCase();
    if (/^\d+s?$/.test(v)) start = parseInt(v, 10);
    else {
      const h = v.match(/(\d+)h/), mi = v.match(/(\d+)m/), se = v.match(/(\d+)s/);
      start = (h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (se ? +se[1] : 0);
    }
  }
  return { video: m[1], start };
}

const SUNDAY_NAME = /((?:The )?[A-Z][A-Za-z-]*(?: [A-Za-z]+)? Sunday (?:after|of|in|before) [A-Z][a-z]+(?: [A-Z][a-z]+)?)/;
export function findSundayName(...texts) {
  for (const t of texts) {
    const m = String(t || "").match(SUNDAY_NAME);
    if (m) {
      return m[1].replace(/^The /, "")
        .replace(/-([a-z])/g, (_, c) => "-" + c.toUpperCase()); // Twenty-second -> Twenty-Second
    }
  }
  return "";
}

// The sermon box title is whatever is in the field: usually the sermon's title,
// sometimes YouTube's whole video title ("Whose Coin?  The Twenty-First
// Sunday..."), sometimes just "Sermon: <Sunday name>" when no title was typed.
// Return the real title, or "" when there isn't one.
export function cleanTitle(raw) {
  let t = String(raw || "").replace(/^\s*sermon\s*:\s*/i, "");
  t = t.split(/\s{2,}/)[0].trim();
  if (!t || /\bSunday (after|of|in|before)\b/.test(t)) return "";
  if (/^holy (eucharist|baptism)\b/i.test(t)) return "";
  return t;
}

export function dateFromTitle(title) {
  const m = String(title || "").match(new RegExp("(" + MONTHS.join("|") + ") (\\d{1,2}), (\\d{4})"));
  return m ? iso(+m[3], MONTHS.indexOf(m[1]) + 1, +m[2]) : "";
}

// --- the preaching rota -----------------------------------------------------
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
// Date -> "gideon" | "doug", only when the rota gives exactly one of them for
// that Sunday. Two preachers (8 and 10), a guest, or nothing -> no entry.
export function rotaIndex(csvTexts) {
  const seen = {};
  csvTexts.forEach((text) => {
    parseCSV(text || "").slice(1).forEach((r) => {
      const m = String(r[0] || "").match(/(\d{1,2})\/+(\d{1,2})\/(\d{2,4})/);
      if (!m) return;
      const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      const key = iso(y, +m[1], +m[2]);
      const who = String(r[1] || "").replace(/^\s*\d+\s*(am|pm)\s*:\s*/i, "").toLowerCase();
      const k = /gideon/.test(who) ? "gideon" : /doug/.test(who) ? "doug" : "other";
      (seen[key] = seen[key] || new Set()).add(k);
    });
  });
  const out = {};
  Object.keys(seen).forEach((d) => {
    const s = [...seen[d]];
    if (s.length === 1 && s[0] !== "other") out[d] = s[0];
  });
  return out;
}

// --- one Issue Settings row -> one sermon -----------------------------------
export function buildSermon(settings, oembedTitle, rota) {
  const v = parseVideoUrl(settings.video_sermon_url);
  if (!v) return null;
  const key = settings.issue_date;
  const date = dateFromTitle(oembedTitle) || dateFromTitle(settings.video_sermon_title)
            || (/^\d{4}-\d{2}-\d{2}$/.test(key) ? previousSunday(key) : "");
  if (!date) return null;
  const rawTitle = settings.video_sermon_title;
  let preacher = rota[date] || "";
  if (/pollach|gideon/i.test(rawTitle)) preacher = "gideon";
  else if (/mohrmann|doug/i.test(rawTitle)) preacher = "doug";
  return {
    date,
    sunday: findSundayName(rawTitle, settings.video_service_title),
    title: cleanTitle(rawTitle),
    preacher,
    video: v.video,
    start: v.start,
    asj: key
  };
}

// The committed archive wins over anything read live, so a correction made in
// sermons.json is never undone by the sheet.
//
// A service video carries one sermon, so the video id is the identity. That
// matters because a sheet row can go stale: on 5 Nov an old row still held the
// 25 Oct video, and read on its own it would have shown the same sermon a
// second time under 18 Oct. Where one video turns up under more than one issue,
// the most recent issue's row is the one that was last touched, so it wins.
export function mergeSermons(archive, fresh) {
  const have = new Set(archive.map((s) => s.video));
  const newest = new Map();
  fresh.forEach((s) => {
    if (!s || have.has(s.video)) return;
    const seen = newest.get(s.video);
    if (!seen || String(s.asj) > String(seen.asj)) newest.set(s.video, s);
  });
  const out = archive.concat([...newest.values()]);
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
