import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const res = await redis.hmget('leaderboard_meta:set:core-verse-john', 'hungry@y', 'Hungry001');
  console.log(res);
}
run().catch(console.error);
