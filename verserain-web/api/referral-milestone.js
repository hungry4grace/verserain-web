import { Redis } from '@upstash/redis';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';
import { recordQualifiedReferral } from './_lib/rewards.js';
import { partyFetch } from './_lib/party.js';

// A referee (B) reached a garden milestone (1 / 10 / every 100 trees planted):
//   • drop a notification into the inviter (A)'s personalCode-keyed inbox so A
//     can cheer B on;
//   • at B's FIRST tree, count B as a qualified referral of A for A's
//     dashboard — after confirming with the auth store that B's account really
//     is bound to A (a hand-crafted POST can't invent a referral).
// Money-backed rewards are NOT minted here any more: the client-reported
// `milestone` is trusted only for the cheer. Both the 100-verses and the
// 10-invites rewards come from /api/reward-check, which counts server-side.
// Idempotent per (refereeCode, milestone) so replays never double-notify.
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
    // personalCode is per-DEVICE (and swapped for the account's canonical code
    // on login), so the same person reporting from a second phone, or after
    // logging in, arrives with a different code — key on their email too, which
    // is stable across devices. Either latch already set → duplicate.
    const emailKey = String(refereeEmail || '').trim().toLowerCase();
    const latches = [refereeCode && `gamification:ms-sent:${refereeCode}`, emailKey && `gamification:ms-sent:email:${emailKey}`].filter(Boolean);
    if (latches.length) {
      const results = await Promise.all(latches.map((k) => redis.sadd(k, String(ms))));
      if (results.some((added) => !added)) return res.status(200).json({ success: true, duplicate: true });
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
      ? `${who} 種下了 ${ms} 棵樹，種滿了 ${ms / 100} 塊田地！給他一個讚 👍`
      : ms >= 10
        ? `${who} 已種下 10 棵樹（10 個經文）！給他一個讚 👍`
        : `${who} 種下了第一棵樹（第一個經文）！給他一個讚 👍`;
    const tag = `verserain-ms-${refereeCode || ''}-${ms}`;
    await Promise.all([
      sendReferralPush(inviterCode, { title: '🌱 VerseRain', body: bodyText, url: 'https://www.verserain.com/?notify=1', tag }).catch(() => {}),
      sendReferralApns(inviterCode, { title: '🌱 VerseRain', body: bodyText, url: 'https://www.verserain.com/?notify=1', collapseId: tag }).catch(() => {}),
    ]);

    // Dashboard count of qualified referrals. Only a logged-in referee whose
    // account the auth store says was invited by this inviter counts; guests
    // and mismatches are ignored (the cheer above still went out).
    const rewards = {};
    if (ms === 1 && emailKey) {
      let bound = false;
      try {
        const elig = await partyFetch('/reward-eligibility', { email: emailKey });
        bound = !!(elig && elig.identity && elig.identity.invitedBy === inviterCode);
      } catch { bound = false; }
      if (bound) rewards.qualifiedReferral = await recordQualifiedReferral(redis, { inviterCode, refereeCode, refereeEmail: emailKey });
      else rewards.qualifiedReferral = { count: 0, unbound: true };
    }

    res.status(200).json({ success: true, rewards });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
