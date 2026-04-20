import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { author, amount = 1, player, type } = req.body;
  if (!author) return res.status(400).json({ error: 'Missing author' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    // Save referral gamification points to a separate set from 'creator_points'
    const p1 = redis.zincrby('gamification:referrals:alltime', amount, author);
    const p2 = redis.zincrby(`gamification:referrals:monthly:${month}`, amount, author);
    
    let p3 = Promise.resolve();
    if (player && type) {
      const record = JSON.stringify({ player, amount, timestamp: Date.now(), type });
      p3 = redis.lpush(`gamification:history:referral:${author}`, record);
    }

    await Promise.all([p1, p2, p3]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
