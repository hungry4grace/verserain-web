import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { listRewards, getReward, saveReward, pushNotify, rewardTitle, flagsFor } from './_lib/rewards.js';
import { listSponsors, getSponsor, poolStats, poolAccepts } from './_lib/sponsors.js';
import { CATALOG, DEFAULT_VALUE, isValidCurrency, voucherFor } from './_lib/rewardCatalog.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';

// Admin view of the reward ledger.
//   GET  ?adminEmail=              → { rewards, sponsors, pool, catalog, defaults }
//   POST { adminEmail, rewardId, action: 'sent', poolId?, voucherId?, voucherValue?,
//          voucherCurrency?, deliveredVia?, note? }
//   POST { adminEmail, rewardId, action: 'unsent' | 'reject', note?, reason? }
// Marking 'sent' debits the chosen sponsor pool (by value; the voucher code
// itself is never stored) and notifies the recipient (inbox + push).
// Auth: admin email whitelist AND the ADMIN_TOKEN header (see _lib/admins.js).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.method === 'POST' ? (typeof req.body === 'string' ? safeJson(req.body) : (req.body || {})) : {};
  const adminEmail = req.method === 'GET' ? req.query.adminEmail : body.adminEmail;
  const denied = requireAdmin(req, adminEmail);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ rewards: [], sponsors: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    if (req.method === 'GET') {
      const [rewards, sponsors] = await Promise.all([listRewards(redis), listSponsors(redis)]);
      const pool = poolStats(sponsors, rewards);
      return res.status(200).json({
        rewards: rewards.map(r => ({ ...r, flags: flagsFor(r) })),
        sponsors, pool, catalog: CATALOG, defaults: DEFAULT_VALUE,
      });
    }

    const { rewardId, action, note } = body;
    if (!rewardId || !['sent', 'unsent', 'reject'].includes(action)) return res.status(400).json({ error: 'rewardId and action (sent|unsent|reject) required' });
    const reward = await getReward(redis, rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });
    const by = String(adminEmail).toLowerCase();

    if (action === 'sent') {
      const alreadySent = reward.status === 'sent';
      const region = body.region || reward.region || 'tw';
      const voucherCurrency = String(body.voucherCurrency || reward.voucherCurrency || (region === 'intl' ? 'USD' : 'TWD')).toUpperCase();
      if (!isValidCurrency(voucherCurrency)) return res.status(400).json({ error: 'voucherCurrency must be TWD or USD' });
      const voucherValue = body.voucherValue === undefined ? Number(reward.voucherValue) || 0 : Number(body.voucherValue);
      if (!Number.isFinite(voucherValue) || voucherValue < 0) return res.status(400).json({ error: 'voucherValue must be a number' });
      const voucherId = String(body.voucherId || reward.voucherId || '');
      if (voucherId && !voucherFor(region, voucherId)) return res.status(400).json({ error: 'unknown voucherId for region' });
      const poolId = String(body.poolId ?? reward.poolId ?? '');
      if (poolId) {
        const sponsor = await getSponsor(redis, poolId);
        if (!sponsor || sponsor.active === false) return res.status(400).json({ error: 'unknown or inactive poolId' });
        if (sponsor.currency !== voucherCurrency) return res.status(400).json({ error: 'pool currency does not match voucher' });
        // A church pool pays only its own members (the claimant's church code).
        if (!poolAccepts(sponsor, reward)) return res.status(409).json({ error: 'church_mismatch' });
        if (!alreadySent) {
          const { bySponsor } = poolStats([sponsor], await listRewards(redis));
          const remaining = bySponsor[sponsor.id] ? bySponsor[sponsor.id].remaining : 0;
          if (remaining < voucherValue) return res.status(409).json({ error: 'insufficient_pool', remaining });
        }
      }
      reward.status = 'sent';
      reward.sentAt = reward.sentAt || new Date().toISOString();
      reward.sentBy = by;
      reward.region = region;
      reward.voucherCurrency = voucherCurrency;
      reward.voucherValue = voucherValue;
      if (voucherId) reward.voucherId = voucherId; else delete reward.voucherId;
      if (poolId) reward.poolId = poolId; else delete reward.poolId;
      if (body.deliveredVia) reward.deliveredVia = String(body.deliveredVia).slice(0, 20);
      if (note !== undefined) reward.note = String(note || '');
      delete reward.rejectedAt; delete reward.rejectReason;
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
    } else if (action === 'reject') {
      // Admin judged it not genuine. No notification — the admin follows up by
      // hand if there is anything to say.
      reward.status = 'rejected';
      reward.rejectedAt = new Date().toISOString();
      reward.rejectedBy = by;
      reward.rejectReason = String(body.reason || note || '').slice(0, 200);
      if (note !== undefined) reward.note = String(note || '');
      delete reward.sentAt; delete reward.sentBy;
      await saveReward(redis, reward);
    } else {
      reward.status = reward.contactEmail ? 'claimed' : 'pending';
      delete reward.sentAt;
      delete reward.sentBy;
      delete reward.rejectedAt; delete reward.rejectedBy; delete reward.rejectReason;
      if (note !== undefined) reward.note = String(note || '');
      await saveReward(redis, reward);
    }
    res.status(200).json({ success: true, reward: { ...reward, flags: flagsFor(reward) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
