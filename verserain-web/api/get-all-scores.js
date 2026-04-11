import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(200).json({ alltime: [], monthly: [], daily: [] });
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    // Get all base leaderboard keys (skipping daily, monthly, global ones)
    const keys = await Promise.all([
        redis.keys('leaderboard:*')
    ]);
    
    // We expect keys[0] to have the array
    const allKeys = keys[0] || [];
    const validVerseKeys = allKeys.filter(k => 
        !k.includes(':monthly:') && 
        !k.includes(':daily:') && 
        k !== 'leaderboard:global' &&
        !k.startsWith('leaderboard_meta')
    );

    let alltime = [];
    let monthly = [];
    let daily = [];

    // For each valid verse key, we fetch the leaderboard
    // We will construct the verseRef from the key itself: "leaderboard:" + verseRef
    const fetchPromises = validVerseKeys.map(async (k) => {
        const verseRef = k.substring('leaderboard:'.length);
        const metaKey = `leaderboard_meta:${verseRef}`;
        
        const [alltimeData, monthlyData, dailyData, metas] = await Promise.all([
            redis.zrange(k, 0, 9, { rev: true, withScores: true }),
            redis.zrange(`leaderboard:monthly:${month}:${verseRef}`, 0, 9, { rev: true, withScores: true }),
            redis.zrange(`leaderboard:daily:${today}:${verseRef}`, 0, 9, { rev: true, withScores: true }),
            redis.hgetall(metaKey).catch(() => ({}))
        ]);

        const formatData = (dataArray) => {
            let res = [];
            if (dataArray.length > 0 && typeof dataArray[0] === 'object') {
               dataArray.forEach(el => res.push({ verseRef, name: el.member, score: el.score, mode: metas?.[el.member] || 'rain' }));
            } else {
               for (let i = 0; i < dataArray.length; i += 2) {
                 res.push({ verseRef, name: dataArray[i], score: dataArray[i + 1], mode: metas?.[dataArray[i]] || 'rain' });
               }
            }
            return res;
        };

        alltime = alltime.concat(formatData(alltimeData));
        monthly = monthly.concat(formatData(monthlyData));
        daily = daily.concat(formatData(dailyData));
    });

    await Promise.all(fetchPromises);

    // Sort all arrays by verseRef
    const sortByVerse = (a, b) => a.verseRef.localeCompare(b.verseRef);
    alltime.sort(sortByVerse);
    monthly.sort(sortByVerse);
    daily.sort(sortByVerse);

    res.status(200).json({ alltime, monthly, daily });
  } catch (error) {
    console.error("Failed to get all scores", error);
    res.status(500).json({ error: error.message });
  }
}
