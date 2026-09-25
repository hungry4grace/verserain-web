// Charity discount pools (愛心折抵池) — a church or organisation on the map
// opens a pool; players "contribute" (投入) their own points, which BURNS the
// points from the player's spent ledger and grows the pool's discount
// allowance in NTD; the organisation then draws discount vouchers from that
// allowance at shops that joined the pool. What this module deliberately
// does NOT have, because the compliance memo forbids it:
//   - no person-to-person transfer, no per-person pool balance ("wallet");
//   - no refund or withdrawal of a contribution (only pool VOUCHERS refund,
//     and they refund the pool allowance, never a person);
//   - no cash-out: the allowance only ever becomes a merchant-verified
//     discount voucher (redeem:vouchers, kind 'pool'); the cash remainder is
//     paid by the organisation to the shop offline;
//   - no receipts of any kind.
// Every function takes the Upstash client first so it is testable with a stub.
//
// Redis keys:
//   charity:pools                                  HASH   poolId → JSON pool
//   charity:allow:${poolId}                        INT    NTD allowance available (points.js)
//   charity:stats:${poolId}                        HASH   contributedPoints, contributedNTD, contributions
//   charity:contributors:${poolId}                 SET    emails, only ever counted, never listed
//   charity:contrib:${poolId}                      LIST   newest 500 contributions (JSON)
//   charity:by-email:${email}                      LIST   newest 100 contributions of this player (JSON)
//   charity:day:${email}:${poolId}:${day}          INT    points contributed today (TTL 2 days)
//   charity:mmonth:${poolId}:${placeId}:${month}   INT    NTD drawn at one shop this Taipei month (points.js)
//   charity:open:${poolId}                         STR    the pool's one open voucher code (points.js)
//   charity:vouchers:${poolId}                     LIST   newest 500 voucher codes of this pool
//   charity:submit:${email}:${day}                 INT    pools created today (TTL 1 day)
import {
  POINTS_PER_NTD, VOUCHER_TTL_SEC, VOUCHERS_KEY, PLACE_HISTORY_MAX,
  normEmail, spentKey, placeHistoryKey, poolAllowanceKey, poolMerchantMonthKey, poolOpenKey, POOL_MONTH_KEY_TTL_SEC,
  taipeiDay, taipeiMonth, eligibility, ensureEarnedSeeded, plausiblePoints, maskName,
  getVoucher, saveVoucher, uniqueCode, expireVoucher, voucherStatus, bumpPlaceStats,
} from './points.js';

export const POOLS_KEY = 'charity:pools';
export const POOL_ID_RE = /^cp_[a-z0-9]{8,20}$/;
export const POOL_STATUSES = ['pending', 'approved', 'rejected', 'closed'];
export const ORG_KINDS = ['church', 'org'];
export const CONTRIB_STEP_POINTS = POINTS_PER_NTD;              // 1,000 points → NT$1 of allowance
export const CONTRIB_DAILY_MAX_POINTS = 100 * POINTS_PER_NTD;   // NT$100 per player per pool per Taipei day
export const MERCHANT_PER_ORDER_MAX_NTD = 2000;
export const MERCHANT_PER_ORDER_DEFAULT_NTD = 500;
export const MERCHANT_MONTHLY_MAX_NTD = 10000;                  // memo: NT$5,000–10,000 a month per shop
export const MERCHANT_MONTHLY_DEFAULT_NTD = 5000;
export const POOL_VOUCHER_TTL_SEC = VOUCHER_TTL_SEC;
export const MAX_POOL_CREATES_PER_DAY = 2;
export const CONSENT_VERSION = 'v1';

const CONTRIB_MAX = 500;
const BY_EMAIL_MAX = 100;
const POOL_VOUCHERS_MAX = 500;
const DAY_TTL_SEC = 2 * 86400;
const SUBMIT_TTL_SEC = 86400;

export const poolStatsKey = (poolId) => `charity:stats:${poolId}`;
export const poolContributorsKey = (poolId) => `charity:contributors:${poolId}`;
export const poolContribKey = (poolId) => `charity:contrib:${poolId}`;
export const contribByEmailKey = (email) => `charity:by-email:${normEmail(email)}`;
export const contribDayKey = (email, poolId, day) => `charity:day:${normEmail(email)}:${poolId}:${day}`;
export const poolVouchersKey = (poolId) => `charity:vouchers:${poolId}`;
export const poolSubmitKey = (email, day) => `charity:submit:${normEmail(email)}:${day}`;

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}
function toDate(now) {
  if (now instanceof Date) return now;
  if (typeof now === 'number' || typeof now === 'string') return new Date(now);
  return new Date();
}
function toInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export class PoolError extends Error {
  constructor(code, extra = {}) { super(code); this.code = code; Object.assign(this, extra); }
}

