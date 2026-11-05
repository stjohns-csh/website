#!/usr/bin/env python3
"""
Build /sermons/index.html from sermons/sermons.json.

The page borrows its header, navigation and footer from worship/index.html, so
it always matches the rest of the site. Run this after adding a sermon to
sermons.json, and again after any change to the site-wide header or footer.

    python3 tools/build-sermons.py

While DRAFT is True the page is marked noindex, so search engines ignore it
even if it is published before it is linked. Set DRAFT = False when it is ready.
"""

import datetime
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DRAFT = True
URL = "https://stjcsh.org/sermons/"
DESC = ("Sermons from Sunday worship at St. John’s Episcopal Church, Cold Spring Harbor. "
        "Watch each one, starting at the moment the sermon begins.")

data = json.loads((ROOT / "sermons" / "sermons.json").read_text(encoding="utf-8"))
tpl = (ROOT / "worship" / "index.html").read_text(encoding="utf-8")

e = lambda s: html.escape(s, quote=True)


def swap(text, old, new):
    if old not in text:
        raise SystemExit("template changed, could not find: " + old[:70])
    return text.replace(old, new)


def long_date(iso):
    d = datetime.date.fromisoformat(iso)
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


head, rest = tpl.split("<main>", 1)
tail = rest.split("</main>", 1)[1]

