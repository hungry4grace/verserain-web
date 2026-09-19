import { Redis } from '@upstash/redis';
import { getReward, saveReward } from './_lib/rewards.js';

// The recipient taps 「領取」 on a reward notification and confirms where to
// send it. Attaches contact info to the ledger entry and moves it from
// pending → claimed so the admin knows it's real and reachable. The caller must
// present the personalCode the reward was issued to.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const { rewardId, code, email, name } = body;
  const contactEmail = String(email || '').trim();
  if (!rewardId || !code) return res.status(400).json({ error: 'rewardId and code required' });
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ error: '請輸入有效的 Email (valid email required)' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const reward = await getReward(redis, rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });
    if (reward.code !== code) return res.status(403).json({ error: 'Forbidden' });

    reward.contactEmail = contactEmail;
    if (name) reward.contactName = String(name).trim().slice(0, 40);
    if (reward.status === 'pending') reward.status = 'claimed';
    reward.claimedAt = reward.claimedAt || new Date().toISOString();
    await saveReward(redis, reward);
    res.status(200).json({ success: true, reward });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
