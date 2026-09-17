import { Redis } from '@upstash/redis';

// Index a native iOS APNs device token by the device's personalCode so
// referral milestone / cheer notifications can reach it on demand. The native
// app also uploads the token to PartyKit (/save-apns-token) for the daily-push
// cron; this Redis set is the personalCode → tokens lookup the on-demand
// referral sender uses.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, token } = req.body || {};
  if (!code || !token) return res.status(400).json({ error: 'Missing code or token' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    await redis.sadd(`apnstokens:${code}`, token);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
