import { Redis } from '@upstash/redis';

// POST { author, amount, scoreAmount, player, type, refereeEmail }
//
// Referral gamification points. The invite reward ('referred' to the inviter,
// 'invited_by' to the new player) fires when the referee first clears a
// verse, and the client only remembers that with a per-DEVICE flag — so a
// second phone claimed it again and the inviter got paid twice. The server
// now latches each claim per account (refereeEmail, falling back to the
// referee's name/code for guests); a replay is acknowledged but pays nothing.
export const CLAIMS_KEY = 'gamification:invite-claimed';

export function inviteClaimMember({ type, author, player, refereeEmail }) {
  if (type !== 'referred' && type !== 'invited_by') return null;
  const email = String(refereeEmail || '').trim().toLowerCase();
  // 'referred':   author = inviter, player = referee's name
  // 'invited_by': author = referee's code, player = inviter
  const who = email ? `email:${email}` : (type === 'referred' ? `name:${player}` : `code:${author}`);
  return `${who}:${type}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { author, amount = 1, scoreAmount = 0, player, type, refereeEmail } = req.body;
  if (!author) return res.status(400).json({ error: 'Missing author' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    const claim = inviteClaimMember({ type, author, player, refereeEmail });
    if (claim && !(await redis.sadd(CLAIMS_KEY, claim))) {
      return res.status(200).json({ success: true, duplicate: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    // Save referral gamification points to a separate set from 'creator_points'
    const promises = [
      redis.zincrby('gamification:referrals:alltime', amount, author),
      redis.zincrby(`gamification:referrals:monthly:${month}`, amount, author)
    ];

    if (scoreAmount > 0) {
      promises.push(
        redis.zincrby('leaderboard_sum:alltime', scoreAmount, author),
        redis.zincrby(`leaderboard_sum:monthly:${month}`, scoreAmount, author),
        redis.zincrby(`leaderboard_sum:daily:${today}`, scoreAmount, author)
      );
    }

    if (player && type) {
      const record = JSON.stringify({ player, amount, scoreAmount, timestamp: Date.now(), type });
      promises.push(redis.lpush(`gamification:history:referral:${author}`, record));
    }

    await Promise.all(promises);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
