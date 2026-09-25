import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { partyFetch } from './_lib/party.js';
import { pushNotify } from './_lib/rewards.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';
import { notifyAdmins, poolSubmittedMessage } from './_lib/adminNotify.js';
import { getPlace, listPlaces } from './_lib/places.js';
import { clientIp, ipRateLimit, readBalance, publicVoucher, maskName, LEADERBOARD_KEY, taipeiDay } from './_lib/points.js';
import {
  PoolError, listPools, getPool, savePool, openPoolsForPlace, MAX_OPEN_POOLS_PER_PLACE, normalizePoolSubmission, applyPoolAdminAction,
  applyMerchantJoin, applyMerchantLeave, contribute, issuePoolVoucher, poolCounters, poolMerchantMonthUsed,
  listContributionsForPool, listContributionsForEmail, listVouchersForPool, summarizePoolVouchers,
  publicPool, publicPools, ownerPoolView, publicContribution, countPoolCreatesToday, bumpPoolCreates, MAX_POOL_CREATES_PER_DAY,
} from './_lib/pools.js';

// Charity discount pools (愛心折抵池). See api/_lib/pools.js for what the
// design deliberately leaves out (no transfers, no refunds, no cash-out).
//   GET                                   public → { pools } (approved, public view; cached 60 s)
//   GET ?mine=1&email=&sessionKey=        → { owned, contributed, merchantOf }
//   GET ?all=1&adminEmail=                admin → { pools } (everything + counters)
//   POST { action:'create', email, sessionKey, pool:{ orgPlaceId, name, description, agree } }
//                                         owner of an approved church/org marker → pending pool
//   POST { action:'contribute', email, sessionKey, poolId, points }
//                                         → { success, contribution, pool, balance }
//   POST { action:'merchant_join'|'merchant_update', email, sessionKey, poolId, placeId, perOrderMaxNTD, monthlyMaxNTD, consent }
//   POST { action:'merchant_leave', email, sessionKey, poolId, placeId }
//   POST { action:'pool_redeem', email, sessionKey, poolId, placeId, billNTD }
//                                         pool owner → { success, voucher }
//   POST { action:'approve'|'reject'|'close', adminEmail, poolId }
//   POST { action:'create', adminEmail, pool:{ orgPlaceId, name, description } }   admin → approved at once
const ERROR_STATUS = {
  login_required: 400, session_invalid: 401, verify_unavailable: 503,
  not_eligible: 403, not_owner: 403,
  pool_unavailable: 404, not_found: 404, place_unavailable: 404, place_not_found: 404,
  contrib_invalid: 400, bill_invalid: 400, too_small: 400, caps_invalid: 400, consent_required: 400,
  org_place_invalid: 400, invalid_state: 400, insufficient_balance: 400, name_required: 400,
  merchant_not_in_pool: 409, pool_exists: 409, pool_limit: 409, open_voucher_exists: 409,
  daily_cap: 429, daily_limit: 429, rate_limited: 429,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ pools: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const now = new Date();

    if (req.method === 'GET') return get(req, res, redis, now);

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const action = String(body.action || '');
    try {
      if (action === 'contribute') return await contributeAction(req, res, redis, body, now);
      if (action === 'pool_redeem') return await poolRedeem(req, res, redis, body, now);
      if (action === 'merchant_join' || action === 'merchant_update' || action === 'merchant_leave') return await merchantAction(req, res, redis, body, action, now);
      if (action === 'create' && !body.adminEmail) return await createByOwner(req, res, redis, body, now);
      return await adminAction(req, res, redis, body, action, now);
    } catch (e) {
      if (e instanceof PoolError) {
        const status = ERROR_STATUS[e.code] || 400;
        const extra = {};
        if (e.reasons) extra.reasons = e.reasons;
        if (e.limit !== undefined) { extra.limit = e.limit; extra.used = e.used; }
        if (e.limitedBy) extra.limitedBy = e.limitedBy;
        if (e.balancePoints !== undefined) extra.balancePoints = e.balancePoints;
        if (e.voucher) extra.voucher = publicVoucher(e.voucher, now);
        return res.status(status).json({ error: e.code, ...extra });
      }
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function get(req, res, redis, now) {
  const q = req.query || {};
  if (q.all) {
    const denied = requireAdmin(req, q.adminEmail);
    if (denied) return res.status(denied.status).json({ error: denied.error });
    const pools = await listPools(redis);
    const out = [];
    for (const p of pools) out.push({ ...p, counters: await poolCounters(redis, p.id) });
    return res.status(200).json({ pools: out });
  }
  if (q.mine) {
    const login = await verifyLogin(res, { email: q.email, sessionKey: q.sessionKey });
    if (!login) return undefined;
    const { email } = login;
    const pools = await listPools(redis);
    const owned = [];
    for (const p of pools.filter((x) => x.ownerEmail === email)) {
      const counters = await poolCounters(redis, p.id);
      const vouchers = await listVouchersForPool(redis, p.id, { now, limit: 50 });
      const contributions = (await listContributionsForPool(redis, p.id, { limit: 50 })).map(publicContribution);
      const merchants = [];
      for (const m of Object.values(p.merchants || {})) merchants.push({ ...m, monthUsedNTD: await poolMerchantMonthUsed(redis, p.id, m.placeId, now) });
      owned.push({ ...ownerPoolView(p, counters, summarizePoolVouchers(vouchers)), merchants, contributions, vouchers: vouchers.map((v) => ({ ...publicVoucher(v, now), status: v.computedStatus })) });
    }
    const contributed = (await listContributionsForEmail(redis, email)).map((c) => ({ ...publicContribution(c), poolId: c.poolId, poolName: c.poolName }));
    const myPlaceIds = new Set((await listPlaces(redis)).filter((pl) => pl.ownerEmail === email && pl.kind === 'merchant').map((pl) => pl.id));
    const merchantOf = [];
    for (const p of pools) {
      for (const m of Object.values(p.merchants || {})) {
        if (!myPlaceIds.has(m.placeId)) continue;
        merchantOf.push({ poolId: p.id, poolName: p.name, poolStatus: p.status, orgPlaceName: p.orgPlaceName, placeId: m.placeId, perOrderMaxNTD: m.perOrderMaxNTD, monthlyMaxNTD: m.monthlyMaxNTD, joinedAt: m.joinedAt, monthUsedNTD: await poolMerchantMonthUsed(redis, p.id, m.placeId, now) });
      }
    }
    return res.status(200).json({ owned, contributed, merchantOf });
  }
  const pools = (await listPools(redis)).filter((p) => p.status === 'approved');
  const counters = {};
  const summaries = {};
  for (const p of pools) {
    counters[p.id] = await poolCounters(redis, p.id);
    summaries[p.id] = summarizePoolVouchers(await listVouchersForPool(redis, p.id, { now }));
  }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ pools: publicPools(pools, counters, summaries) });
}

