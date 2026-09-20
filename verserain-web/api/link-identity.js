import { Redis } from '@upstash/redis';

// Every name / personalCode an account has ever been known by.
//
//   POST { email, keys: [...] }  → SADD identity:keys:<email>   → { success, keys }
//   GET  ?email=                 → { keys }
//
// Referral history (gamification:history:referral:<key>) is written under
// whatever code the inviter's device had at the time — or their display name
// — so after a rename, a code unification, or an invite shared from another
// device, the records sit under keys the current device never sees. The
// client links its keys here on every login/rename, and the owner can add an
// old name or code by hand; get-referees searches the union.
export const identityKey = (email) => `identity:keys:${String(email || '').trim().toLowerCase()}`;
const MAX_KEYS_PER_CALL = 20;
const MAX_KEY_LEN = 40;

export function cleanKeys(keys) {
  const out = [];
  for (const k of Array.isArray(keys) ? keys : []) {
    const s = String(k ?? '').trim();
    if (s && s.length <= MAX_KEY_LEN && !out.includes(s)) out.push(s);
    if (out.length >= MAX_KEYS_PER_CALL) break;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = String((req.method === 'GET' ? req.query.email : req.body?.email) || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Missing email' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, keys: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    if (req.method === 'POST') {
      const keys = cleanKeys(req.body?.keys);
      if (!keys.length) return res.status(400).json({ error: 'Missing keys' });
      await Promise.all(keys.map((k) => redis.sadd(identityKey(email), k)));
    }
    const keys = (await redis.smembers(identityKey(email))) || [];
    res.status(200).json({ success: true, keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
