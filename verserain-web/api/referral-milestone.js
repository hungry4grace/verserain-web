import { Redis } from '@upstash/redis';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';
import { createReward, recordQualifiedReferral, VERSES_PER_REWARD } from './_lib/rewards.js';

// A referee (B) reached a garden milestone (1 / 10 / every 100 trees planted):
//   • drop a notification into the inviter (A)'s personalCode-keyed inbox so A
//     can cheer B on;
//   • at B's FIRST tree, count B as a qualified referral of A (A earns a reward
//     at every 10th qualified referral);
//   • at every 100th tree, B earns a reward.
// Idempotent per (refereeCode, milestone) so replays never double-notify or
// double-award.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { inviterCode, refereeCode, refereeName, refereeEmail, milestone } = req.body || {};
  const ms = Number(milestone);
  if (!inviterCode || !ms) return res.status(400).json({ error: 'Missing inviterCode or milestone' });
  if (inviterCode === refereeCode) return res.status(200).json({ success: true, selfReferral: true });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    // Server-side idempotency guard (client also latches in localStorage): only
    // the first report of a given milestone for this referee gets through.
    if (refereeCode) {
      const added = await redis.sadd(`gamification:ms-sent:${refereeCode}`, String(ms));
      if (!added) return res.status(200).json({ success: true, duplicate: true });
    }

    const key = `gamification:notify:${inviterCode}`;
    const record = JSON.stringify({
      kind: 'milestone',
      refereeCode: refereeCode || '',
      refereeName: refereeName || '',
      milestone: ms,
      at: new Date().toISOString(),
    });
    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 49);

    // Also push to the inviter's phone (best-effort; never blocks the response).
    const who = refereeName || '你邀請的朋友';
    const bodyText = ms >= 100
      ? `${who} 完成了 ${ms} 個經文，種滿了 ${ms / 100} 塊田地！給他一個讚 👍`
      : ms >= 10
        ? `${who} 已種下 10 棵樹（10 個經文）！給他一個讚 👍`
        : `${who} 種下了第一棵樹（第一個經文）！給他一個讚 👍`;
    const tag = `verserain-ms-${refereeCode || ''}-${ms}`;
    await Promise.all([
      sendReferralPush(inviterCode, { title: '🌱 VerseRain', body: bodyText, url: 'https://www.verserain.com/?notify=1', tag }).catch(() => {}),
      sendReferralApns(inviterCode, { title: '🌱 VerseRain', body: bodyText, url: 'https://www.verserain.com/?notify=1', collapseId: tag }).catch(() => {}),
    ]);

    // Rewards. Both are guarded by the ms-sent latch above, so a replay can't
    // re-count a referral or re-award a field.
    const rewards = {};
    if (ms === 1) {
      rewards.qualifiedReferral = await recordQualifiedReferral(redis, { inviterCode, refereeCode });
    }
    if (ms >= VERSES_PER_REWARD && ms % VERSES_PER_REWARD === 0 && refereeCode) {
      rewards.verses = await createReward(redis, { code: refereeCode, name: refereeName, email: refereeEmail, kind: 'verses', milestone: ms, inviterCode });
    }

    res.status(200).json({ success: true, rewards });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
