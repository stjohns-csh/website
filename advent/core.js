// Shared logic: used by build.js (node) and inlined into generator.html (browser).
// To reuse for Lent / Holy Week, only the EVENTS list and SETTINGS need to change.

var SETTINGS = {
  title: "Special Events for Advent & Christmas 2026",
  subtitle: "All events are at St. John’s Church unless otherwise noted.",
  churchLocation: "St. John’s Church, 1670 Route 25A, Cold Spring Harbor, NY 11724",
  // Where the .ics files will be uploaded on the website. CONFIRM THIS PATH.
  icsBaseUrl: "https://www.stjcsh.org/calendar/",
  accent: "#b32d1e",
  tz: "America/New_York"
};

// date = "YYYY-MM-DD", start/end = "HH:MM" (24h). Ticketed events get a ticket button instead of calendar links.
var EVENTS = [
  { slug: "magnify-2026", title: "Magnify – Mary’s Song and the Magnificent Women of Advent",
    dates: ["2026-11-29", "2026-12-06", "2026-12-13", "2026-12-20"], weekly: true,
    start: "09:00", end: "09:45", lead: "Sundays in Advent", timeText: "9–9:45 am",
    },
  { slug: "pageant-signup-wreath-making", title: "Christmas Pageant Signup & Advent Wreath Making",
    dates: ["2026-11-29"], start: "11:00", end: "12:00", timeText: "11 am" },
  { slug: "trio-mediaeval", title: "Concerts by the Pond Presents: Trio Mediaeval",
    blurb: "The Grammy-nominated vocal trio presents YULE, a Scandinavian Holiday program.",
    dates: ["2026-12-05"], start: "19:30", timeText: "7:30 pm (ticketed)",
    ticketUrl: "https://www.tix.com/ticket-sales/CBTP/7340/event/1468828" },
  { slug: "pageant-casting-costuming", title: "Christmas Pageant Casting and Costuming",
    dates: ["2026-12-06"], start: "11:00", end: "12:00", timeText: "11 am" },
  { slug: "carol-messiah-singalong", title: "4th Annual Community Christmas Carol and Messiah Sing-along",
    blurb: "benefitting St. Matthias School & Church in Haiti",
    dates: ["2026-12-06"], start: "15:00", end: "16:00", timeText: "3 pm" },
  { slug: "holiday-swing-ii", title: "Concerts by the Pond Presents: Holiday Swing II",
    blurb: "Swing into the Season with vocalist April Varner and pianist Konrad Paszkudzki",
    dates: ["2026-12-12"], start: "19:30", timeText: "7:30 pm (ticketed)",
    ticketUrl: "https://www.tix.com/ticket-sales/CBTP/7340/event/1468829" },
  { slug: "village-caroling", title: "Christmas Caroling in Cold Spring Harbor Village",
    dates: ["2026-12-19"], start: "13:00", end: "14:00", timeText: "1 pm – meet at the CSH Firehouse Museum",
    location: "Cold Spring Harbor Firehouse Museum, Cold Spring Harbor, NY" },
  { slug: "greening-of-the-church", title: "Greening of the Church",
    dates: ["2026-12-19"], start: "15:00", end: "16:00", timeText: "3 pm" },
  { slug: "lessons-and-carols", title: "Christmas Festival Service of Lesson and Carols",
    lead: "4th Sunday of Advent",
    dates: ["2026-12-20"], start: "10:00", end: "11:00", timeText: "10 am" },
  { group: "Christmas Eve Services, Thursday, December 24", items: [
    { slug: "christmas-eve-4pm", title: "Christmas Pageant and Carol Sing", dates: ["2026-12-24"], start: "16:00", end: "17:00", timeText: "4 pm" },
    { slug: "christmas-eve-6pm", title: "Holy Eucharist with Harp and Chancel Choir", dates: ["2026-12-24"], start: "18:00", end: "19:00", timeText: "6 pm" },
    { slug: "christmas-eve-10pm", title: "Holy Eucharist with Harp and Vocal Soloists", dates: ["2026-12-24"], start: "22:00", end: "23:00", timeText: "10 pm" }
  ] },
  { slug: "christmas-day", title: "Christmas Day Service, Friday, December 25",
    lead: "Holy Eucharist", noDate: true, dates: ["2026-12-25"], start: "10:00", end: "11:00", timeText: "10 am",
    calTitle: "Christmas Day Holy Eucharist" }
];

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function compact(date, hhmm) { return date.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00"; }
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

function remainingDates(ev, asOf) { return ev.dates.filter(function (d) { return d >= asOf; }); }

function flatEvents(events) {
  var out = [];
  events.forEach(function (e) { if (e.group) e.items.forEach(function (i) { out.push(i); }); else out.push(e); });
  return out;
}

function monthDay(date) {
  var m = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var p = date.split("-"); return m[+p[1] - 1] + " " + (+p[2]);
}
function weekday(date) {
  var p = date.split("-").map(Number);
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(p[0], p[1] - 1, p[2]).getDay()];
}

