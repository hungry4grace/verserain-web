import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  });

  const membersToRemove = ['EkptGDTNuw', 'gp9'];

  const keys = await redis.keys('leaderboard*');
  console.log('Found keys:', keys.length);
  
  for (const member of membersToRemove) {
    let deletedCount = 0;
    for (const key of keys) {
      const type = await redis.type(key);
      if (type === 'zset') {
        const removed = await redis.zrem(key, member);
        if (removed > 0) {
          console.log(`Removed ${member} from ${key}`);
          deletedCount++;
        }
      }
    }
    console.log(`Done. Removed ${member} from ${deletedCount} keys.`);
  }
}
run();
