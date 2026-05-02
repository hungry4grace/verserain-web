import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: "https://glowing-bedbug-94912.upstash.io",
  token: "gQAAAAAAAXLAAAIncDEyNGM0NjRiZjY2MDQ0NjQ1OTkyOGM5Y2RlNGI1ZWJlY3AxOTQ5MTI",
});
async function run() {
  const elements = await redis.zrange('leaderboard_sum:daily:2026-05-02', 0, 100, { rev: true, withScores: true });
  console.log("2026-05-02 elements:", elements);
}
run();
