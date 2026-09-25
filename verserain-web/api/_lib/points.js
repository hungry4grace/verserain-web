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
//   redeem:refbonus:${email}                       LIST   newest 200 merchant-referral bonus entries of this referrer
//   map:places                                     HASH   placeId → JSON place (owned by api/_lib/places.js)
//   charity:allow:${poolId}                        INT    a charity pool's discount allowance in NTD (see pools.js)
//   charity:mmonth:${poolId}:${placeId}:${month}   INT    NTD a pool has drawn at one shop this Taipei month
//   charity:open:${poolId}                         STR    code of the pool's one open voucher (TTL 30 min)
//
// Voucher lifecycle: issued → used | expired | void; void → (restore) used|issued.
// A voucher with kind 'pool' was issued from a charity pool's allowance
// (api/_lib/pools.js), not from a player's points: it charges and refunds the
// pool ledgers instead of the player ledgers, and its holder is the pool.

export const POINTS_PER_NTD = 1000;
export const VOUCHER_MAX_NTD = 200;
export const MONTHLY_MAX_NTD = 500;
export const VOUCHER_TTL_SEC = 1800;
export const MIN_PASSED_VERSES = 3;
export const MIN_ACCOUNT_DAYS = 7;
// Vouchers one person may open at the same shop per Taipei day. Each shop
// sets its own (0 = unlimited); the monthly NT$ cap still bounds the total.
export const DEFAULT_DAILY_PER_PERSON = 3;
export const MAX_DAILY_PER_PERSON = 20;
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
export const placeHistoryKey = (placeId) => `redeem:by-place:${placeId}`;
export const PLACE_HISTORY_MAX = 500;
export const poolAllowanceKey = (poolId) => `charity:allow:${poolId}`;
export const poolMerchantMonthKey = (poolId, placeId, month) => `charity:mmonth:${poolId}:${placeId}:${month}`;
export const poolOpenKey = (poolId) => `charity:open:${poolId}`;
export const POOL_MONTH_KEY_TTL_SEC = MONTH_KEY_TTL_SEC;
export const isPoolVoucher = (v) => !!v && v.kind === 'pool';
export const refundedKey = (code) => `redeem:refunded:${code}`;
// Account-keyed score ledger (總積分). The leaderboards stay keyed by
// playerName; these follow the email so a rename never splits a player's
// points. earned = Σ per-verse best; best = HASH verseRef → best score;
// daily = today's gains (Taipei day) for the garden greeting.
export const earnedKey = (email) => `points:earned:${normEmail(email)}`;
export const bestKey = (email) => `points:best:${normEmail(email)}`;
export const dailyEarnedKey = (email, day) => `points:daily:${normEmail(email)}:${day}`;
export const seededKey = (email) => `points:seeded:${normEmail(email)}`;
// Bonus points (e.g. the inviter's +5000 when a referee first clears a
// verse) are not in the name-keyed leaderboard, so the seed must add them.
export const bonusKey = (email) => `points:bonus:${normEmail(email)}`;
const DAILY_EARNED_TTL_SEC = 3 * 86400;

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

// A shop's per-person daily voucher count: an integer 0..MAX, else the default.
export function dailyPerPersonOf(place) {
  const n = Number(place && place.dailyPerPerson);
  return Number.isInteger(n) && n >= 0 && n <= MAX_DAILY_PER_PERSON ? n : DEFAULT_DAILY_PER_PERSON;
}

