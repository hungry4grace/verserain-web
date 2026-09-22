// Points redemption (積分折抵) — players spend their GAME TOTAL SCORE for a
// one-time merchant discount voucher: 1,000 points = NT$1.
//
// Leaderboards are never deducted. A separate "spent" ledger per email is
// subtracted from the earned total; balance = max(0, plausible − spent).
// Every function takes the Upstash client so the logic is testable with a stub.
//
// Redis keys:
//   redeem:vouchers                                HASH   code → JSON voucher
//   points:spent:${email}                          INT    points spent (net of refunds)
//   redeem:open:${email}                           STR    code of the player's one open voucher (TTL 30 min)
//   redeem:day:${email}:${placeId}:${day}          STR    one voucher per person per place per Taipei day
//   redeem:month:${email}:${month}                 INT    NTD redeemed this Taipei month
//   redeem:place:${placeId}:${day}                 INT    NTD the place gave away this Taipei day
//   redeem:by-email:${email}                       LIST   newest 100 voucher codes of this player
//   redeem:refunded:${code}                        STR    latch so a voucher is refunded at most once
//   map:places                                     HASH   placeId → JSON place (owned by api/_lib/places.js)
//
// Voucher lifecycle: issued → used | expired | void; void → (restore) used|issued.

export const POINTS_PER_NTD = 1000;
export const VOUCHER_MAX_NTD = 200;
export const MONTHLY_MAX_NTD = 500;
export const VOUCHER_TTL_SEC = 1800;
export const MIN_PASSED_VERSES = 3;
export const MIN_ACCOUNT_DAYS = 7;
export const PLACE_DAILY_MAX_NTD = 2000;
// Sanity ceiling: someone with N trees can plausibly have earned about
// N × 8000 points (+ slack). Anything above is treated as not-yet-plausible
// and simply can't be spent — it is not a fraud verdict, just a cap.
export const PLAUSIBLE_POINTS_PER_TREE = 8000;
export const PLAUSIBLE_SLACK = 20000;
// No 0/O/1/I/L so a code read aloud over a counter is unambiguous.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LEN = 8;

export const VOUCHERS_KEY = 'redeem:vouchers';
export const PLACES_KEY = 'map:places';
export const LEADERBOARD_KEY = 'leaderboard_sum:alltime';

const REFUND_LATCH_SEC = 90 * 86400;
const MONTH_KEY_TTL_SEC = 40 * 86400;
const PLACE_DAY_TTL_SEC = 2 * 86400;
const DAY_LOCK_TTL_SEC = 86400;
const HISTORY_MAX = 100;

export const normEmail = (email) => String(email || '').trim().toLowerCase();
export const spentKey = (email) => `points:spent:${normEmail(email)}`;
export const openKey = (email) => `redeem:open:${normEmail(email)}`;
export const dayKey = (email, placeId, day) => `redeem:day:${normEmail(email)}:${placeId}:${day}`;
export const monthKey = (email, month) => `redeem:month:${normEmail(email)}:${month}`;
export const placeDayKey = (placeId, day) => `redeem:place:${placeId}:${day}`;
export const historyKey = (email) => `redeem:by-email:${normEmail(email)}`;
export const refundedKey = (code) => `redeem:refunded:${code}`;

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}
function toDate(now) {
  if (now instanceof Date) return now;
  if (typeof now === 'number' || typeof now === 'string') return new Date(now);
  return new Date();
}
function toInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }

export class PointsError extends Error {
  constructor(code, extra = {}) { super(code); this.code = code; Object.assign(this, extra); }
}

// ---------- pure helpers ----------

