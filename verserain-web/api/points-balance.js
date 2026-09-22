import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { readBalance, LEADERBOARD_KEY } from './_lib/points.js';

// Points balance (積分折抵餘額).
//   GET ?email=&sessionKey=
//   → { earnedPoints, plausiblePoints, spentPoints, balancePoints, balanceNTD,
//       monthlyUsedNTD, monthlyCapNTD, voucherCapNTD, pointsPerNTD, eligible,
//       reasons, openVoucher|null, passedVerses, accountAgeDays, playerName }
// Identity comes from PartyKit (never the client): an invalid session is 401,
// and PartyKit being unreachable fails closed with 503.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query || {};
  const email = String(q.email || '').trim().toLowerCase();
  const sessionKey = String(q.sessionKey || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });
  if (!sessionKey) return res.status(401).json({ error: 'session_invalid' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ mocked: true, earnedPoints: 0, balancePoints: 0, balanceNTD: 0, eligible: false, reasons: [], openVoucher: null });

  try {
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

    const redis = new Redis({ url: redisUrl, token: redisToken });
    const score = identity.playerName ? await redis.zscore(LEADERBOARD_KEY, identity.playerName) : null;
    const earnedPoints = score === null || score === undefined ? 0 : Math.max(0, Math.floor(Number(score) || 0));
    const balance = await readBalance(redis, { email, identity, garden, now: new Date(), earnedPoints });
    res.status(200).json({
      ...balance,
      passedVerses: garden.passedVerses || 0,
      accountAgeDays: identity.accountAgeDays ?? null,
      playerName: identity.playerName || '',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
