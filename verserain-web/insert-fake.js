import { Redis } from '@upstash/redis';

async function run() {
  const redis = new Redis({
    url: 'https://glowing-bedbug-94912.upstash.io',
    token: 'gQAAAAAAAXLAAAIncDEyNGM0NjRiZjY2MDQ0NjQ1OTkyOGM5Y2RlNGI1ZWJlY3AxOTQ5MTI',
  });

  const setId = 'core-verse-john';
  const metaKey = `leaderboard_meta:set:${setId}`;
  const zsetKey = `leaderboard:set:${setId}`;

  const name = 'TestHero';
  const score = 9999;
  
  await redis.zadd(zsetKey, { score, member: name });
  const metadata = JSON.stringify({
      mode: 'VerseRain-dx1',
      passedCount: 5,
      totalCount: 5,
      date: new Date().toISOString()
  });
  await redis.hset(metaKey, { [name]: metadata });
  console.log('Inserted fake record for TestHero!');
}
run();
