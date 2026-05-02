import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: "https://glowing-bedbug-94912.upstash.io",
  token: "gQAAAAAAAXLAAAIncDEyNGM0NjRiZjY2MDQ0NjQ1OTkyOGM5Y2RlNGI1ZWJlY3AxOTQ5MTI",
});
async function run() {
  const elements = await redis.zrange('leaderboard_sum:alltime', 0, 100, { rev: true, withScores: true });
  const result = [];
  // strict personalCode format: exactly 10 chars, drawn from the specific alphabet, MUST contain at least one upper, one lower, one digit.
  const codeRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[2-9])[A-HJ-NP-Za-km-z2-9]{10}$/; 
  for (let i = 0; i < elements.length; i += 2) {
      const member = elements[i];
      if (!codeRegex.test(member)) {
          result.push(member);
      } else {
          console.log("Filtered out:", member);
      }
  }
}
run();