// Asia/Taipei is a fixed UTC+8 (no DST), so a shifted ISO date is exact.
export function taipeiDay(now) {
  return new Date(toDate(now).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
export function taipeiMonth(now) { return taipeiDay(now).slice(0, 7); }

export function newVoucherCode(rand = Math.random) {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    const idx = Math.min(CODE_ALPHABET.length - 1, Math.max(0, Math.floor(rand() * CODE_ALPHABET.length)));
    out += CODE_ALPHABET[idx];
  }
  return out;
}

const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LEN}}$`);
export function normalizeCode(s) {
  const code = String(s || '').toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(code) ? code : null;
}
export function formatCode(code) {
  const c = String(code || '');
  return c.length === CODE_LEN ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function plausiblePoints(earned, treesPlanted) {
  const e = Math.max(0, toInt(earned));
  const t = Math.max(0, toInt(treesPlanted));
  return Math.max(0, Math.min(e, t * PLAUSIBLE_POINTS_PER_TREE + PLAUSIBLE_SLACK));
}

export function eligibility(identity, garden) {
  const id = identity || {};
  const g = garden || {};
  const reasons = [];
  if (!id.sessionValid) reasons.push('session_invalid');
  if (!normEmail(id.email) || id.emailKind === 'none') reasons.push('no_email');
  if (toInt(g.passedVerses) < MIN_PASSED_VERSES) reasons.push('not_enough_passed');
  if (toInt(id.accountAgeDays) < MIN_ACCOUNT_DAYS) reasons.push('account_too_new');
  return { eligible: reasons.length === 0, reasons };
}

// raw = floor(bill × pct / 100), then the tightest of four caps wins. limitedBy
// names the cap that actually bound the result; when several tie, precedence is
// voucher_cap → monthly → balance → place_daily.
export function computeDiscount({ billNTD, discountPct, balancePoints, monthlyUsedNTD = 0, placeDailyUsedNTD = 0, placeDailyCap } = {}) {
  const bill = Math.max(0, toInt(billNTD));
  const pct = Math.max(0, Math.min(100, Number(discountPct) || 0));
  const raw = Math.floor(bill * pct / 100);
  const placeCap = Number.isFinite(Number(placeDailyCap)) && Number(placeDailyCap) > 0 ? toInt(placeDailyCap) : PLACE_DAILY_MAX_NTD;
  const caps = [
    ['voucher_cap', VOUCHER_MAX_NTD],
    ['monthly', MONTHLY_MAX_NTD - Math.max(0, toInt(monthlyUsedNTD))],
    ['balance', Math.floor(Math.max(0, toInt(balancePoints)) / POINTS_PER_NTD)],
    ['place_daily', placeCap - Math.max(0, toInt(placeDailyUsedNTD))],
  ];
  let ntd = raw;
  for (const [, cap] of caps) ntd = Math.min(ntd, cap);
  ntd = Math.max(0, ntd);
  let limitedBy = null;
  if (ntd < raw) {
    const hit = caps.find(([, cap]) => Math.max(0, cap) === ntd);
    limitedBy = hit ? hit[0] : null;
  }
  return { ntd, points: ntd * POINTS_PER_NTD, limitedBy };
}

export function voucherStatus(v, now) {
  if (!v) return 'not_found';
  if (v.status === 'issued' && v.expiresAt && toDate(now).getTime() >= Date.parse(v.expiresAt)) return 'expired';
  return v.status;
}

export function maskName(name) {
  const s = String(name || '').trim();
  return s ? `${Array.from(s)[0]}＊＊` : '＊＊';
}

// What a merchant / verify page may see. Never the email.
export function publicVoucher(v, now) {
  if (!v) return null;
  const status = voucherStatus(v, now);
  const secondsLeft = status === 'issued' && v.expiresAt
    ? Math.max(0, Math.floor((Date.parse(v.expiresAt) - toDate(now).getTime()) / 1000))
    : 0;
  return {
    status,
    code: v.code,
    formatted: formatCode(v.code),
    placeName: v.placeName || '',
    placeId: v.placeId || '',
    discountPct: v.discountPct,
    ntd: v.ntd,
    points: v.points,
    billNTD: v.billNTD,
    issuedAt: v.issuedAt || null,
    expiresAt: v.expiresAt || null,
    usedAt: v.usedAt || null,
    secondsLeft,
    holder: maskName(v.playerName),
  };
}

// Client IP + a fixed-window per-IP limiter shared by the routes.
export function clientIp(req) {
  const h = (req && req.headers) || {};
  const fwd = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(h['x-real-ip'] || '').trim() || 'unknown';
}
export async function ipRateLimit(redis, key, limit, windowSec = 60) {
  const n = toInt(await redis.incr(key));
  if (n === 1) await redis.expire(key, windowSec);
  return n <= limit;
}

// ---------- place access (map:places is owned by api/_lib/places.js; we only
// touch the fields we need so the two modules stay independent) ----------

export async function getPlaceRaw(redis, id) {
  if (!id) return null;
  const raw = await redis.hget(PLACES_KEY, String(id));
  return raw ? parse(raw) : null;
}
export async function savePlaceRaw(redis, place) {
  await redis.hset(PLACES_KEY, { [place.id]: JSON.stringify(place) });
  return place;
}
async function bumpPlaceStats(redis, placeId, delta) {
  const place = await getPlaceRaw(redis, placeId);
  if (!place) return null;
  const stats = { issued: 0, used: 0, usedNTD: 0, ...(place.stats || {}) };
  for (const [k, d] of Object.entries(delta)) stats[k] = toInt(stats[k]) + d;
  place.stats = stats;
  return savePlaceRaw(redis, place);
}

// ---------- vouchers ----------

export async function getVoucher(redis, code) {
  const c = normalizeCode(code);
  if (!c) return null;
  const raw = await redis.hget(VOUCHERS_KEY, c);
  return raw ? parse(raw) : null;
}
async function saveVoucher(redis, v) {
  await redis.hset(VOUCHERS_KEY, { [v.code]: JSON.stringify(v) });
  return v;
}
export async function listVouchers(redis, limit = 100) {
  const rows = (await redis.hgetall(VOUCHERS_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')))
    .slice(0, limit);
}

async function readEarned(redis, identity) {
  const name = identity && identity.playerName;
  if (!name) return 0;
  const s = await redis.zscore(LEADERBOARD_KEY, name);
  return s === null || s === undefined ? 0 : Math.max(0, Math.floor(Number(s) || 0));
}

async function readOpenVoucher(redis, email, now) {
  const code = await redis.get(openKey(email));
  if (!code) return null;
  const v = await getVoucher(redis, String(code));
  if (!v) { await redis.del(openKey(email)); return null; }
  if (v.status === 'issued' && voucherStatus(v, now) === 'expired') { await expireVoucher(redis, v, now); return null; }
  if (v.status !== 'issued') { await redis.del(openKey(email)); return null; }
  return v;
}

export async function readBalance(redis, { email, identity, garden, now, earnedPoints } = {}) {
  const em = normEmail(email || (identity && identity.email));
  const g = garden || {};
  const t = toDate(now);
  const earned = earnedPoints === undefined ? await readEarned(redis, identity) : Math.max(0, toInt(earnedPoints));
  const plausible = plausiblePoints(earned, g.treesPlanted);
  // Lazy expiry first: an expired open voucher refunds its points, and the
  // ledgers below must reflect that.
  const open = await readOpenVoucher(redis, em, t);
  const [spentRaw, monthRaw] = await Promise.all([
    redis.get(spentKey(em)),
    redis.get(monthKey(em, taipeiMonth(t))),
  ]);
  const spentPoints = Math.max(0, toInt(spentRaw));
  const balancePoints = Math.max(0, plausible - spentPoints);
  const monthlyUsedNTD = Math.max(0, toInt(monthRaw));
  const { eligible, reasons } = eligibility(identity, garden);
  return {
    earnedPoints: earned,
    plausiblePoints: plausible,
    spentPoints,
    balancePoints,
    balanceNTD: Math.floor(balancePoints / POINTS_PER_NTD),
    monthlyUsedNTD,
    monthlyCapNTD: MONTHLY_MAX_NTD,
    voucherCapNTD: VOUCHER_MAX_NTD,
    pointsPerNTD: POINTS_PER_NTD,
    eligible,
    reasons,
    openVoucher: open ? publicVoucher(open, t) : null,
  };
}

export async function issueVoucher(redis, { email, identity, garden, place, billNTD, now, earnedPoints, rand } = {}) {
  const em = normEmail(email || (identity && identity.email));
  const t = toDate(now);
  const { eligible, reasons } = eligibility(identity, garden);
  if (!eligible) throw new PointsError('not_eligible', { reasons });
  if (!place || place.status !== 'approved' || place.kind !== 'merchant') throw new PointsError('place_unavailable');
  const bill = Number(billNTD);
  if (!Number.isInteger(bill) || bill < 1 || bill > 100000) throw new PointsError('bill_invalid');

  const existing = await readOpenVoucher(redis, em, t);
  if (existing) throw new PointsError('open_voucher_exists', { voucher: existing });

  const day = taipeiDay(t);
  const month = taipeiMonth(t);
  const dKey = dayKey(em, place.id, day);
  const locked = await redis.set(dKey, '1', { nx: true, ex: DAY_LOCK_TTL_SEC });
  if (locked !== 'OK') throw new PointsError('daily_place_limit');

  try {
    const earned = earnedPoints === undefined ? await readEarned(redis, identity) : Math.max(0, toInt(earnedPoints));
    const plausible = plausiblePoints(earned, (garden || {}).treesPlanted);
    const [spentRaw, monthRaw, placeDayRaw] = await Promise.all([
      redis.get(spentKey(em)),
      redis.get(monthKey(em, month)),
      redis.get(placeDayKey(place.id, day)),
    ]);
    const balancePoints = Math.max(0, plausible - Math.max(0, toInt(spentRaw)));
    const { ntd, points } = computeDiscount({
      billNTD: bill,
      discountPct: place.discountPct,
      balancePoints,
      monthlyUsedNTD: toInt(monthRaw),
      placeDailyUsedNTD: toInt(placeDayRaw),
      placeDailyCap: place.dailyCapNTD,
    });
    if (ntd < 1) throw new PointsError('too_small');

    const code = await uniqueCode(redis, rand);
    const claimed = await redis.set(openKey(em), code, { nx: true, ex: VOUCHER_TTL_SEC });
    if (claimed !== 'OK') {
      const other = await readOpenVoucher(redis, em, t);
      throw new PointsError('open_voucher_exists', { voucher: other });
    }

    const issuedAt = t.toISOString();
    const expiresAt = new Date(t.getTime() + VOUCHER_TTL_SEC * 1000).toISOString();
    await redis.incrby(spentKey(em), points);
    await redis.incrby(monthKey(em, month), ntd);
    await redis.expire(monthKey(em, month), MONTH_KEY_TTL_SEC);
    await redis.incrby(placeDayKey(place.id, day), ntd);
    await redis.expire(placeDayKey(place.id, day), PLACE_DAY_TTL_SEC);

    const voucher = {
      code,
      email: em,
      playerName: String((identity && identity.playerName) || '').slice(0, 40),
      ownerCode: (identity && identity.personalCode) || '',
      placeId: place.id,
      placeName: String(place.name || '').slice(0, 80),
      discountPct: Number(place.discountPct) || 0,
      billNTD: bill,
      ntd,
      points,
      status: 'issued',
      issuedAt,
      expiresAt,
    };
    await saveVoucher(redis, voucher);
    await redis.lpush(historyKey(em), code);
    await redis.ltrim(historyKey(em), 0, HISTORY_MAX - 1);
    await bumpPlaceStats(redis, place.id, { issued: 1 });
    return { voucher };
  } catch (e) {
    // Nothing was issued: give the per-day slot back.
    if (e instanceof PointsError && (e.code === 'too_small' || e.code === 'open_voucher_exists')) await redis.del(dKey);
    throw e;
  }
}

async function uniqueCode(redis, rand) {
  for (let i = 0; i < 5; i++) {
    const code = newVoucherCode(rand);
    if (!(await redis.hget(VOUCHERS_KEY, code))) return code;
  }
  return newVoucherCode();
}

// Give the player back everything a voucher charged. Latched per code so a
// second call (or an expire racing a void) refunds nothing extra.
async function refundVoucher(redis, v) {
  const latched = await redis.set(refundedKey(v.code), '1', { nx: true, ex: REFUND_LATCH_SEC });
  if (latched !== 'OK') return false;
  const issued = v.issuedAt ? new Date(v.issuedAt) : new Date();
  await redis.decrby(spentKey(v.email), toInt(v.points));
  await redis.decrby(monthKey(v.email, taipeiMonth(issued)), toInt(v.ntd));
  await redis.del(dayKey(v.email, v.placeId, taipeiDay(issued)));
  await redis.decrby(placeDayKey(v.placeId, taipeiDay(issued)), toInt(v.ntd));
  return true;
}

async function releaseOpen(redis, v) {
  const cur = await redis.get(openKey(v.email));
  if (cur && String(cur) === v.code) await redis.del(openKey(v.email));
}

// Lazy expiry: an issued voucher past expiresAt is refunded and marked expired.
export async function expireVoucher(redis, v, now) {
  if (!v || v.status !== 'issued') return v;
  const refunded = await refundVoucher(redis, v);
  v.status = 'expired';
  v.expiredAt = toDate(now).toISOString();
  if (refunded) v.refundedAt = v.expiredAt;
  await saveVoucher(redis, v);
  await releaseOpen(redis, v);
  return v;
}

export async function markUsed(redis, code, { now, via = 'verify_page' } = {}) {
  const v = await getVoucher(redis, code);
  if (!v) throw new PointsError('not_found');
  if (v.status === 'used') throw new PointsError('already_used', { voucher: v });
  if (v.status === 'void') throw new PointsError('void', { voucher: v });
  if (v.status === 'expired') throw new PointsError('expired', { voucher: v });
  if (voucherStatus(v, now) === 'expired') {
    await expireVoucher(redis, v, now);
    throw new PointsError('expired', { voucher: v });
  }
  v.status = 'used';
  v.usedAt = toDate(now).toISOString();
  v.usedVia = via;
  await saveVoucher(redis, v);
  await releaseOpen(redis, v);
  await bumpPlaceStats(redis, v.placeId, { used: 1, usedNTD: toInt(v.ntd) });
  return v;
}

// Admin: cancel an issued or used voucher and refund the player (once).
export async function voidVoucher(redis, code, adminEmail, now) {
  const v = await getVoucher(redis, code);
  if (!v) throw new PointsError('not_found');
  if (v.status !== 'issued' && v.status !== 'used') throw new PointsError('invalid_state', { voucher: v });
  const refunded = await refundVoucher(redis, v);
  const t = toDate(now).toISOString();
  if (v.status === 'used') await bumpPlaceStats(redis, v.placeId, { used: -1, usedNTD: -toInt(v.ntd) });
  v.status = 'void';
  v.voidedAt = t;
  v.voidedBy = normEmail(adminEmail);
  if (refunded) v.refundedAt = t;
  await saveVoucher(redis, v);
  await releaseOpen(redis, v);
  return v;
}

// Admin: undo a void. Goes back to 'used' if it had been used, else 'issued'.
// The refund that the void gave the player is NOT re-charged and the open
// slot / day lock are not re-taken — restore only corrects the record; if the
// points should be charged again the admin issues a fresh voucher.
export async function restoreVoucher(redis, code, adminEmail, now) {
  const v = await getVoucher(redis, code);
  if (!v) throw new PointsError('not_found');
  if (v.status !== 'void') throw new PointsError('invalid_state', { voucher: v });
  v.status = v.usedAt ? 'used' : 'issued';
  v.restoredAt = toDate(now).toISOString();
  v.restoredBy = normEmail(adminEmail);
  delete v.voidedAt;
  delete v.voidedBy;
  await saveVoucher(redis, v);
  if (v.status === 'used') await bumpPlaceStats(redis, v.placeId, { used: 1, usedNTD: toInt(v.ntd) });
  return v;
}
