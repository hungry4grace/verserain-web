import { Redis } from '@upstash/redis';

async function main() {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.error("Missing redis credentials in .env.local");
    return;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });
  
  console.log("Fetching all authors...");
  const allData = await redis.zrange('verse_stats:creator_points', 0, -1, { withScores: true });
  
  const authors = [];
  for (let i = 0; i < allData.length; i += 2) {
    authors.push(allData[i]);
  }
  
  console.log(`Found ${authors.length} authors. Starting recalculation...`);
  
  for (const author of authors) {
    console.log(`\nProcessing author: ${author}`);
    
    const historyStrings = await redis.lrange(`gamification:history:creator:${author}`, 0, -1);
    if (!historyStrings || historyStrings.length === 0) {
      console.log(`  No history found. Setting points to 0.`);
      await redis.zadd('verse_stats:creator_points', { score: 0, member: author });
      continue;
    }
    
    const history = historyStrings.map(s => typeof s === 'string' ? JSON.parse(s) : s);
    history.reverse(); // Now oldest is first
    
    let recalculatedPoints = 0;
    const uniquePlayersPerSet = {};
    
    const updatedHistory = [];
    
    for (const record of history) {
      if (record.player && record.verseSetName) {
        if (!uniquePlayersPerSet[record.verseSetName]) {
          uniquePlayersPerSet[record.verseSetName] = new Set();
        }
        
        if (!uniquePlayersPerSet[record.verseSetName].has(record.player)) {
          uniquePlayersPerSet[record.verseSetName].add(record.player);
          record.amount = 1;
          recalculatedPoints += 1;
        } else {
          record.amount = 0;
        }
      } else {
        record.amount = 1;
        recalculatedPoints += 1;
      }
      updatedHistory.push(record);
    }
    
    console.log(`  Original history count: ${history.length}, New Points: ${recalculatedPoints}`);
    
    await redis.del(`gamification:history:creator:${author}`);
    
    const pipeline = redis.pipeline();
    
    for (const record of updatedHistory) {
      pipeline.lpush(`gamification:history:creator:${author}`, JSON.stringify(record));
    }
    
    pipeline.zadd('verse_stats:creator_points', { score: recalculatedPoints, member: author });
    
    for (const verseSetName of Object.keys(uniquePlayersPerSet)) {
      const players = Array.from(uniquePlayersPerSet[verseSetName]);
      const setKey = `gamification:unique_players:${author}:${verseSetName}`;
      pipeline.del(setKey);
      if (players.length > 0) {
        pipeline.sadd(setKey, ...players);
      }
    }
    
    await pipeline.exec();
    console.log(`  Successfully updated ${author}`);
  }
  
  console.log("\nRecalculation complete!");
}

main().catch(console.error);
