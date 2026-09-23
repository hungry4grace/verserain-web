import { Redis } from '@upstash/redis';
import { partyFetch } from './_lib/party.js';
import { recordScore } from './_lib/points.js';

// Leaderboards stay keyed by playerName (guests included). When the caller
// also sends { email, sessionKey } and PartyKit confirms the session, the
// score is credited to the account ledger (總積分, api/_lib/points.js) —
// only the improvement over that verse's best counts. A bad or missing
// session never blocks the leaderboard write; it just earns no account points.
async function creditAccount(redis, { email, sessionKey, playerName, verseRef, score, fallbackBest }) {
  const em = String(email || '').trim().toLowerCase();
  const key = String(sessionKey || '').trim();
  if (!em || !key) return null;
  let check;
  try {
    check = await partyFetch('/session-check', { email: em, sessionKey: key });
  } catch {
    return { error: 'verify_unavailable' };
  }
  if (!check || !check.valid) return { error: 'session_invalid' };
  const r = await recordScore(redis, { email: em, playerName: check.playerName || playerName, verseRef, score, now: new Date(), fallbackBest });
  return { delta: r.delta, earnedPoints: r.earnedPoints, todayPoints: r.todayPoints };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const { name, score, verseRef, mode, email, sessionKey } = body;

  if (!name || typeof score !== 'number' || !verseRef) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Just mock success
    return res.status(200).json({ success: true, mocked: true });
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    const allTimeKey = `leaderboard:${verseRef}`;
    // Captured before the leaderboard is updated below: the account ledger
    // needs the best as it was, or the improvement would always read as 0.
    const prevVerseBestRaw = await redis.zscore(allTimeKey, name);
    const prevVerseBest = prevVerseBestRaw === null || prevVerseBestRaw === undefined ? 0 : Math.max(0, Math.floor(Number(prevVerseBestRaw) || 0));
    const monthlyKey = `leaderboard:monthly:${month}:${verseRef}`;
    const dailyKey = `leaderboard:daily:${today}:${verseRef}`;

    async function updateZset(key, verseMetaKey, sumPrefix, clearsPrefix) {
        const currentScore = await redis.zscore(key, name);
        const prevScoreNum = currentScore === null ? 0 : parseFloat(currentScore);
        
        if (currentScore === null || score > prevScoreNum) {
            await redis.zadd(key, { score: score, member: name });
            if (mode && verseMetaKey) {
               await redis.hset(`leaderboard_meta:${verseMetaKey}`, { [name]: mode });
            }

            const scoreDelta = score - prevScoreNum;
            if (scoreDelta > 0 && sumPrefix) {
               await redis.zincrby(`${sumPrefix}`, scoreDelta, name);
            }
            if (currentScore === null && clearsPrefix) {
               await redis.zincrby(`${clearsPrefix}`, 1, name);
            }
        }
    }

    await Promise.all([
        updateZset(allTimeKey, verseRef, 'leaderboard_sum:alltime', 'leaderboard_clears:alltime'),
        updateZset(monthlyKey, verseRef, `leaderboard_sum:monthly:${month}`, `leaderboard_clears:monthly:${month}`),
        updateZset(dailyKey, verseRef, `leaderboard_sum:daily:${today}`, `leaderboard_clears:daily:${today}`),
        // global tracks the single highest score across any verse (not a sum)
        updateZset("leaderboard:global", 'global', null, null),
        updateZset(`leaderboard:monthly:${month}:global`, 'global', null, null),
        updateZset(`leaderboard:daily:${today}:global`, 'global', null, null)
    ]);

    let points = null;
    try { points = await creditAccount(redis, { email, sessionKey, playerName: name, verseRef, score, fallbackBest: prevVerseBest }); }
    catch (e) { points = { error: e && e.message ? e.message : 'points_failed' }; }
    // Last outcome per account, so "my total did not move" can be diagnosed
    // without request logs: was a session sent, and what did the ledger say?
    const em = String(email || '').trim().toLowerCase();
    if (em) {
      const outcome = !sessionKey ? 'no_session' : (points && points.error) ? points.error : (points ? `credited:${points.delta}` : 'none');
      await redis.set(`points:lastsubmit:${em}`, JSON.stringify({ at: new Date().toISOString(), name, verseRef, score, outcome }), { ex: 7 * 86400 }).catch(() => {});
    }
    res.status(200).json({ success: true, points });
  } catch (error) {
    console.error("Failed to submit score", error);
    res.status(500).json({ error: error.message });
  }
}
