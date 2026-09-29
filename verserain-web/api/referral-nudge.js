import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { clientIp, ipRateLimit } from './_lib/points.js';
import { sendNudge, NUDGE_COOLDOWN_SEC } from './_lib/nudge.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';

// 🔔 提醒他 — nudge a friend who joined with my code but has not started.
//   POST { email, sessionKey, authors: [my names / codes], name: friend's name }
//   → { success, delivered, retryAt } | { error, retryAt? }
// See api/_lib/nudge.js for who may nudge whom and the rate limits.
const ERROR_STATUS = {
  bad_request: 400, session_invalid: 401, not_your_referee: 403,
  already_started: 409, too_soon: 429, daily_limit: 429,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const authors = (Array.isArray(body.authors) ? body.authors : String(body.authors || '').split(','))
    .map((s) => String(s || '').trim()).filter(Boolean).slice(0, 50);

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true, delivered: 0, retryAt: Date.now() + NUDGE_COOLDOWN_SEC * 1000 });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    if (!(await ipRateLimit(redis, `nudge:ip:${clientIp(req)}`, 20, 60))) return res.status(429).json({ error: 'rate_limited' });
    const out = await sendNudge(redis, {
      email: body.email, sessionKey: String(body.sessionKey || '').trim(), authors, name: body.name,
    }, {
      partyFetch,
      push: (code, msg) => Promise.all([
        sendReferralPush(code, msg).catch(() => {}),
        sendReferralApns(code, { ...msg, collapseId: msg.tag }).catch(() => {}),
      ]),
    });
    if (out.error) return res.status(ERROR_STATUS[out.error] || 400).json(out);
    res.status(200).json(out);
  } catch (error) {
    if (error instanceof PartyError) return res.status(503).json({ error: 'verify_unavailable' });
    res.status(500).json({ error: error.message });
  }
}