// Lifetime score. The leaderboard is keyed by playerName, so a renamed
// player only carries the score earned under the current name; the garden's
// activity log follows the account. Take the larger — plausiblePoints still
// caps both against the tree count.
export function lifetimePoints(leaderboardScore, garden) {
  return Math.max(0, toInt(leaderboardScore), toInt(garden && garden.activityPoints));
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
    kind: v.kind === 'pool' ? 'pool' : 'points',
    poolId: v.poolId || '',
    poolName: v.poolName || '',
    // A pool voucher is paid from the organisation's allowance, so the shop
    // sees which pool (and organisation) settles the remainder, not a name.
    holder: v.kind === 'pool' ? String(v.poolName || '') : maskName(v.playerName),
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
export async function bumpPlaceStats(redis, placeId, delta) {
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
export async function saveVoucher(redis, v) {
  await redis.hset(VOUCHERS_KEY, { [v.code]: JSON.stringify(v) });
  return v;
}
export async function listVouchers(redis, limit = 100) {
  const rows = (await redis.hgetall(VOUCHERS_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')))
    .slice(0, limit);
}

// Vouchers by index list (newest first). Empty codes / missing rows skipped.
async function vouchersByCodes(redis, codes, now) {
  const out = [];
  for (const c of codes || []) {
    const v = await getVoucher(redis, c);
    if (v) out.push({ ...v, computedStatus: voucherStatus(v, now) });
  }
  return out;
}
// A player's own history (full records — the caller owns them).
export async function listVouchersForEmail(redis, email, { limit = HISTORY_MAX, now } = {}) {
  const codes = (await redis.lrange(historyKey(email), 0, limit - 1)) || [];
  return vouchersByCodes(redis, codes, now);
}
// A merchant's ledger. Vouchers issued before the per-place index existed are
// found by a full scan, so the ledger is complete either way.
export async function listVouchersForPlace(redis, placeId, { limit = PLACE_HISTORY_MAX, now } = {}) {
  const codes = (await redis.lrange(placeHistoryKey(placeId), 0, limit - 1)) || [];
  if (codes.length) return vouchersByCodes(redis, codes, now);
  return (await listVouchers(redis, 1000)).filter((v) => v.placeId === placeId).map((v) => ({ ...v, computedStatus: voucherStatus(v, now) }));
}
// Pure: totals for a history list (uses computedStatus when present).
export function summarizeVouchers(list) {
  const sum = { issued: 0, open: 0, used: 0, usedNTD: 0, usedPoints: 0, expired: 0, void: 0 };
  for (const v of list || []) {
    if (!v) continue;
    sum.issued += 1;
    const st = v.computedStatus || v.status;
    if (st === 'used') { sum.used += 1; sum.usedNTD += toInt(v.ntd); sum.usedPoints += toInt(v.points); }
    else if (st === 'issued') sum.open += 1;
    else if (st === 'expired') sum.expired += 1;
    else if (st === 'void') sum.void += 1;
  }
  return sum;
}

// One-time migration into the account ledger: the larger of what the
// leaderboard holds under the current name and the garden's activity total,
// never less than whatever recordScore already added. Runs once per email.
export async function ensureEarnedSeeded(redis, { email, identity, garden, leaderboardScore } = {}) {
  const em = normEmail(email || (identity && identity.email));
  if (!em) return 0;
  const [flag, cur] = await Promise.all([redis.get(seededKey(em)), redis.get(earnedKey(em))]);
  if (flag) return Math.max(0, toInt(cur));
  const lb = leaderboardScore === undefined ? await readEarned(redis, identity) : leaderboardScore;
  const bonus = Math.max(0, toInt(await redis.get(bonusKey(em))));
  const seed = Math.max(toInt(cur), lifetimePoints(lb, garden) + bonus);
  await redis.set(earnedKey(em), String(seed));
  await redis.set(seededKey(em), new Date().toISOString());
  return seed;
}

// Credit a finished game to the account: only the improvement over the
// player's best on that verse counts (same rule as the leaderboard sum), so
// replaying a verse below your record adds nothing. Before the account has a
// best for the verse, the name-keyed per-verse leaderboard stands in so the
// first post-migration play is not counted twice.
// `fallbackBest` is the name-keyed best as it stood BEFORE this submission
// touched the leaderboard; the caller must capture it first, because once
// the leaderboard holds the new score, reading it back would make delta 0.
export async function recordScore(redis, { email, playerName, verseRef, score, now, fallbackBest } = {}) {
  const em = normEmail(email);
  const ref = String(verseRef || '').trim();
  const sc = Math.max(0, Math.floor(Number(score) || 0));
  if (!em || !ref || sc <= 0) return { delta: 0, earnedPoints: 0, todayPoints: 0, best: 0 };
  let prev = await redis.hget(bestKey(em), ref);
  if (prev === null || prev === undefined) {
    if (fallbackBest !== undefined) prev = fallbackBest;
    else {
      const lb = playerName ? await redis.zscore(`leaderboard:${ref}`, playerName) : null;
      prev = lb === null || lb === undefined ? 0 : lb;
    }
  }
  const prevBest = Math.max(0, toInt(prev));
  const delta = Math.max(0, sc - prevBest);
  const day = taipeiDay(toDate(now));
  if (delta > 0) {
    await redis.hset(bestKey(em), { [ref]: String(sc) });
    await redis.incrby(earnedKey(em), delta);
    await redis.incrby(dailyEarnedKey(em, day), delta);
    await redis.expire(dailyEarnedKey(em, day), DAILY_EARNED_TTL_SEC);
  }
  const [earnedRaw, todayRaw] = await Promise.all([redis.get(earnedKey(em)), redis.get(dailyEarnedKey(em, day))]);
  return { delta, earnedPoints: Math.max(0, toInt(earnedRaw)), todayPoints: Math.max(0, toInt(todayRaw)), best: Math.max(prevBest, sc) };
}

// Add a flat bonus to the account (referral rewards). Counted in today's
// score too, and remembered separately so a later seed does not drop it.
export async function creditBonus(redis, { email, points, now } = {}) {
  const em = normEmail(email);
  const pts = Math.max(0, Math.floor(Number(points) || 0));
  if (!em || pts <= 0) return { delta: 0, earnedPoints: 0 };
  const day = taipeiDay(toDate(now));
  const [earned] = await Promise.all([
    redis.incrby(earnedKey(em), pts),
    redis.incrby(bonusKey(em), pts),
    redis.incrby(dailyEarnedKey(em, day), pts),
  ]);
  await redis.expire(dailyEarnedKey(em, day), DAILY_EARNED_TTL_SEC);
  return { delta: pts, earnedPoints: Math.max(0, toInt(earned)) };
}

// ---------- merchant referral bonus (商家推薦獎勵) ----------
// The player who introduced a shop earns 2.5% of the points a customer spends
// there, paid when the voucher is marked used (a real transaction), clawed
// back on void and paid again on restore. The place's referrerCode is read at
// use time (admins may change it later); the account actually paid is
// snapshotted on the voucher (`referralBonus`) so void / restore always settle
// with that same account. Ledger per referrer: redeem:refbonus:<email>.
export const MERCHANT_REFERRAL_RATE = 0.025;
const REF_BONUS_MAX = 200;
export const refBonusKey = (email) => `redeem:refbonus:${normEmail(email)}`;
export function referralBonusFor(points) {
  return Math.floor(Math.max(0, toInt(points)) * MERCHANT_REFERRAL_RATE);
}

// Mirror of creditBonus for claw-backs. earned never drops below zero; the
// bonus / daily counters may (readers clamp them).
export async function debitBonus(redis, { email, points, now } = {}) {
  const em = normEmail(email);
  const pts = Math.max(0, Math.floor(Number(points) || 0));
  if (!em || pts <= 0) return { delta: 0, earnedPoints: 0 };
  const day = taipeiDay(toDate(now));
  const [earned] = await Promise.all([
    redis.decrby(earnedKey(em), pts),
    redis.decrby(bonusKey(em), pts),
    redis.decrby(dailyEarnedKey(em, day), pts),
  ]);
  if (toInt(earned) < 0) await redis.set(earnedKey(em), '0');
  return { delta: -pts, earnedPoints: Math.max(0, toInt(earned)) };
}

function refBonusEntry(v, snap, kind, at) {
  return {
    kind, code: v.code, placeId: v.placeId || '', placeName: String(v.placeName || '').slice(0, 80),
    playerName: maskName(v.playerName), points: toInt(v.points), bonus: toInt(snap.points), referrerCode: snap.code, at,
  };
}
async function pushRefBonus(redis, email, entry) {
  await redis.lpush(refBonusKey(email), JSON.stringify(entry));
  await redis.ltrim(refBonusKey(email), 0, REF_BONUS_MAX - 1);
}

// direction 'earn'    — after markUsed (needs `place` + `resolveEmail(code)`)
//                       or after restore (re-pays from the reversed snapshot).
// direction 'reverse' — after void; only when the snapshot says 'paid'.
// Idempotent through voucher.referralBonus.status; "nothing to do" never throws.
export async function settleReferralBonus(redis, { voucher: v, place, resolveEmail, now, direction = 'earn' } = {}) {
  if (!v || !v.code) return { paid: false, reversed: false, reason: 'no_voucher' };
  const snap = v.referralBonus || null;
  const at = toDate(now).toISOString();
  if (direction === 'reverse') {
    if (!snap || snap.status !== 'paid') return { reversed: false, reason: snap ? 'not_paid' : 'no_bonus' };
    await debitBonus(redis, { email: snap.email, points: snap.points, now });
    v.referralBonus = { ...snap, status: 'reversed', reversedAt: at };
    await saveVoucher(redis, v);
    const entry = refBonusEntry(v, snap, 'reversed', at);
    await pushRefBonus(redis, snap.email, entry);
    return { reversed: true, email: snap.email, code: snap.code, bonus: toInt(snap.points), entry };
  }
  if (snap && snap.status === 'paid') return { paid: false, reason: 'already_paid' };
  const code = snap ? String(snap.code || '') : String((place && place.referrerCode) || '').trim();
  if (!code) return { paid: false, reason: 'no_referrer' };
  let email = snap ? normEmail(snap.email) : '';
  if (!email) {
    if (typeof resolveEmail !== 'function') return { paid: false, reason: 'no_resolver' };
    email = normEmail(await resolveEmail(code));
    if (!email) return { paid: false, reason: 'referrer_unknown' };
  }
  const bonus = snap ? toInt(snap.points) : referralBonusFor(v.points);
  if (bonus < 1) return { paid: false, reason: 'too_small' };
  await creditBonus(redis, { email, points: bonus, now });
  v.referralBonus = { code, email, points: bonus, paidAt: at, status: 'paid' };
  await saveVoucher(redis, v);
  const entry = refBonusEntry(v, v.referralBonus, 'earned', at);
  await pushRefBonus(redis, email, entry);
  return { paid: true, email, code, bonus, entry };
}

// The referrer's ledger, newest first, plus the net total.
export async function listReferralBonus(redis, email, { limit = REF_BONUS_MAX } = {}) {
  const rows = (await redis.lrange(refBonusKey(email), 0, limit - 1)) || [];
  const items = rows.map(parse).filter(Boolean);
  const totalBonus = items.reduce((sum, it) => sum + (it.kind === 'reversed' ? -toInt(it.bonus) : toInt(it.bonus)), 0);
  return { items, totalBonus: Math.max(0, totalBonus) };
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
  const earned = await ensureEarnedSeeded(redis, { email: em, identity, garden: g, leaderboardScore: earnedPoints });
  const plausible = plausiblePoints(earned, g.treesPlanted);
  const todayRaw = await redis.get(dailyEarnedKey(em, taipeiDay(t)));
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
    todayPoints: Math.max(0, toInt(todayRaw)),
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
  // Per-person, per-shop, per-day counter: taken before the expensive part
  // so two concurrent calls cannot both squeeze under the shop's limit.
  const dKey = dayKey(em, place.id, day);
  const limit = dailyPerPersonOf(place);
  const count = await redis.incr(dKey);
  if (count === 1) await redis.expire(dKey, DAY_LOCK_TTL_SEC);
  if (limit > 0 && count > limit) {
    await releaseDaySlot(redis, dKey);
    throw new PointsError('daily_place_limit', { limit, used: count - 1 });
  }

  try {
    const earned = await ensureEarnedSeeded(redis, { email: em, identity, garden, leaderboardScore: earnedPoints });
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
    await redis.lpush(placeHistoryKey(place.id), code);
    await redis.ltrim(placeHistoryKey(place.id), 0, PLACE_HISTORY_MAX - 1);
    await bumpPlaceStats(redis, place.id, { issued: 1 });
    return { voucher };
  } catch (e) {
    // Nothing was issued: give the per-day slot back.
    if (e instanceof PointsError && (e.code === 'too_small' || e.code === 'open_voucher_exists')) await releaseDaySlot(redis, dKey);
    throw e;
  }
}

export async function uniqueCode(redis, rand) {
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
  if (isPoolVoucher(v)) {
    // Back to the pool, never to a person: the allowance and the shop's
    // monthly draw are the only ledgers a pool voucher touched.
    await redis.incrby(poolAllowanceKey(v.poolId), toInt(v.ntd));
    await redis.decrby(poolMerchantMonthKey(v.poolId, v.placeId, taipeiMonth(issued)), toInt(v.ntd));
    return true;
  }
  await redis.decrby(spentKey(v.email), toInt(v.points));
  await redis.decrby(monthKey(v.email, taipeiMonth(issued)), toInt(v.ntd));
  await releaseDaySlot(redis, dayKey(v.email, v.placeId, taipeiDay(issued)));
  await redis.decrby(placeDayKey(v.placeId, taipeiDay(issued)), toInt(v.ntd));
  return true;
}

// Give back one slot of the per-day counter; drop the key once it is empty
// so an unused day leaves nothing behind.
async function releaseDaySlot(redis, key) {
  const left = await redis.decrby(key, 1);
  if (toInt(left) <= 0) await redis.del(key);
}

export async function releaseOpen(redis, v) {
  const key = isPoolVoucher(v) ? poolOpenKey(v.poolId) : openKey(v.email);
  const cur = await redis.get(key);
  if (cur && String(cur) === v.code) await redis.del(key);
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
