// Upcoming events from the parish public Google Calendar (admin@stjcsh.org).
// Reads the Google Calendar API with a read-only API key (env: CALENDAR_API_KEY).
// singleEvents=true means Google expands recurring services for us — we never
// have to parse recurrence rules. Times are formatted in the parish's own
// timezone so they read correctly for every visitor. Cached at the edge 15 min.

const CALENDAR_ID = "admin@stjcsh.org";
const TZ = "America/New_York";
const DAY_FMT  = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
const KEY_FMT  = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

function stripHtml(s) {
  if (!s) return "";
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "’").replace(/&quot;/gi, '"')
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLocation(loc) {
  if (!loc) return "";
  if (/zoom\.us|meet\.google|teams\.microsoft|https?:\/\//i.test(loc)) return "Online";
  if (/1670/.test(loc)) return "The Church · 1670 Route 25A";
  return loc.split(",")[0].trim();
}

function timeLabel(d) {
  return TIME_FMT.format(d).replace(/\s?AM$/i, " a.m.").replace(/\s?PM$/i, " p.m.");
}

export default async () => {
  const headers = {
    "content-type": "application/json",
    "cache-control": "public, max-age=900, s-maxage=900"
  };
  try {
    const key = process.env.CALENDAR_API_KEY;
    if (!key) throw new Error("missing CALENDAR_API_KEY");

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 90 * 86400000).toISOString(); // 90 days out

    const url =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(CALENDAR_ID) + "/events?key=" + encodeURIComponent(key) +
      "&singleEvents=true&orderBy=startTime&maxResults=100" +
      "&timeMin=" + encodeURIComponent(timeMin) +
      "&timeMax=" + encodeURIComponent(timeMax);

    const res = await fetch(url);
    if (!res.ok) throw new Error("calendar api " + res.status);
    const data = await res.json();

    const events = (data.items || [])
      .filter(e => e.status !== "cancelled" && e.start && (e.start.dateTime || e.start.date))
      .map(e => {
        const allDay = !e.start.dateTime;
        const d = allDay ? new Date(e.start.date + "T12:00:00Z") : new Date(e.start.dateTime);
        return {
          title: (e.summary || "Event").trim(),
          dayLabel: DAY_FMT.format(d),
          dateKey: KEY_FMT.format(d),
          timeLabel: allDay ? "All day" : timeLabel(d),
          allDay,
          location: cleanLocation(e.location),
          description: stripHtml(e.description)
        };
      });

    return new Response(JSON.stringify({ events }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ events: [], error: true }), { headers });
  }
};

export const config = { path: "/api/events" };
