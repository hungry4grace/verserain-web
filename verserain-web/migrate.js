import { Redis } from '@upstash/redis';

async function migrate() {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = new Redis({ url: redisUrl, token: redisToken });
  
  // Get all authors to search their histories
  const allData = await redis.zrange('verse_stats:creator_points', 0, -1);
  const authors = [];
  for (const a of allData) {
    if (a !== 'EmilyWen') authors.push(a);
  }
  
  let totalMoved = 0;
  const toMoveToEmily = [];
  
  for (const author of authors) {
    const historyStrings = await redis.lrange(`gamification:history:creator:${author}`, 0, -1);
    if (!historyStrings || historyStrings.length === 0) continue;
    
    const toKeep = [];
    let authorMoved = 0;
    
    for (const item of historyStrings) {
      let parsed = item;
      if (typeof item === 'string') parsed = JSON.parse(item);
      
      if (parsed.verseSetName && parsed.verseSetName.includes('福音四步')) {
        toMoveToEmily.push(parsed);
        authorMoved++;
      } else {
        toKeep.push(parsed);
      }
    }
    
    if (authorMoved > 0) {
      console.log(`Moving ${authorMoved} items from ${author}...`);
      await redis.del(`gamification:history:creator:${author}`);
      
      if (toKeep.length > 0) {
        toKeep.reverse();
        const pipeline = redis.pipeline();
        for (const item of toKeep) {
          pipeline.lpush(`gamification:history:creator:${author}`, JSON.stringify(item));
        }
        await pipeline.exec();
      }
      totalMoved += authorMoved;
    }
  }
  
  if (totalMoved > 0) {
    console.log(`\nAdding ${totalMoved} items to EmilyWen's history...`);
    
    const emilyHistoryStr = await redis.lrange('gamification:history:creator:EmilyWen', 0, -1);
    const emilyHistory = (emilyHistoryStr || []).map(i => typeof i === 'string' ? JSON.parse(i) : i);
    
    const combinedEmily = [...emilyHistory, ...toMoveToEmily];
    // Sort from newest to oldest
    combinedEmily.sort((a, b) => b.timestamp - a.timestamp);
    
    await redis.del('gamification:history:creator:EmilyWen');
    combinedEmily.reverse(); // oldest to newest for lpush
    
    const pipeline = redis.pipeline();
    for (const item of combinedEmily) {
      pipeline.lpush('gamification:history:creator:EmilyWen', JSON.stringify(item));
    }
    await pipeline.exec();
    
    console.log("Migration complete!");
  } else {
    console.log("No items found to migrate.");
  }
}

migrate().catch(console.error);
