import { Redis } from '@upstash/redis';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v) acc[k] = v.join('=').replace(/^"|"$/g, '');
  return acc;
}, {});
const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN
});
const allData = await redis.zscore('verse_stats:creator_points', 'hungry@y');
console.log("SCORE:", allData);
