import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { verseRef } = req.query;

  if (!verseRef) {
    return res.status(400).json({ error: 'verseRef query parameter is required' });
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.log("Mocking scores because Upstash is not yet connected");
    return res.status(200).json([
      { name: "👑 虛位以待", score: 5000, date: Date.now() },
      { name: "趕快去申請資料庫", score: 3000, date: Date.now() - 100000 }
    ]);
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const leaderboardKey = `leaderboard:${verseRef}`;
    
    // ZREVRANGE: get elements from sorted set with scores, highest first
    // We get top 10 (indices 0 to 9)
    const elements = await redis.zrange(leaderboardKey, 0, 9, { rev: true, withScores: true });
    
    // elements comes back as [ "David", 4500, "Mary", 4200, ... ]
    // or [{member: "David", score: 4500}, ...] depending on library version. Upstash returns array by default.
    const result = [];
    
    if (elements.length > 0 && typeof elements[0] === 'object') {
       // It's possible it returns an array of objects
       elements.forEach(el => result.push({ name: el.member, score: el.score }));
    } else {
       for (let i = 0; i < elements.length; i += 2) {
         result.push({ name: elements[i], score: elements[i + 1] });
       }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get scores", error);
    res.status(500).json({ error: error.message });
  }
}