export function newPoolId(now, rand = Math.random) {
  const t = toDate(now).getTime().toString(36);
  const r = Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0');
  return `cp_${t}${r}`.slice(0, 23);
}

// ---------- pure: pool records ----------

// A pool belongs to an approved church / organisation marker on the map.
// Throws Error(code) like normalizePlaceSubmission so the route can 400 it.
export function normalizePoolSubmission(input, { orgPlace, ownerEmail, ownerCode, now, existing } = {}) {
  const src = input || {};
  const place = orgPlace || null;
  if (!place || !ORG_KINDS.includes(place.kind) || place.status !== 'approved') throw new Error('org_place_invalid');
  const t = toDate(now).toISOString();
  const name = clip(src.name, 60) || clip(place.name, 60);
  if (!name) throw new Error('name_required');
  const base = existing || {};
  return {
    id: base.id || newPoolId(now),
    name,
    description: clip(src.description, 300),
    orgPlaceId: place.id,
    orgPlaceName: clip(place.name, 60),
    ownerEmail: normEmail(base.ownerEmail || ownerEmail),
    ownerCode: String(base.ownerCode || ownerCode || ''),
    status: base.status || 'pending',
    merchants: base.merchants && typeof base.merchants === 'object' ? base.merchants : {},
    createdAt: base.createdAt || t,
    updatedAt: t,
    approvedAt: base.approvedAt || null,
    approvedBy: base.approvedBy || '',
    closedAt: base.closedAt || null,
    note: base.note || '',
  };
}

export function applyPoolAdminAction(pool, action, { adminEmail, now } = {}) {
  const p = { ...pool };
  const t = toDate(now).toISOString();
  if (action === 'approve') {
    if (!['pending', 'closed'].includes(p.status)) throw new PoolError('invalid_state');
    p.status = 'approved'; p.approvedAt = t; p.approvedBy = normEmail(adminEmail); p.closedAt = null;
  } else if (action === 'reject') {
    if (p.status !== 'pending') throw new PoolError('invalid_state');
    p.status = 'rejected';
  } else if (action === 'close') {
    if (p.status !== 'approved') throw new PoolError('invalid_state');
    p.status = 'closed'; p.closedAt = t;
  } else {
    throw new PoolError('invalid_state');
  }
  p.updatedAt = t;
  return p;
}

