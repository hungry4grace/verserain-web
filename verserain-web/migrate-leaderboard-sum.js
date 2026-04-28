import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  });
}

async function migrate() {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
     console.error("Missing Redis credentials in .env.local");
     return;
  }
  
  const redis = new Redis({ url: redisUrl, token: redisToken });
  
  console.log("Fetching all leaderboard keys...");
  const keys = await redis.keys('leaderboard:*');
  
  // Maps to aggregate data
  const alltimeSum = {};
  const alltimeClears = {};
  
  const monthlySums = {}; // monthlySums['2026-04'][member]
  const monthlyClears = {};
  
  const dailySums = {}; // dailySums['2026-04-24'][member]
  const dailyClears = {};

  for (const key of keys) {
    if (key.startsWith('leaderboard_meta:') || key === 'leaderboard:global' || key.endsWith(':global')) continue;
    
    let isMonthly = false;
    let isDaily = false;
    let timeKey = null;
    
    if (key.includes(':monthly:')) {
       isMonthly = true;
       timeKey = key.split(':')[2];
       if (!monthlySums[timeKey]) monthlySums[timeKey] = {};
       if (!monthlyClears[timeKey]) monthlyClears[timeKey] = {};
    } else if (key.includes(':daily:')) {
       isDaily = true;
       timeKey = key.split(':')[2];
       if (!dailySums[timeKey]) dailySums[timeKey] = {};
       if (!dailyClears[timeKey]) dailyClears[timeKey] = {};
    }

    const data = await redis.zrange(key, 0, -1, { withScores: true });
    for (let i = 0; i < data.length; i += 2) {
       const member = data[i];
       const score = parseFloat(data[i+1]);
       
       if (isMonthly) {
          monthlySums[timeKey][member] = (monthlySums[timeKey][member] || 0) + score;
          monthlyClears[timeKey][member] = (monthlyClears[timeKey][member] || 0) + 1;
       } else if (isDaily) {
          dailySums[timeKey][member] = (dailySums[timeKey][member] || 0) + score;
          dailyClears[timeKey][member] = (dailyClears[timeKey][member] || 0) + 1;
       } else {
          alltimeSum[member] = (alltimeSum[member] || 0) + score;
          alltimeClears[member] = (alltimeClears[member] || 0) + 1;
       }
    }
  }

  console.log("Aggregated data. Saving to redis...");
  const pipeline = redis.pipeline();
  
  let count = 0;
  
  // Alltime
  for (const [member, score] of Object.entries(alltimeSum)) { pipeline.zadd('leaderboard_sum:alltime', { score, member }); count++; }
  for (const [member, clears] of Object.entries(alltimeClears)) pipeline.zadd('leaderboard_clears:alltime', { score: clears, member });
  
  // Monthly
  for (const [month, data] of Object.entries(monthlySums)) {
     for (const [member, score] of Object.entries(data)) { pipeline.zadd(`leaderboard_sum:monthly:${month}`, { score, member }); count++; }
  }
  for (const [month, data] of Object.entries(monthlyClears)) {
     for (const [member, clears] of Object.entries(data)) pipeline.zadd(`leaderboard_clears:monthly:${month}`, { score: clears, member });
  }

  // Daily
  for (const [day, data] of Object.entries(dailySums)) {
     for (const [member, score] of Object.entries(data)) { pipeline.zadd(`leaderboard_sum:daily:${day}`, { score, member }); count++; }
  }
  for (const [day, data] of Object.entries(dailyClears)) {
     for (const [member, clears] of Object.entries(data)) pipeline.zadd(`leaderboard_clears:daily:${day}`, { score: clears, member });
  }

  console.log(`Writing ${count} sum records to Redis pipeline...`);
  await pipeline.exec();
  console.log("Migration finished successfully!");
}

migrate().catch(console.error);
