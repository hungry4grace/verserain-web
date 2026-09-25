import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { pushNotify } from './_lib/rewards.js';
import { partyFetch } from './_lib/party.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';
import { normalizeCode, getVoucher, expireVoucher, markUsed, voidVoucher, restoreVoucher, listVouchers, publicVoucher, voucherStatus, clientIp, ipRateLimit, getPlaceRaw, settleReferralBonus } from './_lib/points.js';

// Voucher verification (店家核銷頁).
//   GET  ?code=ABCD-EFGH              public → public voucher view (never the email)
//   GET  ?all=1&adminEmail=           admin  → { vouchers }
//   POST { code, action: 'use' }      public → { success, voucher }   404 not_found / 409 already_used|expired|void
//   POST { adminEmail, code, action: 'void' | 'restore' }   admin
// The verify page is what the merchant opens at the counter, so 'use' needs no
// login — the 8-char code from the safe alphabet is the secret, and issuing is
// rate-limited per IP. Marking used never moves the customer's points (only
// expiry/void refund) — the one thing it pays out is the shop's referrer's
// 2.5% bonus (settleReferralBonus), best-effort: the redemption stands even
// when PartyKit or the push service is down.
const USE_ERROR_STATUS = { not_found: 404, already_used: 409, expired: 409, void: 409, invalid_state: 409 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ status: 'not_found', mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const now = new Date();

    if (req.method === 'GET') {
      const q = req.query || {};
      if (String(q.all || '') === '1') {
        const denied = requireAdmin(req, q.adminEmail);
        if (denied) return res.status(denied.status).json({ error: denied.error });
        const vouchers = (await listVouchers(redis, 200)).map(v => ({ ...v, computedStatus: voucherStatus(v, now) }));
        return res.status(200).json({ vouchers });
      }
      const ip = clientIp(req);
      if (!(await ipRateLimit(redis, `redeem:verify:ip:${ip}`, 30, 60))) return res.status(429).json({ error: 'rate_limited' });
      const code = normalizeCode(q.code);
      if (!code) return res.status(404).json({ status: 'not_found' });
      let v = await getVoucher(redis, code);
      if (!v) return res.status(404).json({ status: 'not_found' });
      if (v.status === 'issued' && voucherStatus(v, now) === 'expired') v = await expireVoucher(redis, v, now);
      return res.status(200).json(publicVoucher(v, now));
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const action = String(body.action || '');
    const code = normalizeCode(body.code);

    if (action === 'use') {
      const ip = clientIp(req);
      if (!(await ipRateLimit(redis, `redeem:verify:ip:${ip}`, 30, 60))) return res.status(429).json({ error: 'rate_limited' });
      if (!code) return res.status(404).json({ error: 'not_found' });
      let voucher;
      try {
        voucher = await markUsed(redis, code, { now, via: 'verify_page' });
      } catch (e) {
        const status = e && e.code ? USE_ERROR_STATUS[e.code] : undefined;
        if (!status) throw e;
        return res.status(status).json({ error: e.code, voucher: e.voucher ? publicVoucher(e.voucher, now) : undefined });
      }
      try {
        await pushNotify(redis, voucher.ownerCode, { kind: 'voucher_used', code: voucher.code, placeName: voucher.placeName, ntd: voucher.ntd });
      } catch { /* the inbox is best-effort; the redemption already happened */ }
      try {
        const place = await getPlaceRaw(redis, voucher.placeId);
        const settled = await settleReferralBonus(redis, { voucher, place, resolveEmail: codeOwnerEmail, now, direction: 'earn' });
        if (settled.paid) await notifyReferrer(redis, settled);
      } catch { /* the referrer's bonus is best-effort too */ }
      return res.status(200).json({ success: true, voucher: publicVoucher(voucher, now) });
    }

    if (action === 'void' || action === 'restore') {
      const denied = requireAdmin(req, body.adminEmail);
      if (denied) return res.status(denied.status).json({ error: denied.error });
      if (!code) return res.status(404).json({ error: 'not_found' });
      let voucher;
      try {
        voucher = action === 'void'
          ? await voidVoucher(redis, code, body.adminEmail, now)
          : await restoreVoucher(redis, code, body.adminEmail, now);
      } catch (e) {
        const status = e && e.code ? USE_ERROR_STATUS[e.code] : undefined;
        if (!status) throw e;
        return res.status(status).json({ error: e.code });
      }
      try {
        // Void takes the referrer's bonus back; restore of a used voucher pays
        // it again — both only ever touch the account snapshotted on the voucher.
        if (action === 'void' && voucher.usedAt) await settleReferralBonus(redis, { voucher, now, direction: 'reverse' });
        if (action === 'restore' && voucher.status === 'used') await settleReferralBonus(redis, { voucher, now, direction: 'earn' });
      } catch { /* best-effort */ }
      return res.status(200).json({ success: true, voucher });
    }

    return res.status(400).json({ error: 'action must be use|void|restore' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

async function codeOwnerEmail(code) {
  const owner = await partyFetch('/code-owner', { code });
  return (owner && owner.email) || null;
}

// Tell the referrer: 🔔 inbox entry + phone push, all fail-soft.
async function notifyReferrer(redis, { code, bonus, entry }) {
  const body = `${entry.placeName}：${entry.playerName} 使用 ${entry.points} 點，你也獲得 ${bonus} 點`;
  const tag = `verserain-refbonus-${entry.code}`;
  const url = 'https://www.verserain.com/?notify=1';
  await Promise.all([
    pushNotify(redis, code, { kind: 'merchant_referral', code: entry.code, placeName: entry.placeName, playerName: entry.playerName, points: entry.points, bonus }).catch(() => {}),
    sendReferralPush(code, { title: '🏪 獲得推薦獎勵點數', body, url, tag }).catch(() => {}),
    sendReferralApns(code, { title: '🏪 獲得推薦獎勵點數', body, url, collapseId: tag }).catch(() => {}),
  ]);
}
