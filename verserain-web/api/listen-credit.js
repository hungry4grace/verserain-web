import { Redis } from '@upstash/redis';
import { partyFetch } from './_lib/party.js';
import { clientIp, ipRateLimit } from './_lib/points.js';
import { recordListen, recordCheckin, LISTEN_DAILY_MAX } from './_lib/dailyPoints.js';

// 聆聽經文 (+100 per verse listened to the end) and, on the day's first verse,
// 每日登入 (streak bonus) — see api/_lib/dailyPoints.js.
//   POST { email, sessionKey, ref }   ref = canonical verse key, e.g. "43|3:16"
//   → { success, listen: { credited | duplicate | capped, count }, checkin: {…} | null, dailyMax }
// Identity comes from PartyKit (/session-check); an invalid session earns nothing.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  const ref = String(body.ref || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });
  if (!sessionKey) return res.status(401).json({ error: 'session_invalid' });
  if (!ref) return res.status(400).json({ error: 'ref_required' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true, listen: null, checkin: null, dailyMax: LISTEN_DAILY_MAX });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    if (!(await ipRateLimit(redis, `listen:ip:${clientIp(req)}`, 30, 60))) return res.status(429).json({ error: 'rate_limited' });

    let check;
    try { check = await partyFetch('/session-check', { email, sessionKey }); }
    catch { return res.status(503).json({ error: 'verify_unavailable' }); }
    if (!check || !check.valid) return res.status(401).json({ error: 'session_invalid' });

    const now = new Date();
    const listen = await recordListen(redis, { email, ref, now });
    if (listen.error) return res.status(400).json({ error: listen.error });
    const checkin = listen.credited ? await recordCheckin(redis, { email, now }) : null;
    res.status(200).json({ success: true, listen, checkin, dailyMax: LISTEN_DAILY_MAX });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
