import { Redis } from '@upstash/redis';

// A referee (B) reached a garden milestone (1 / 10 / 100 trees planted) → drop
// a notification into the inviter (A)'s personalCode-keyed inbox so A can cheer
// B on. Idempotent per (refereeCode, milestone) so replays never double-notify.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { inviterCode, refereeCode, refereeName, milestone } = req.body || {};
  const ms = Number(milestone);
  if (!inviterCode || !ms) return res.status(400).json({ error: 'Missing inviterCode or milestone' });
  if (inviterCode === refereeCode) return res.status(200).json({ success: true, selfReferral: true });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    // Server-side idempotency guard (client also latches in localStorage): only
    // the first report of a given milestone for this referee gets through.
    if (refereeCode) {
      const added = await redis.sadd(`gamification:ms-sent:${refereeCode}`, String(ms));
      if (!added) return res.status(200).json({ success: true, duplicate: true });
    }

    const key = `gamification:notify:${inviterCode}`;
    const record = JSON.stringify({
      kind: 'milestone',
      refereeCode: refereeCode || '',
      refereeName: refereeName || '',
      milestone: ms,
      at: new Date().toISOString(),
    });
    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 49);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
