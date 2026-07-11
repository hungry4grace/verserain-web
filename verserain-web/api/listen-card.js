// GET /lc  (rewritten to /api/listen-card)
// Open Graph link card for listen-mode (經文組聆聽) share links.
//
// The SPA serves one static index.html for every URL, so LINE/WhatsApp/
// Facebook previews of /?listenSet=… links all showed the generic site
// title. Share buttons now emit /lc links instead: crawlers read the
// per-set OG tags below, humans get bounced straight into the SPA's
// listen deep link.
//
// Query params — short links preferred:
//   set     setId (required for a useful redirect)
//   i       verse index within the set (server resolves ref + text)
//   verse   verse reference (fallback when i is absent)
//   version bible version (optional, e.g. cuv)
//   title   optional inline override for the set title
//   vtext   optional inline override for the description snippet
//
// The share buttons push the full set to PartyKit's /share-set right
// before emitting an /lc link, so this endpoint can resolve the set's
// title and the verse's reference/text server-side — keeping the shared
// URL short (no URL-encoded Chinese in the query).

import { BIBLE_BOOKS } from '../src/bibleDictionary.js';

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 「賽 60:1-3」→「以賽亞書 60:1-3」— expand Chinese book abbreviations to
// the full book name for the link preview. Non-Chinese refs pass through.
function expandReferenceForDisplay(ref) {
  const m = String(ref || '').match(/^(\S+?)\s*(\d.*)$/);
  if (!m) return ref;
  const [, book, rest] = m;
  for (const b of BIBLE_BOOKS) {
    const zhFull = b.names?.[0];
    const zhAbbr = b.names?.[1];
    if (book === zhAbbr || book === zhFull) return `${zhFull} ${rest}`;
    const cnFull = b.cn?.[0];
    const cnAbbr = b.cn?.[1];
    if (cnFull && (book === cnAbbr || book === cnFull)) return `${cnFull} ${rest}`;
  }
  return ref;
}

const PARTY_BASE = (process.env.PARTY_BASE || 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db').replace(/\/+$/, '');

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.verserain.com';
  const origin = `https://${host}`;
  const q = req.query || {};

  const set = String(q.set || '');
  let verse = String(q.verse || '');
  const version = String(q.version || '');
  let title = String(q.title || '').slice(0, 60);
  let vtext = String(q.vtext || '').slice(0, 160);
  const idx = /^\d+$/.test(String(q.i || '')) ? Number(q.i) : null;

  // Resolve title / verse text from the shared set when not passed inline.
  if (set && (!title || (!vtext && (idx !== null || verse)))) {
    try {
      const r = await fetch(`${PARTY_BASE}/share-set?id=${encodeURIComponent(set)}`, { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const data = await r.json();
        const s = data?.set;
        if (s) {
          if (!title && s.title) title = String(s.title).slice(0, 60);
          const verses = Array.isArray(s.verses) ? s.verses : [];
          const target = idx !== null
            ? verses[idx]
            : (verse ? verses.find(v => v?.reference === verse) : null);
          if (target) {
            if (!verse && target.reference) verse = String(target.reference);
            if (!vtext && target.text) vtext = String(target.text).slice(0, 160);
          }
        }
      }
    } catch { /* preview degrades gracefully; redirect still works */ }
  }

  // Real destination inside the app.
  const dest = new URL(`${origin}/`);
  if (set) dest.searchParams.set('listenSet', set);
  if (verse) dest.searchParams.set('listenVerse', verse);
  if (version) dest.searchParams.set('version', version);
  // order=seq → the app plays the whole set in canonical order.
  if (['seq', 'sequential'].includes(String(q.order || ''))) dest.searchParams.set('listenOrder', 'seq');
  const destUrl = dest.toString();

  const normalize = (s) => String(s || '').replace(/\s+/g, '');
  const refDisplay = verse ? expandReferenceForDisplay(verse) : '';
  // Single-verse shares use the reference AS the set title — showing both
  // reads as「賽 60:1-3 · 賽 60:1-3」. Collapse to one full-name reference.
  const titleIsRef = title && verse
    && (normalize(title) === normalize(verse) || normalize(title) === normalize(refDisplay));
  const ogTitle = (refDisplay && (!title || titleIsRef))
    ? `📖 ${refDisplay}（點擊可以聆聽）`
    : title
      ? (refDisplay ? `📖 ${title} · ${refDisplay}` : `📖 ${title}`)
      : 'VerseRain — 澆灌心田，結出生命果子';
  const ogDesc = vtext
    ? `「${vtext}」`
    : '點開聆聽這個經文組 · Tap to listen to this verse set';
  const ogImage = `${origin}/og-family.png`;
  const pageUrl = `${origin}${req.url || '/lc'}`;

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(ogTitle)}</title>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="VerseRain" />
<meta property="og:title" content="${esc(ogTitle)}" />
<meta property="og:description" content="${esc(ogDesc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle)}" />
<meta name="twitter:description" content="${esc(ogDesc)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<meta http-equiv="refresh" content="0; url=${esc(destUrl)}" />
<link rel="canonical" href="${esc(destUrl)}" />
<script>location.replace(${JSON.stringify(destUrl)});</script>
<style>
  body{margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,"PingFang TC","Noto Sans TC",sans-serif;
       display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}
  a{color:#93c5fd}
</style>
</head>
<body>
  <div>
    <h1 style="font-size:1.4rem;margin:0 0 .5rem">${esc(ogTitle)}</h1>
    <p style="color:#cbd5e1;max-width:32rem">${esc(ogDesc)}</p>
    <p style="margin-top:1.25rem"><a href="${esc(destUrl)}">開啟 VerseRain · Open and listen →</a></p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(html);
}
