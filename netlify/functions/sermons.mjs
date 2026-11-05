// The sermon archive's list: the sermons committed in sermons/sermons.json,
// plus any the Newsletter Workshop's sermon box has recorded since.
//
// So when Kim pastes the week's sermon link into the Workshop, the sermon shows
// up on /sermons/ with no deploy. Reads the same Apps Script webhook as
// parish-life.mjs (env: SHEET_WEBHOOK_URL).
//
// This endpoint is PUBLIC and the sheet is NOT. Only the fields named in
// `publicSermon` are returned; adding a column to the sheet adds nothing here.
// The page renders every value as text, never as markup.
//
// Every outside call is best-effort. If the sheet, YouTube or the rota is
// unreachable the committed archive is still returned, so the page never breaks.

import archive from "../../sermons/sermons.json";
import {
  recentSundays, rotaIndex, buildSermon, mergeSermons
} from "./lib/sermons-core.mjs";

const ROTA_SHEET = "1d2SP_m0eo7eOKOJcTpmO953zNuYumAIJ_KWS94zkdNo";
const WEEKS = 12; // issue keys looked at; the Workshop keys an issue to its Sunday

async function get(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    return r.ok ? r : null;
  } catch (e) { return null; }
  finally { clearTimeout(timer); }
}

function publicSermon(s) {
  return {
    date: String(s.date || ""), sunday: String(s.sunday || ""), title: String(s.title || ""),
    preacher: String(s.preacher || ""), video: String(s.video || ""),
    start: Number(s.start) || 0
  };
}

export default async () => {
  const headers = {
    "content-type": "application/json",
    "cache-control": "public, max-age=900, s-maxage=1800"
  };
  const known = archive.sermons || [];
  let fresh = [];
  try {
    const webhook = process.env.SHEET_WEBHOOK_URL;
    if (webhook) {
      const rows = (await Promise.all(recentSundays(WEEKS).map(async (d) => {
        const r = await get(webhook + "?action=issue_settings_get&issue_date=" + d);
        if (!r) return null;
        try { const j = await r.json(); return j && j.ok ? j.settings : null; } catch (e) { return null; }
      }))).filter((s) => s && s.video_sermon_url);

      const rotaTexts = await Promise.all(["Sheet1", "Past"].map(async (tab) => {
        const r = await get("https://docs.google.com/spreadsheets/d/" + ROTA_SHEET +
          "/gviz/tq?tqx=out:csv&sheet=" + tab);
        return r ? r.text() : "";
      }));
      const rota = rotaIndex(rotaTexts);

      fresh = await Promise.all(rows.map(async (s) => {
        const id = (s.video_sermon_url.match(/(?:v=|live\/|embed\/|youtu\.be\/)([\w-]{11})/) || [])[1];
        let title = "";
        if (id) {
          const r = await get("https://www.youtube.com/oembed?format=json&url=" +
            encodeURIComponent("https://www.youtube.com/watch?v=" + id), 5000);
          try { title = r ? String((await r.json()).title || "") : ""; } catch (e) { /* date falls back */ }
        }
        return buildSermon(s, title, rota);
      }));
    }
  } catch (e) {
    console.error("sermons: live read failed:", e && e.message);
  }
  const sermons = mergeSermons(known, fresh.filter(Boolean)).map(publicSermon);
  return new Response(JSON.stringify({ sermons }), { status: 200, headers });
};

export const config = { path: "/api/sermons" };
