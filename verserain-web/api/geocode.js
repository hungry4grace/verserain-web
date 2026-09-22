import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

// Address → coordinates for the place-registration form (地址定位).
//   GET ?q=<address>&lang=zh-TW   → { lat, lng, displayName } | 404 { error: 'not_found' }
// Backed by OpenStreetMap Nominatim, whose usage policy allows at most one
// request per second and asks for a real User-Agent — so results are cached
// (hits 30 days, misses 1 day), each IP gets 10 lookups a minute, and a
// global 1.1 s lock serialises upstream calls across all Vercel instances.
const HIT_TTL = 30 * 86400;
const MISS_TTL = 86400;
const IP_LIMIT = 10;
const UPSTREAM_TIMEOUT_MS = 8000;
const USER_AGENT = 'VerseRain/4.0 (https://verserain.com; hungry4grace@gmail.com)';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = req.query || {};
  const q = String(query.q || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!q) return res.status(400).json({ error: 'q required' });
  const lang = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(String(query.lang || '')) ? String(query.lang) : 'zh-TW';

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  const cacheKey = `geocode:q:${createHash('sha1').update(q).digest('hex')}`;

  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      const hit = typeof cached === 'string' ? safeJson(cached) : cached;
      if (hit && hit.notFound) return res.status(404).json({ error: 'not_found' });
      if (hit && Number.isFinite(hit.lat)) return res.status(200).json(hit);

      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      const ipKey = `geocode:ip:${ip}`;
      const n = await redis.incr(ipKey);
      await redis.expire(ipKey, 60);
      if (n > IP_LIMIT) return res.status(429).json({ error: 'rate_limited', retryAfter: 60 });

      const lock = await redis.set('geocode:lock', '1', { nx: true, px: 1100 });
      if (!lock) return res.status(429).json({ error: 'busy', retryAfter: 1 });
    }

    // Nominatim rarely knows Taiwanese house numbers written in Chinese
    // (「市府路1號」), but it does know the street. Try the full address
    // first, then the address with the number / floor stripped — flagged
    // `approximate` so the form asks the owner to drag the pin to the door.
    let first = null, approximate = false;
    const candidates = [q];
    const street = q.replace(/(\d+(?:之\d+)?號|\d+樓|\d+F|B\d+)[^\s,，]*$/u, '').replace(/[\s,，、]+$/u, '').trim();
    if (street && street !== q && street.length >= 4) candidates.push(street);
    try {
      for (let i = 0; i < candidates.length; i++) {
        if (i > 0) {
          // Respect the 1 req/s policy between the two upstream calls.
          await new Promise(r => setTimeout(r, 1100));
          if (redis) await redis.set('geocode:lock', '1', { px: 1100 });
        }
        const rows = await nominatim(candidates[i], lang);
        first = Array.isArray(rows) ? rows[0] : null;
        if (first) { approximate = i > 0; break; }
      }
    } catch {
      return res.status(502).json({ error: 'geocode_failed' });
    }
    if (!first) {
      if (redis) await redis.set(cacheKey, JSON.stringify({ notFound: true }), { ex: MISS_TTL });
      return res.status(404).json({ error: 'not_found' });
    }
    const result = { lat: Number(first.lat), lng: Number(first.lon), displayName: String(first.display_name || ''), approximate };
    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return res.status(502).json({ error: 'geocode_failed' });
    if (redis) await redis.set(cacheKey, JSON.stringify(result), { ex: HIT_TTL });
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function nominatim(q, lang) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}&accept-language=${encodeURIComponent(lang)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.verserain.com/' }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`nominatim ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }
