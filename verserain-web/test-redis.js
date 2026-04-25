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

async function test() {
  const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  for (let i = 0; i < 5; i++) {
      try {
         await redis.set('test_limit', '123');
         console.log('Success set');
         return;
      } catch (e) {
         console.error(`Attempt ${i+1} failed: ` + e.message);
      }
      await new Promise(r => setTimeout(r, 5000));
  }
}
test();
