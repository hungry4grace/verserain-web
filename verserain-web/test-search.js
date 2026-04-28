import { Redis } from '@upstash/redis';
async function check() {
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN });
  const allData = await redis.zrange('verse_stats:creator_points', 0, -1);
  const sets = {};
  
  for (const author of allData) {
    const history = await redis.lrange(`gamification:history:creator:${author}`, 0, -1);
    for (const item of history) {
      let vname = null;
      let timestamp = null;
      if (typeof item === 'object' && item.verseSetName) {
        vname = item.verseSetName;
        timestamp = item.timestamp;
      }
      if (typeof item === 'string') {
        try { const parsed = JSON.parse(item); vname = parsed.verseSetName; timestamp = parsed.timestamp; } catch(e){}
      }
      if (vname) {
        if (!sets[vname]) sets[vname] = [];
        sets[vname].push({ author, timestamp });
      }
    }
  }
  
  for (const vname of Object.keys(sets)) {
    const authors = [...new Set(sets[vname].map(x => x.author))];
    if (authors.length > 1) {
      console.log(`Set: ${vname} has multiple authors: ${authors.join(', ')}`);
    }
  }
}
check().catch(console.error);