// A player puts points into a pool. Identity, garden and the passed-verse
// count come from PartyKit; the client only names the pool and the amount.
async function contributeAction(req, res, redis, body, now) {
  const ip = clientIp(req);
  if (!(await ipRateLimit(redis, `charity:contrib:ip:${ip}`, 10, 60))) return res.status(429).json({ error: 'rate_limited' });
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity, garden } = login;
  const pool = await getPool(redis, String(body.poolId || '').trim());
  if (!pool) throw new PoolError('pool_unavailable');
  const earnedPoints = await readEarned(redis, identity);
  const { contribution, allowanceNTD } = await contribute(redis, { pool, email, identity, garden, points: Number(body.points), now, earnedPoints });
  try {
    if (pool.ownerCode) await pushNotify(redis, pool.ownerCode, { kind: 'pool_contribution', poolId: pool.id, poolName: pool.name, who: maskName(identity.playerName), points: contribution.points, ntd: contribution.ntd });
  } catch { /* inbox is best-effort */ }
  const counters = await poolCounters(redis, pool.id);
  const balance = await readBalance(redis, { email, identity, garden, now, earnedPoints });
  return res.status(200).json({ success: true, contribution: publicContribution(contribution), allowanceNTD, pool: publicPool(pool, counters), balance });
}

