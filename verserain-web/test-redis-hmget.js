import { Redis } from '@upstash/redis';

async function run() {
  const redis = new Redis({
    url: 'https://glowing-bedbug-94912.upstash.io',
    token: 'gQAAAAAAAXLAAAIncDEyNGM0NjRiZjY2MDQ0NjQ1OTkyOGM5Y2RlNGI1ZWJlY3AxOTQ5MTI',
  });

  const setId = 'core-verse-john';
  const metaKey = `leaderboard_meta:set:${setId}`;

  const members = ['TestHero'];
  
  const metadataArray = await redis.hmget(metaKey, ...members);
  
  const records = [{name: 'TestHero'}].map((player) => {
      let meta = {};
      try {
        if (metadataArray && metadataArray[player.name]) {
            let rawMeta = metadataArray[player.name];
            meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
      return {
        name: player.name,
        mode: meta.mode || '未知 (Unknown)',
        passedCount: meta.passedCount || 0,
        totalCount: meta.totalCount || 0,
        date: meta.date || null
      };
  });
  console.log(records);
}
run();
