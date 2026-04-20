import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  });

  const creatorPoints = await redis.zrange('verse_stats:creator_points', 0, -1, { withScores: true });
  console.log('Total entries in verse_stats:creator_points:', creatorPoints.length / 2);
  console.log('Entries:', creatorPoints);
  
  // also check other sets
  const keys = await redis.keys('*');
  console.log('DB Keys:', keys);
}
run();
