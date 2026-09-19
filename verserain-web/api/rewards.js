import { Redis } from '@upstash/redis';
import { isAdminEmail } from './_lib/admins.js';
import { listRewards, getReward, saveReward, pushNotify, rewardTitle } from './_lib/rewards.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';

// Admin view of the reward ledger.
//   GET  ?adminEmail=              → { rewards: [...] } newest first
//   POST { adminEmail, rewardId, action: 'sent' | 'unsent', note }
// Marking 'sent' notifies the recipient (inbox + push) that their reward is on
// its way. Note: like the rest of the API, "admin" is a whitelist check on the
// supplied email — there is no session auth in this codebase yet.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.method === 'POST' ? (typeof req.body === 'string' ? safeJson(req.body) : (req.body || {})) : {};
  const adminEmail = req.method === 'GET' ? req.query.adminEmail : body.adminEmail;
  if (!isAdminEmail(adminEmail)) return res.status(403).json({ error: 'Forbidden' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ rewards: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    if (req.method === 'GET') {
      return res.status(200).json({ rewards: await listRewards(redis) });
    }

    const { rewardId, action, note } = body;
    if (!rewardId || !['sent', 'unsent'].includes(action)) return res.status(400).json({ error: 'rewardId and action (sent|unsent) required' });
    const reward = await getReward(redis, rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });

    if (action === 'sent') {
      const alreadySent = reward.status === 'sent';
      reward.status = 'sent';
      reward.sentAt = reward.sentAt || new Date().toISOString();
      reward.sentBy = String(adminEmail).toLowerCase();
      if (note !== undefined) reward.note = String(note || '');
      await saveReward(redis, reward);
      if (!alreadySent) {
        await pushNotify(redis, reward.code, { kind: 'reward_sent', rewardId: reward.id, rewardKind: reward.kind, milestone: reward.milestone });
        const text = `你${rewardTitle(reward)}的獎勵已經寄出了 🎁 請查看 Email 或訊息`;
        const tag = `verserain-reward-sent-${reward.id}`;
        await Promise.all([
          sendReferralPush(reward.code, { title: '🎁 VerseRain', body: text, url: 'https://www.verserain.com/?notify=1', tag }).catch(() => {}),
          sendReferralApns(reward.code, { title: '🎁 VerseRain', body: text, url: 'https://www.verserain.com/?notify=1', collapseId: tag }).catch(() => {}),
        ]);
      }
    } else {
      reward.status = reward.contactEmail ? 'claimed' : 'pending';
      delete reward.sentAt;
      delete reward.sentBy;
      await saveReward(redis, reward);
    }
    res.status(200).json({ success: true, reward });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