// The organisation draws a discount voucher from its pool at a shop.
async function poolRedeem(req, res, redis, body, now) {
  const ip = clientIp(req);
  if (!(await ipRateLimit(redis, `charity:redeem:ip:${ip}`, 10, 60))) return res.status(429).json({ error: 'rate_limited' });
  const owner = await verifyPoolOwner(res, redis, body);
  if (!owner) return undefined;
  const place = await getPlace(redis, String(body.placeId || '').trim());
  if (!place) throw new PoolError('place_unavailable');
  const { voucher } = await issuePoolVoucher(redis, { pool: owner.pool, place, ownerEmail: owner.email, identity: owner.identity, billNTD: Number(body.billNTD), now });
  return res.status(200).json({ success: true, voucher: publicVoucher(voucher, now), allowanceNTD: (await poolCounters(redis, owner.pool.id)).allowanceNTD });
}

async function merchantAction(req, res, redis, body, action, now) {
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const place = await getPlace(redis, String(body.placeId || '').trim());
  if (!place) return res.status(404).json({ error: 'place_not_found' });
  if (String(place.ownerEmail || '').toLowerCase() !== login.email) return res.status(403).json({ error: 'not_owner' });
  const pool = await getPool(redis, String(body.poolId || '').trim());
  if (!pool) throw new PoolError('pool_unavailable');
  const next = action === 'merchant_leave'
    ? applyMerchantLeave(pool, place.id, { now })
    : applyMerchantJoin(pool, place, { perOrderMaxNTD: body.perOrderMaxNTD, monthlyMaxNTD: body.monthlyMaxNTD, consent: body.consent === true, now });
  await savePool(redis, next);
  if (action !== 'merchant_leave' && pool.ownerCode) {
    try { await pushNotify(redis, pool.ownerCode, { kind: 'pool_merchant_joined', poolId: pool.id, poolName: pool.name, placeName: place.name, perOrderMaxNTD: next.merchants[place.id].perOrderMaxNTD, monthlyMaxNTD: next.merchants[place.id].monthlyMaxNTD }); } catch { /* best-effort */ }
  }
  return res.status(200).json({ success: true, pool: publicPool(next, await poolCounters(redis, next.id)), terms: next.merchants[place.id] || null });
}

async function createByOwner(req, res, redis, body, now) {
  const ip = clientIp(req);
  if (!(await ipRateLimit(redis, `charity:create:ip:${ip}`, 5, 60))) return res.status(429).json({ error: 'rate_limited' });
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;
  const input = body.pool || {};
  if (input.agree !== true) throw new PoolError('consent_required');
  const orgPlace = await getPlace(redis, String(input.orgPlaceId || '').trim());
  if (!orgPlace || String(orgPlace.ownerEmail || '').toLowerCase() !== email) throw new PoolError('org_place_invalid');
  if (openPoolsForPlace(await listPools(redis), orgPlace.id).length >= MAX_OPEN_POOLS_PER_PLACE) throw new PoolError('pool_limit', { limit: MAX_OPEN_POOLS_PER_PLACE });
  const day = taipeiDay(now);
  if ((await countPoolCreatesToday(redis, email, day)) >= MAX_POOL_CREATES_PER_DAY) return res.status(429).json({ error: 'daily_limit' });
  let pool;
  try {
    pool = normalizePoolSubmission(input, { orgPlace, ownerEmail: email, ownerCode: identity.personalCode || '', now });
  } catch (e) {
    throw new PoolError(e.message);
  }
  pool.status = 'pending';
  pool.agreedAt = now.toISOString();
  await savePool(redis, pool);
  await bumpPoolCreates(redis, email, day);
  try { await notifyAdmins(redis, poolSubmittedMessage(pool, identity.playerName || email)); } catch { /* best-effort */ }
  return res.status(200).json({ success: true, pool: ownerPoolView(pool) });
}

