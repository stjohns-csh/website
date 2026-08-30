// One parish event as a calendar file: /api/event.ics?slug=save-the-pond-2026-benefit
//
// An .ics is the universal way to hand someone an event — Apple Calendar,
// Outlook, Google and everything else read it. On a phone the link opens the
// calendar app with the event ready to confirm.
//
// WHY THIS READS /api/events RATHER THAN GOOGLE DIRECTLY:
// the slug is generated there, including the rule that a repeated title gets a
// date suffix. If this function queried Google itself it would have to
// reimplement that, and the day the two drifted apart every "add to calendar"
// link on the page would quietly point at nothing. One source of slugs.
//
// WHAT THIS IS NOT: a subscription. It is a copy, taken at the moment of the
// click. If a service time changes afterwards, the copy in someone's calendar
// still says the old time and nothing tells them. That is inherent to handing
// out a file, and worth remembering before moving a Christmas service.

const DOMAIN = "stjcsh.org";

// RFC 5545 §3.3.11: backslash, semicolon and comma are escapes, and a literal
// newline is written \n. Get this wrong and the file opens with visible
// backslashes, or fails to parse at a comma in a description.
function esc(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545 §3.1: lines are folded at 75 OCTETS, not characters — a line broken
// mid-character corrupts anything non-ASCII, and parish descriptions are full
// of curly apostrophes. Continuation lines begin with a single space.
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Back off if we landed inside a multi-byte character.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((start === 0 ? "" : " ") + bytes.slice(start, end).toString("utf8"));
    start = end;
    limit = 74;   // continuation lines spend one octet on the leading space
  }
  return out.join("\r\n");
}

function utcStamp(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dateOnly(isoDate) {
  return String(isoDate).slice(0, 10).replace(/-/g, "");
}

function nextDay(isoDate) {
  const d = new Date(String(isoDate).slice(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export default async (request) => {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") || "").trim();

  const fail = (code, message) =>
    new Response(message, {
      status: code,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });

  if (!slug) return fail(400, "Which event? Add ?slug= to the address.");

  try {
    const res = await fetch(url.origin + "/api/events");
    if (!res.ok) throw new Error("events endpoint returned " + res.status);
    const data = await res.json();

    const ev = (data.events || []).find((e) => e.slug === slug);
    if (!ev) return fail(404, "We could not find that event. It may have passed, or been renamed.");
    if (!ev.start) return fail(422, "That event has no start time we can read.");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//St. John's Episcopal Church//stjcsh.org//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      // Stable, so adding the same event twice updates rather than duplicates
      // in calendars that honour UID.
      "UID:" + slug + "@" + DOMAIN,
      "DTSTAMP:" + utcStamp(new Date())
    ];

    if (ev.allDay) {
      // An all-day event is a DATE, not a time, and its DTEND is the day AFTER
      // the last day — exclusive. Written as the same day, many calendars show
      // a zero-length event or drop it entirely.
      lines.push("DTSTART;VALUE=DATE:" + dateOnly(ev.start));
      lines.push("DTEND;VALUE=DATE:" + (ev.end ? dateOnly(ev.end) : nextDay(ev.start)));
    } else {
      const start = new Date(ev.start);
      let end = ev.end ? new Date(ev.end) : null;
      // The parish calendar has always carried a real end time — of 92 timed
      // events checked across three months, none lacked one. This is a safety
      // net for a malformed event, not an expected path. It must NOT become a
      // blanket default: real durations run 45 minutes to six hours, so an
      // assumed hour would misstate a third of them.
      if (!end || isNaN(end) || end <= start) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      lines.push("DTSTART:" + utcStamp(start));
      lines.push("DTEND:" + utcStamp(end));
    }

    lines.push("SUMMARY:" + esc(ev.title));
    if (ev.location) lines.push("LOCATION:" + esc(ev.location));
    if (ev.description) lines.push("DESCRIPTION:" + esc(ev.description));
    lines.push("URL:https://" + DOMAIN + "/events/#" + slug);
    lines.push("END:VEVENT", "END:VCALENDAR");

    // CRLF throughout — the spec requires it, and some desktop Outlook versions
    // genuinely refuse a file with bare newlines.
    const body = lines.map(fold).join("\r\n") + "\r\n";

    return new Response(body, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="' + slug + '.ics"',
        "cache-control": "public, max-age=300, s-maxage=900"
      }
    });
  } catch (err) {
    console.error("event-ics:", err.message);
    return fail(502, "We could not build that calendar file just now. Please try again in a moment.");
  }
};

export const config = { path: "/api/event.ics" };
