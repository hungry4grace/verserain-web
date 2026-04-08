import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, score, verseRef } = req.body;

  if (!name || typeof score !== 'number' || !verseRef) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Just mock success
    return res.status(200).json({ success: true, mocked: true });
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const leaderboardKey = `leaderboard:${verseRef}`;
    
    // Check if user already has a score for this verse
    const currentScore = await redis.zscore(leaderboardKey, name);
    
    // Only update if new score is higher or if they don't have a score
    if (currentScore === null || score > parseFloat(currentScore)) {
        await redis.zadd(leaderboardKey, { score: score, member: name });
        // Optional: keep leaderboard from growing infinitely, cap at 100 entries
        // await redis.zremrangebyrank(leaderboardKey, 0, -101);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to submit score", error);
    res.status(500).json({ error: error.message });
  }
}
