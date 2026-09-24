import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { listReferralBonus, normEmail } from './_lib/points.js';

// Merchant referral rewards (商家推薦獎勵) the signed-in player has earned:
//   GET ?email=&sessionKey=  → { items, totalBonus, referrerCode }
// items are newest first: { kind:'earned'|'reversed', code, placeId, placeName,
// playerName (masked), points, bonus, referrerCode, at }. Needs the sign-in
// proof like redeem-history — the ledger is keyed by the account's email.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query || {};
  const email = normEmail(q.email);
  const sessionKey = String(q.sessionKey || '');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ items: [], totalBonus: 0, referrerCode: '', mocked: true });

  try {
    let elig;
    try {
      elig = await partyFetch('/reward-eligibility', { email, sessionKey, inviterCodes: [] });
    } catch (e) {
      return res.status(e instanceof PartyError && e.status ? 502 : 503).json({ error: 'verify_unavailable', detail: e.message });
    }
    if (!elig.identity || !elig.identity.sessionValid) return res.status(401).json({ error: 'session_invalid' });

    const redis = new Redis({ url: redisUrl, token: redisToken });
    const { items, totalBonus } = await listReferralBonus(redis, email);
    return res.status(200).json({ items, totalBonus, referrerCode: String(elig.identity.personalCode || '') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
