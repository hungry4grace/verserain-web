import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { issueVoucher, readBalance, getPlaceRaw, clientIp, ipRateLimit, publicVoucher, LEADERBOARD_KEY } from './_lib/points.js';

// Issue a discount voucher (積分折抵券).
//   POST { email, sessionKey, placeId, billNTD }
//   → 200 { success, voucher, balance }
//   → 400 bill_invalid | too_small        403 not_eligible { reasons }
//     404 place_unavailable              409 open_voucher_exists { voucher }
//     429 daily_place_limit | rate_limited
// Identity and the passed-verse count come from PartyKit; the client only
// names the place and the bill. Leaderboards are never touched — only the
// per-email spent ledger moves.
const ERROR_STATUS = {
  not_eligible: 403,
  place_unavailable: 404,
  bill_invalid: 400,
  too_small: 400,
  open_voucher_exists: 409,
  daily_place_limit: 429,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  const placeId = String(body.placeId || '').trim();
  const billNTD = Number(body.billNTD);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });
  if (!sessionKey) return res.status(401).json({ error: 'session_invalid' });
  if (!placeId) return res.status(400).json({ error: 'place_unavailable' });
  if (!Number.isInteger(billNTD) || billNTD < 1 || billNTD > 100000) return res.status(400).json({ error: 'bill_invalid' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true, voucher: null });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const ip = clientIp(req);
    if (!(await ipRateLimit(redis, `redeem:issue:ip:${ip}`, 10, 60))) return res.status(429).json({ error: 'rate_limited' });

    let elig;
    try {
      elig = await partyFetch('/reward-eligibility', { email, sessionKey, inviterCodes: [] });
    } catch (e) {
      const status = e instanceof PartyError && e.status ? 502 : 503;
      return res.status(status).json({ error: 'verify_unavailable', detail: e.message });
    }
    const identity = elig.identity || {};
    const garden = elig.garden || {};
    if (!identity.sessionValid) return res.status(401).json({ error: 'session_invalid' });

    const place = await getPlaceRaw(redis, placeId);
    if (!place) return res.status(404).json({ error: 'place_unavailable' });

    const score = identity.playerName ? await redis.zscore(LEADERBOARD_KEY, identity.playerName) : null;
    const earnedPoints = score === null || score === undefined ? 0 : Math.max(0, Math.floor(Number(score) || 0));
    const now = new Date();

    let voucher;
    try {
      ({ voucher } = await issueVoucher(redis, { email, identity, garden, place, billNTD, now, earnedPoints }));
    } catch (e) {
      const status = e && e.code ? ERROR_STATUS[e.code] : undefined;
      if (!status) throw e;
      const out = { error: e.code };
      if (e.code === 'not_eligible') out.reasons = e.reasons || [];
      if (e.code === 'open_voucher_exists' && e.voucher) out.voucher = publicVoucher(e.voucher, now);
      return res.status(status).json(out);
    }

    const balance = await readBalance(redis, { email, identity, garden, now, earnedPoints });
    res.status(200).json({ success: true, voucher: publicVoucher(voucher, now), balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