title = "Sermons &mdash; St. John&#x27;s Episcopal Church"
head = swap(head, "<title>Worship &mdash; St. John&#x27;s Episcopal Church</title>", "<title>%s</title>" % title)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % e(DESC), head, count=1)
head = swap(head, 'href="https://stjcsh.org/worship/"', 'href="%s"' % URL)
head = swap(head, 'content="https://stjcsh.org/worship/"', 'content="%s"' % URL)
for prop in ("og:title", "twitter:title"):
    head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*(">)' % prop, r"\g<1>%s\g<2>" % title, head, count=1)
for prop in ("og:description", "twitter:description"):
    head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*(">)' % prop, r"\g<1>%s\g<2>" % e(DESC), head, count=1)
head = swap(head, '<a href="/worship/" aria-current="page">Worship</a>', '<a href="/worship/">Worship</a>')
head = swap(head, "<h1>Worship</h1>", "<h1>Sermons</h1>")
extra = '<link rel="stylesheet" href="/assets/parish-life.css">\n<link rel="stylesheet" href="/assets/sermons.css">\n'
if DRAFT:
    extra += '<meta name="robots" content="noindex">\n'
head = swap(head, "</head>", extra + "</head>")

preachers = data["preachers"]
cards = []
untitled = []
for s in data["sermons"]:
    p = preachers[s["preacher"]]
    heading = s["title"] or "Sermon for the " + s["sunday"]
    if not s["title"]:
        untitled.append(s["date"])
    vid, start = s["video"], int(s["start"])
    watch = "https://www.youtube.com/watch?v=%s" % vid + ("&t=%ds" % start if start else "")
    search_text = " ".join([heading, s["sunday"], p["name"], long_date(s["date"])]).lower()
    cards.append(f"""<article class="sm-item" data-preacher="{e(s['preacher'])}" data-video="{e(vid)}" data-start="{start}" data-date="{e(s['date'])}" data-text="{e(search_text)}">
<div class="video-frame sm-video" data-video="{e(vid)}" data-start="{start}" data-title="{e(heading)}">
<button type="button" class="video-facade" style="background-image:url(https://i.ytimg.com/vi/{e(vid)}/hqdefault.jpg)" aria-label="Play sermon: {e(heading)}"><span class="video-play" aria-hidden="true"></span></button>
</div>
<p class="pl-meta"><time datetime="{e(s['date'])}">{e(long_date(s['date']))}</time><span class="sep" aria-hidden="true">&bull;</span>{e(s['sunday'])}</p>
<h3>{e(heading)}</h3>
<p class="sm-by">{e(p['name'])}</p>
<p class="sm-alt"><a href="{e(watch)}">Watch on YouTube</a></p>
</article>""")

chips = '<button type="button" data-filter="all" aria-pressed="true">All</button>\n'
for key, p in preachers.items():
    chips += '<button type="button" data-filter="%s" aria-pressed="false">%s</button>\n' % (e(key), e(p["chip"]))

SCRIPT = """<script>
(function () {
  var PREACHERS = __PREACHERS__;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var list = document.getElementById('sm-list');
  var q = document.getElementById('sm-q');
  var count = document.getElementById('sm-count');
  var none = document.getElementById('sm-none');
  var buttons = [].slice.call(document.querySelectorAll('.pl-filter button'));
  var who = 'all';
  function items() { return [].slice.call(list.querySelectorAll('.sm-item')); }
  function apply() {
    var all = items(), shown = 0;
    var words = q.value.toLowerCase().split(/\\s+/).filter(Boolean);
    all.forEach(function (it) {
      var ok = (who === 'all' || it.dataset.preacher === who) &&
               words.every(function (w) { return it.dataset.text.indexOf(w) !== -1; });
      it.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = (who === 'all' && !words.length) ? 'All ' + all.length : shown + ' of ' + all.length;
    none.hidden = shown > 0;
  }
  q.addEventListener('input', apply);
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      who = b.dataset.filter;
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    });
  });
  list.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.video-facade') : null;
    if (!btn) return;
    var box = btn.parentNode, start = parseInt(box.dataset.start, 10) || 0;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.video + '?' + (start ? 'start=' + start + '&' : '') + 'autoplay=1&rel=0';
    f.title = box.dataset.title;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    box.innerHTML = '';
    box.appendChild(f);
  });

  // Sermons recorded since this page was last rebuilt (from the newsletter's
  // sermon box). Everything is set as text, never as markup.
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function longDate(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function card(s) {
    var p = PREACHERS[s.preacher] || null;
    var heading = s.title || (s.sunday ? 'Sermon for the ' + s.sunday : 'Sermon, ' + longDate(s.date));
    var start = parseInt(s.start, 10) || 0;
    var a = el('article', 'sm-item');
    a.dataset.preacher = p ? s.preacher : '';
    a.dataset.video = s.video; a.dataset.start = String(start); a.dataset.date = s.date;
    a.dataset.text = [heading, s.sunday, p ? p.name : '', longDate(s.date)].join(' ').toLowerCase();
    var frame = el('div', 'video-frame sm-video');
    frame.dataset.video = s.video; frame.dataset.start = String(start); frame.dataset.title = heading;
    var btn = el('button', 'video-facade');
    btn.type = 'button';
    btn.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + s.video + '/hqdefault.jpg)';
    btn.setAttribute('aria-label', 'Play sermon: ' + heading);
    var play = el('span', 'video-play'); play.setAttribute('aria-hidden', 'true');
    btn.appendChild(play); frame.appendChild(btn); a.appendChild(frame);
    var meta = el('p', 'pl-meta');
    var t = el('time', '', longDate(s.date)); t.setAttribute('datetime', s.date);
    meta.appendChild(t);
    if (s.sunday) { var sep = el('span', 'sep', '\\u2022'); sep.setAttribute('aria-hidden', 'true'); meta.appendChild(sep); meta.appendChild(document.createTextNode(s.sunday)); }
    a.appendChild(meta);
    a.appendChild(el('h3', '', heading));
    if (p) a.appendChild(el('p', 'sm-by', p.name));
    var alt = el('p', 'sm-alt'), link = el('a', '', 'Watch on YouTube');
    link.href = 'https://www.youtube.com/watch?v=' + s.video + (start ? '&t=' + start + 's' : '');
    alt.appendChild(link); a.appendChild(alt);
    return a;
  }
  fetch('/api/sermons').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.sermons) return;
    var have = {};
    items().forEach(function (it) { have[it.dataset.video + '|' + it.dataset.start] = 1; });
    var added = false;
    d.sermons.forEach(function (s) {
      if (!s || !/^[\\w-]{11}$/.test(s.video || '') || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s.date || '')) return;
      if (have[s.video + '|' + (parseInt(s.start, 10) || 0)]) return;
      var c = card(s), before = null;
      items().some(function (it) { if (it.dataset.date < s.date) { before = it; return true; } return false; });
      list.insertBefore(c, before);
      added = true;
    });
    if (added) apply();
  }).catch(function () {});
})();
</script>"""

n = len(cards)
main = f"""<main>
<section><div class="wrap">
<p class="sermon-intro">Sermons from Sunday worship, newest first. Each one opens in the service video at the moment the sermon begins.</p>
<div class="sm-tools">
<div class="sm-search"><label for="sm-q">Search sermons</label><input id="sm-q" type="search" placeholder="A title, a preacher, a Sunday&hellip;" autocomplete="off"></div>
<div class="pl-filter" role="group" aria-label="Filter by preacher">
{chips}</div>
<span class="pl-count" id="sm-count" aria-live="polite">All {n}</span>
</div>
<div class="sm-grid" id="sm-list">
{chr(10).join(cards)}
</div>
<p class="sm-none" id="sm-none" hidden>No sermons match. Try fewer words, or choose All.</p>
<p class="sm-more">Older sermons are in <a href="{e(data['playlist'])}">our YouTube playlist</a>, and we are adding them here a few at a time.</p>
</div></section>
__SCRIPT__
</main>"""

main = main.replace("__SCRIPT__", SCRIPT.replace("__PREACHERS__", json.dumps({k: {"name": v["name"]} for k, v in preachers.items()})))

out = ROOT / "sermons" / "index.html"
out.write_text(head + main + tail, encoding="utf-8")
print("wrote", out.relative_to(ROOT), "-", n, "sermons")
if untitled:
    print("no title yet for:", ", ".join(untitled))