async function adminAction(req, res, redis, body, action, now) {
  const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
  const denied = requireAdmin(req, adminEmail);
  if (denied) return res.status(denied.status).json({ error: denied.error });
  let pool;
  if (action === 'create') {
    const input = body.pool || {};
    const orgPlace = await getPlace(redis, String(input.orgPlaceId || '').trim());
    if (!orgPlace) throw new PoolError('org_place_invalid');
    if (openPoolsForPlace(await listPools(redis), orgPlace.id).length >= MAX_OPEN_POOLS_PER_PLACE) throw new PoolError('pool_limit', { limit: MAX_OPEN_POOLS_PER_PLACE });
    try {
      pool = normalizePoolSubmission(input, { orgPlace, ownerEmail: orgPlace.ownerEmail || adminEmail, ownerCode: orgPlace.ownerCode || '', now });
    } catch (e) {
      throw new PoolError(e.message);
    }
    pool.status = 'approved';
    pool.approvedAt = now.toISOString();
    pool.approvedBy = adminEmail;
    await savePool(redis, pool);
  } else if (action === 'approve' || action === 'reject' || action === 'close') {
    pool = await getPool(redis, String(body.poolId || '').trim());
    if (!pool) throw new PoolError('not_found');
    pool = applyPoolAdminAction(pool, action, { adminEmail, now });
    if (body.note !== undefined) pool.note = String(body.note || '').slice(0, 200);
    await savePool(redis, pool);
    if ((action === 'approve' || action === 'reject') && pool.ownerCode) await notifyPoolOwner(redis, pool, action === 'approve' ? 'pool_approved' : 'pool_rejected');
  } else {
    return res.status(400).json({ error: 'action must be create|contribute|merchant_join|merchant_update|merchant_leave|pool_redeem|approve|reject|close' });
  }
  const pools = await listPools(redis);
  const out = [];
  for (const p of pools) out.push({ ...p, counters: await poolCounters(redis, p.id) });
  return res.status(200).json({ success: true, pool, pools: out });
}

// PartyKit vouches for the (email, sessionKey) pair and returns the garden
// figures the eligibility rules need. Sends the error itself and returns
// null when the caller must stop.
async function verifyLogin(res, body) {
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'login_required' }); return null; }
  if (!sessionKey) { res.status(400).json({ error: 'login_required' }); return null; }
  let elig;
  try {
    elig = await partyFetch('/reward-eligibility', { email, sessionKey, inviterCodes: [] });
  } catch {
    res.status(503).json({ error: 'verify_unavailable' });
    return null;
  }
  const identity = (elig && elig.identity) || {};
  if (identity.sessionValid !== true) { res.status(401).json({ error: 'session_invalid' }); return null; }
  return { email, identity, garden: (elig && elig.garden) || {} };
}

// Tell the organisation the outcome of its review: 🔔 inbox entry + phone
// push / APNs, all fail-soft (the admin action already stands).
async function notifyPoolOwner(redis, pool, kind) {
  const approved = kind === 'pool_approved';
  const title = approved ? '❤️ 愛心折抵池已通過審核' : '❤️ 愛心折抵池未通過審核';
  const body = approved ? `「${pool.name}」已上線，現在可以接受玩家投入了` : `「${pool.name}」未通過審核，請聯絡管理員了解原因`;
  const url = 'https://www.verserain.com/#charity';
  const tag = `verserain-pool-${pool.id}-${kind}`;
  await Promise.all([
    pushNotify(redis, pool.ownerCode, { kind, poolId: pool.id, name: pool.name }).catch(() => {}),
    sendReferralPush(pool.ownerCode, { title, body, url, tag }).catch(() => {}),
    sendReferralApns(pool.ownerCode, { title, body, url, collapseId: tag }).catch(() => {}),
  ]);
}

async function verifyPoolOwner(res, redis, body) {
  const login = await verifyLogin(res, body);
  if (!login) return null;
  const pool = await getPool(redis, String(body.poolId || '').trim());
  if (!pool) { res.status(404).json({ error: 'pool_unavailable' }); return null; }
  if (String(pool.ownerEmail || '').toLowerCase() !== login.email) { res.status(403).json({ error: 'not_owner' }); return null; }
  return { ...login, pool };
}

async function readEarned(redis, identity) {
  const name = String((identity && identity.playerName) || '').trim();
  if (!name) return 0;
  const s = await redis.zscore(LEADERBOARD_KEY, name);
  return Math.max(0, Math.trunc(Number(s) || 0));
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
