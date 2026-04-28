import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: "https://fluent-piglet-43555.upstash.io",
  token: "AbojAAIjcDFjNGViMGYxNTAxMzU0ZTY5YWQwZjY4NmEzMDliNTMyOHAxMA"
});
async function run() {
  const allData = await redis.zrange('verse_stats:creator_points', 0, -1, { withScores: true });
  console.log(allData);
}
run();
