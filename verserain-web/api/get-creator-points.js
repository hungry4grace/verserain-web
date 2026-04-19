import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { author } = req.query;
  if (!author) return res.status(400).json({ error: 'Missing author' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ points: 0, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const pts = await redis.zscore('verse_stats:creator_points', author);
    res.status(200).json({ points: parseFloat(pts) || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