function capInt(v, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

// A shop joins (or updates its caps in) a pool. The shop decides how much
// discount it is willing to give per order and per month — the memo's
// safeguard against a pool draining a small business.
export function applyMerchantJoin(pool, place, { perOrderMaxNTD, monthlyMaxNTD, consent, now } = {}) {
  if (!pool || pool.status !== 'approved') throw new PoolError('pool_unavailable');
  if (!place || place.kind !== 'merchant' || place.status !== 'approved') throw new PoolError('place_unavailable');
  if (consent !== true) throw new PoolError('consent_required');
  const perOrder = capInt(perOrderMaxNTD, MERCHANT_PER_ORDER_MAX_NTD);
  const monthly = capInt(monthlyMaxNTD, MERCHANT_MONTHLY_MAX_NTD);
  if (perOrder === null || monthly === null) throw new PoolError('caps_invalid');
  const t = toDate(now).toISOString();
  const prev = (pool.merchants || {})[place.id];
  const merchants = { ...(pool.merchants || {}) };
  merchants[place.id] = {
    placeId: place.id,
    placeName: clip(place.name, 80),
    perOrderMaxNTD: perOrder,
    monthlyMaxNTD: monthly,
    joinedAt: prev ? prev.joinedAt : t,
    consentAt: t,
    consentVersion: CONSENT_VERSION,
  };
  return { ...pool, merchants, updatedAt: t };
}

export function applyMerchantLeave(pool, placeId, { now } = {}) {
  if (!pool || !pool.merchants || !pool.merchants[placeId]) throw new PoolError('merchant_not_in_pool');
  const merchants = { ...pool.merchants };
  delete merchants[placeId];
  return { ...pool, merchants, updatedAt: toDate(now).toISOString() };
}

// The discount a pool voucher can carry for one bill: the whole bill, capped
// by the shop's per-order limit, what is left of the shop's monthly limit,
// and the allowance the pool still holds. limitedBy names the cap that bound
// the result (precedence per_order → monthly → allowance); null when the bill
// itself was the smallest.
export function computePoolDiscount({ billNTD, perOrderMaxNTD, monthlyMaxNTD, monthlyUsedNTD = 0, allowanceNTD = 0 } = {}) {
  const bill = Math.max(0, toInt(billNTD));
  const caps = [
    ['per_order', Math.max(0, toInt(perOrderMaxNTD))],
    ['monthly', Math.max(0, toInt(monthlyMaxNTD) - Math.max(0, toInt(monthlyUsedNTD)))],
    ['allowance', Math.max(0, toInt(allowanceNTD))],
  ];
  let ntd = bill;
  for (const [, cap] of caps) ntd = Math.min(ntd, cap);
  ntd = Math.max(0, ntd);
  let limitedBy = null;
  if (ntd < bill) {
    const hit = caps.find(([, cap]) => cap === ntd);
    limitedBy = hit ? hit[0] : null;
  }
  return { ntd, limitedBy };
}

// ---------- storage ----------

export async function listPools(redis) {
  const rows = (await redis.hgetall(POOLS_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
export async function getPool(redis, id) {
  if (!id) return null;
  const raw = await redis.hget(POOLS_KEY, String(id));
  return raw ? parse(raw) : null;
}
export async function savePool(redis, pool) {
  await redis.hset(POOLS_KEY, { [pool.id]: JSON.stringify(pool) });
  return pool;
}
export function findPoolByOrgPlace(pools, placeId) {
  return (pools || []).find((p) => p && p.orgPlaceId === placeId && p.status !== 'rejected') || null;
}
export async function countPoolCreatesToday(redis, email, day) {
  return Math.max(0, toInt(await redis.get(poolSubmitKey(email, day))));
}
export async function bumpPoolCreates(redis, email, day) {
  const n = await redis.incr(poolSubmitKey(email, day));
  if (n === 1) await redis.expire(poolSubmitKey(email, day), SUBMIT_TTL_SEC);
  return n;
}

export async function poolCounters(redis, poolId) {
  const [allowRaw, stats, contributors] = await Promise.all([
    redis.get(poolAllowanceKey(poolId)),
    redis.hgetall(poolStatsKey(poolId)),
    redis.scard(poolContributorsKey(poolId)),
  ]);
  const s = stats || {};
  return {
    allowanceNTD: Math.max(0, toInt(allowRaw)),
    contributedPoints: Math.max(0, toInt(s.contributedPoints)),
    contributedNTD: Math.max(0, toInt(s.contributedNTD)),
    contributions: Math.max(0, toInt(s.contributions)),
    contributors: Math.max(0, toInt(contributors)),
  };
}
export async function poolMerchantMonthUsed(redis, poolId, placeId, now) {
  return Math.max(0, toInt(await redis.get(poolMerchantMonthKey(poolId, placeId, taipeiMonth(now)))));
}

// ---------- contributions (投入) ----------

// Burn the player's points, grow the pool's allowance. Irrevocable by design.
export async function contribute(redis, { pool, email, identity, garden, points, now, earnedPoints } = {}) {
  const em = normEmail(email || (identity && identity.email));
  const t = toDate(now);
  const { eligible, reasons } = eligibility(identity, garden);
  if (!eligible) throw new PoolError('not_eligible', { reasons });
  if (!pool || pool.status !== 'approved') throw new PoolError('pool_unavailable');
  const pts = Number(points);
  if (!Number.isInteger(pts) || pts < CONTRIB_STEP_POINTS || pts % CONTRIB_STEP_POINTS !== 0 || pts > CONTRIB_DAILY_MAX_POINTS) {
    throw new PoolError('contrib_invalid', { step: CONTRIB_STEP_POINTS, max: CONTRIB_DAILY_MAX_POINTS });
  }

  // Reserve today's slice first so two concurrent calls cannot both slip
  // under the daily cap (same pattern as issueVoucher's day lock).
  const dKey = contribDayKey(em, pool.id, taipeiDay(t));
  const after = await redis.incrby(dKey, pts);
  if (after === pts) await redis.expire(dKey, DAY_TTL_SEC);
  if (after > CONTRIB_DAILY_MAX_POINTS) {
    await redis.decrby(dKey, pts);
    throw new PoolError('daily_cap', { limit: CONTRIB_DAILY_MAX_POINTS, used: after - pts });
  }

  try {
    const earned = await ensureEarnedSeeded(redis, { email: em, identity, garden, leaderboardScore: earnedPoints });
    const plausible = plausiblePoints(earned, (garden || {}).treesPlanted);
    // An expired-but-unrefunded open voucher slightly overstates `spent`; that
    // errs on the safe side and corrects itself on the next readBalance.
    const balance = Math.max(0, plausible - Math.max(0, toInt(await redis.get(spentKey(em)))));
    if (balance < pts) throw new PoolError('insufficient_balance', { balancePoints: balance });

    const ntd = pts / POINTS_PER_NTD;
    await redis.incrby(spentKey(em), pts);
    const allowanceNTD = toInt(await redis.incrby(poolAllowanceKey(pool.id), ntd));
    await redis.hincrby(poolStatsKey(pool.id), 'contributedPoints', pts);
    await redis.hincrby(poolStatsKey(pool.id), 'contributedNTD', ntd);
    await redis.hincrby(poolStatsKey(pool.id), 'contributions', 1);
    await redis.sadd(poolContributorsKey(pool.id), em);
    const contribution = {
      id: `ct_${t.getTime().toString(36)}${Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0')}`,
      poolId: pool.id,
      poolName: clip(pool.name, 60),
      email: em,
      playerName: clip(identity && identity.playerName, 40),
      ownerCode: (identity && identity.personalCode) || '',
      points: pts,
      ntd,
      at: t.toISOString(),
    };
    const json = JSON.stringify(contribution);
    await redis.lpush(poolContribKey(pool.id), json);
    await redis.ltrim(poolContribKey(pool.id), 0, CONTRIB_MAX - 1);
    await redis.lpush(contribByEmailKey(em), json);
    await redis.ltrim(contribByEmailKey(em), 0, BY_EMAIL_MAX - 1);
    return { contribution, allowanceNTD };
  } catch (e) {
    if (e instanceof PoolError && e.code === 'insufficient_balance') await redis.decrby(dKey, pts);
    throw e;
  }
}

export async function listContributionsForPool(redis, poolId, { limit = CONTRIB_MAX } = {}) {
  return ((await redis.lrange(poolContribKey(poolId), 0, limit - 1)) || []).map(parse).filter(Boolean);
}
export async function listContributionsForEmail(redis, email, { limit = BY_EMAIL_MAX } = {}) {
  return ((await redis.lrange(contribByEmailKey(email), 0, limit - 1)) || []).map(parse).filter(Boolean);
}

// ---------- pool vouchers (機構向商家折抵) ----------

async function readOpenPoolVoucher(redis, poolId, now) {
  const code = await redis.get(poolOpenKey(poolId));
  if (!code) return null;
  const v = await getVoucher(redis, String(code));
  if (!v) { await redis.del(poolOpenKey(poolId)); return null; }
  if (v.status === 'issued' && voucherStatus(v, now) === 'expired') { await expireVoucher(redis, v, now); return null; }
  if (v.status !== 'issued') { await redis.del(poolOpenKey(poolId)); return null; }
  return v;
}

// The organisation draws a discount voucher from the pool at a shop that
// joined it. No player points are involved: the allowance is debited when
// the voucher is issued and comes back (points.js refundVoucher) if the
// voucher expires or is voided. `ownerEmail` is the organisation's login and
// is stored so the existing per-email history keeps working.
export async function issuePoolVoucher(redis, { pool, place, ownerEmail, identity, billNTD, now, rand } = {}) {
  const t = toDate(now);
  if (!pool || pool.status !== 'approved') throw new PoolError('pool_unavailable');
  if (!place || place.kind !== 'merchant' || place.status !== 'approved') throw new PoolError('place_unavailable');
  const terms = (pool.merchants || {})[place.id];
  if (!terms) throw new PoolError('merchant_not_in_pool');
  const bill = Number(billNTD);
  if (!Number.isInteger(bill) || bill < 1 || bill > 100000) throw new PoolError('bill_invalid');

  const existing = await readOpenPoolVoucher(redis, pool.id, t);
  if (existing) throw new PoolError('open_voucher_exists', { voucher: existing });

  const month = taipeiMonth(t);
  const [allowRaw, monthRaw] = await Promise.all([
    redis.get(poolAllowanceKey(pool.id)),
    redis.get(poolMerchantMonthKey(pool.id, place.id, month)),
  ]);
  const { ntd, limitedBy } = computePoolDiscount({
    billNTD: bill,
    perOrderMaxNTD: terms.perOrderMaxNTD,
    monthlyMaxNTD: terms.monthlyMaxNTD,
    monthlyUsedNTD: toInt(monthRaw),
    allowanceNTD: toInt(allowRaw),
  });
  if (ntd < 1) throw new PoolError('too_small', { limitedBy: limitedBy || 'allowance' });

  const code = await uniqueCode(redis, rand);
  const claimed = await redis.set(poolOpenKey(pool.id), code, { nx: true, ex: POOL_VOUCHER_TTL_SEC });
  if (claimed !== 'OK') {
    const other = await readOpenPoolVoucher(redis, pool.id, t);
    throw new PoolError('open_voucher_exists', { voucher: other });
  }

  await redis.decrby(poolAllowanceKey(pool.id), ntd);
  await redis.incrby(poolMerchantMonthKey(pool.id, place.id, month), ntd);
  await redis.expire(poolMerchantMonthKey(pool.id, place.id, month), POOL_MONTH_KEY_TTL_SEC);

  const issuedAt = t.toISOString();
  const voucher = {
    code,
    kind: 'pool',
    poolId: pool.id,
    poolName: clip(pool.name, 60),
    email: normEmail(ownerEmail || pool.ownerEmail),
    playerName: clip(identity && identity.playerName, 40),
    ownerCode: pool.ownerCode || '',
    placeId: place.id,
    placeName: clip(place.name, 80),
    discountPct: 0,
    billNTD: bill,
    ntd,
    points: 0,
    status: 'issued',
    issuedAt,
    expiresAt: new Date(t.getTime() + POOL_VOUCHER_TTL_SEC * 1000).toISOString(),
  };
  await saveVoucher(redis, voucher);
  await redis.lpush(placeHistoryKey(place.id), code);
  await redis.ltrim(placeHistoryKey(place.id), 0, PLACE_HISTORY_MAX - 1);
  await redis.lpush(poolVouchersKey(pool.id), code);
  await redis.ltrim(poolVouchersKey(pool.id), 0, POOL_VOUCHERS_MAX - 1);
  await bumpPlaceStats(redis, place.id, { issued: 1 });
  return { voucher };
}

export async function listVouchersForPool(redis, poolId, { limit = POOL_VOUCHERS_MAX, now } = {}) {
  const codes = (await redis.lrange(poolVouchersKey(poolId), 0, limit - 1)) || [];
  const out = [];
  for (const code of codes) {
    const v = await getVoucher(redis, code);
    if (v) out.push({ ...v, computedStatus: voucherStatus(v, now) });
  }
  return out;
}
export function summarizePoolVouchers(list) {
  const sum = { issued: 0, open: 0, used: 0, usedNTD: 0, expired: 0, void: 0 };
  for (const v of list || []) {
    if (!v) continue;
    sum.issued += 1;
    const st = v.computedStatus || v.status;
    if (st === 'used') { sum.used += 1; sum.usedNTD += toInt(v.ntd); } else if (st === 'issued') sum.open += 1;
    else if (st === 'expired') sum.expired += 1;
    else if (st === 'void') sum.void += 1;
  }
  return sum;
}

// ---------- views ----------

export function publicContribution(c) {
  if (!c) return null;
  return { id: c.id, at: c.at, points: toInt(c.points), ntd: toInt(c.ntd), who: maskName(c.playerName) };
}

// What anyone may see: no emails, no owner code, no monthly caps.
export function publicPool(pool, counters = {}, summary = {}) {
  if (!pool) return null;
  return {
    id: pool.id,
    name: pool.name,
    description: pool.description || '',
    orgPlaceId: pool.orgPlaceId,
    orgPlaceName: pool.orgPlaceName || '',
    status: pool.status,
    allowanceNTD: toInt(counters.allowanceNTD),
    contributedNTD: toInt(counters.contributedNTD),
    contributedPoints: toInt(counters.contributedPoints),
    contributions: toInt(counters.contributions),
    contributors: toInt(counters.contributors),
    usedNTD: toInt(summary.usedNTD),
    merchants: Object.values(pool.merchants || {}).map((m) => ({ placeId: m.placeId, placeName: m.placeName, perOrderMaxNTD: toInt(m.perOrderMaxNTD) })),
    createdAt: pool.createdAt,
    approvedAt: pool.approvedAt || null,
  };
}
export function publicPools(pools, countersById = {}, summariesById = {}) {
  return (pools || []).filter((p) => p && p.status === 'approved').map((p) => publicPool(p, countersById[p.id], summariesById[p.id]));
}
// The organisation's own view: everything but the admin note, with full caps.
export function ownerPoolView(pool, counters = {}, summary = {}) {
  if (!pool) return null;
  const { note, ...rest } = pool; // eslint-disable-line no-unused-vars
  return { ...publicPool(pool, counters, summary), ...rest, merchants: Object.values(pool.merchants || {}) };
}
