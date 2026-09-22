import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { listVouchersForEmail, listVouchersForPlace, summarizeVouchers, publicVoucher, getPlaceRaw, normEmail } from './_lib/points.js';

// Redemption history (兌換紀錄).
//   GET ?scope=me&email=&sessionKey=              → the player's own vouchers
//   GET ?scope=place&placeId=&email=&sessionKey=  → a merchant's ledger (owner only)
// Both need the sign-in proof; the merchant view never includes the holder's
// email (publicVoucher masks the name).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query || {};
  const email = normEmail(q.email);
  const sessionKey = String(q.sessionKey || '');
  const scope = q.scope === 'place' ? 'place' : 'me';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ vouchers: [], summary: summarizeVouchers([]), mocked: true });

  try {
    let elig;
    try {
      elig = await partyFetch('/reward-eligibility', { email, sessionKey, inviterCodes: [] });
    } catch (e) {
      return res.status(e instanceof PartyError && e.status ? 502 : 503).json({ error: 'verify_unavailable', detail: e.message });
    }
    if (!elig.identity || !elig.identity.sessionValid) return res.status(401).json({ error: 'session_invalid' });

    const redis = new Redis({ url: redisUrl, token: redisToken });
    const now = new Date();
    if (scope === 'me') {
      const list = await listVouchersForEmail(redis, email, { now });
      const vouchers = list.map((v) => ({ ...publicVoucher(v, now), computedStatus: v.computedStatus }));
      return res.status(200).json({ vouchers, summary: summarizeVouchers(list) });
    }
    const placeId = String(q.placeId || '');
    const place = placeId ? await getPlaceRaw(redis, placeId) : null;
    if (!place) return res.status(404).json({ error: 'place_not_found' });
    if (normEmail(place.ownerEmail) !== email) return res.status(403).json({ error: 'not_owner' });
    const list = await listVouchersForPlace(redis, placeId, { now });
    const vouchers = list.map((v) => ({ ...publicVoucher(v, now), computedStatus: v.computedStatus }));
    return res.status(200).json({ place: { id: place.id, name: place.name, discountPct: place.discountPct, stats: place.stats || {} }, vouchers, summary: summarizeVouchers(list) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