// "Sundays in Advent, November 29 & December 6, 13, 20, 9am - 9:45am" style line, built from remaining dates
function dateLine(ev, dates) {
  if (ev.weekly) {
    var parts = [], lastMonth = null;
    dates.forEach(function (d) {
      var md = monthDay(d).split(" ");
      parts.push(md[0] !== lastMonth ? md[0] + " " + md[1] : md[1]); lastMonth = md[0];
    });
    var s = parts.length > 1 ? parts.slice(0, -1).join(", ") + " & " + parts[parts.length - 1] : parts[0];
    return (dates.length > 1 ? ev.lead : ev.lead.replace(/^Sundays/, "Sunday")) + ", " + s + ", " + ev.timeText;
  }
  var d = dates[0];
  if (ev.lead) return ev.lead + ", " + (ev.noDate ? "" : monthDay(d) + ", ") + ev.timeText;
  var base = weekday(d) + ", " + monthDay(d) + ", " + ev.timeText;
  return base;
}

function googleLink(ev, dates, s) {
  var first = dates[0];
  var loc = ev.location || s.churchLocation;
  var q = "action=TEMPLATE&text=" + encodeURIComponent(ev.calTitle || ev.title) +
    "&dates=" + compact(first, ev.start) + "/" + compact(first, ev.end) +
    "&ctz=" + encodeURIComponent(s.tz) +
    "&location=" + encodeURIComponent(loc) +
    "&details=" + encodeURIComponent("St. John’s Episcopal Church, Cold Spring Harbor");
  if (ev.weekly && dates.length > 1) q += "&recur=" + encodeURIComponent("RRULE:FREQ=WEEKLY;COUNT=" + dates.length);
  return "https://calendar.google.com/calendar/render?" + q;
}

function icsText(ev, dates, s) {
  var first = dates[0], loc = ev.location || s.churchLocation;
  var fold = function (l) { return l; };
  var lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//St. John's Cold Spring Harbor//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:America/New_York",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:" + ev.slug + "-" + first + "@stjcsh.org",
    "DTSTAMP:20261124T140000Z",
    "DTSTART;TZID=America/New_York:" + compact(first, ev.start),
    "DTEND;TZID=America/New_York:" + compact(first, ev.end),
    "SUMMARY:" + (ev.calTitle || ev.title).replace(/,/g, "\\,"),
    "LOCATION:" + loc.replace(/,/g, "\\,"),
    "DESCRIPTION:St. John's Episcopal Church\\, Cold Spring Harbor"
  ];
  if (ev.weekly && dates.length > 1) lines.push("RRULE:FREQ=WEEKLY;COUNT=" + dates.length);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

function calLinks(ev, dates, s) {
  var st = "color:" + s.accent + ";text-decoration:underline;";
  return '<span style="font-size:13px;color:#555555;">Add to calendar: </span>' +
    '<a href="' + esc(googleLink(ev, dates, s)) + '" style="' + st + 'font-size:13px;">Google</a>' +
    '<span style="font-size:13px;color:#555555;"> &middot; </span>' +
    '<a href="' + esc(s.icsBaseUrl + ev.slug + ".ics") + '" style="' + st + 'font-size:13px;">Apple / Outlook</a>';
}

function ticketButton(ev, s) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 0 auto;"><tr>' +
    '<td align="center" bgcolor="' + s.accent + '" style="border-radius:4px;">' +
    '<a href="' + esc(ev.ticketUrl) + '" style="display:inline-block;padding:9px 22px;font-family:Georgia,\'Times New Roman\',serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;">Buy Tickets</a>' +
    '</td></tr></table>';
}

var F = "font-family:Georgia,'Times New Roman',serif;";

function eventBlock(ev, s, asOf) {
  var dates = remainingDates(ev, asOf);
  if (!dates.length) return "";
  var h = '<tr><td align="center" style="padding:0 20px 18px 20px;' + F + '">';
  h += '<div style="' + F + 'font-size:17px;font-weight:bold;color:#111111;line-height:22px;">' + esc(ev.title) + '</div>';
  if (ev.blurb) h += '<div style="' + F + 'font-size:15px;color:#222222;line-height:20px;">' + esc(ev.blurb) + '</div>';
  h += '<div style="' + F + 'font-size:15px;color:#222222;line-height:21px;">' + esc(dateLine(ev, dates)) + '</div>';
  h += '<div style="padding-top:6px;">' + (ev.ticketUrl ? ticketButton(ev, s) : calLinks(ev, dates, s)) + '</div>';
  return h + '</td></tr>\n';
}

function groupBlock(g, s, asOf) {
  var live = g.items.filter(function (i) { return remainingDates(i, asOf).length; });
  if (!live.length) return "";
  var h = '<tr><td align="center" style="padding:0 20px 18px 20px;' + F + '">';
  h += '<div style="' + F + 'font-size:17px;font-weight:bold;color:#111111;line-height:22px;padding-bottom:4px;">' + esc(g.group) + '</div>';
  live.forEach(function (i) {
    h += '<div style="padding-bottom:7px;"><div style="' + F + 'font-size:15px;color:#222222;line-height:21px;">' + esc(i.title + ", " + i.timeText) + '</div>' +
         '<div>' + calLinks(i, remainingDates(i, asOf), s) + '</div></div>';
  });
  return h + '</td></tr>\n';
}

function buildBlock(events, asOf, s) {
  var rows = events.map(function (e) { return e.group ? groupBlock(e, s, asOf) : eventBlock(e, s, asOf); }).join("");
  return '<!-- Advent & Christmas calendar block. Generated for events on/after ' + asOf + '. Paste into a Mailchimp Code block. -->\n' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:10px 0;">\n' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border:3px solid ' + s.accent + ';background-color:#ffffff;">\n' +
    '<tr><td align="center" style="padding:24px 20px 6px 20px;' + F + '"><div style="' + F + 'font-size:21px;font-weight:bold;color:#111111;line-height:27px;">' + esc(s.title) + '</div></td></tr>\n' +
    '<tr><td align="center" style="padding:0 20px 20px 20px;' + F + '"><div style="' + F + 'font-size:15px;font-style:italic;color:#333333;line-height:20px;">' + esc(s.subtitle) + '</div></td></tr>\n' +
    rows +
    '<tr><td style="padding:0 0 8px 0;font-size:1px;line-height:1px;">&nbsp;</td></tr>\n</table>\n</td></tr></table>';
}

if (typeof module !== "undefined") module.exports = { SETTINGS: SETTINGS, EVENTS: EVENTS, buildBlock: buildBlock, icsText: icsText, flatEvents: flatEvents, remainingDates: remainingDates, ymd: ymd };
