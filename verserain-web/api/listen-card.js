// GET /lc  (rewritten to /api/listen-card)
// Open Graph link card for listen-mode (經文組聆聽) share links.
//
// The SPA serves one static index.html for every URL, so LINE/WhatsApp/
// Facebook previews of /?listenSet=… links all showed the generic site
// title. Share buttons now emit /lc links instead: crawlers read the
// per-set OG tags below, humans get bounced straight into the SPA's
// listen deep link.
//
// Query params (self-contained — no DB call):
//   set     setId (required for a useful redirect)
//   verse   verse reference to start from (optional)
//   version bible version (optional, e.g. cuv)
//   title   set title shown in the preview
//   vtext   verse text snippet for the preview description

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.verserain.com';
  const origin = `https://${host}`;
  const q = req.query || {};

  const set = String(q.set || '');
  const verse = String(q.verse || '');
  const version = String(q.version || '');
  const title = String(q.title || '').slice(0, 60);
  const vtext = String(q.vtext || '').slice(0, 160);

  // Real destination inside the app.
  const dest = new URL(`${origin}/`);
  if (set) dest.searchParams.set('listenSet', set);
  if (verse) dest.searchParams.set('listenVerse', verse);
  if (version) dest.searchParams.set('version', version);
  const destUrl = dest.toString();

  const ogTitle = title
    ? (verse ? `📖 ${title} · ${verse}` : `📖 ${title}`)
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
