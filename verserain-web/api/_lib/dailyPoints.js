// Daily points (每日登入 + 聆聽經文) — two flat bonuses on the account ledger
// (總積分, api/_lib/points.js), credited through creditBonus so they count in
// earned, bonus and today's score alike. Spending stays limited by
// plausiblePoints and the voucher caps in points.js.
//
// 每日登入 (check-in): the first verse a player listens to or challenges on a
// Taipei day earns 1000, 1100 … 2000 on consecutive days, then starts again
// at 1000 (an 11-day cycle). Every 7th consecutive day earns a grace day
// (恩典日, at most 2 banked); missed days are covered by grace days first,
// and only when they run out does the streak restart at 1000.
//
// 聆聽經文 (listen): +100 per verse listened to the end, each verse once per
// Taipei day, at most 20 verses a day.
//
// Redis keys:
//   checkin:day:${email}:${day}     STR    latch: today's check-in was paid (TTL 3 days)
//   checkin:streak:${email}         HASH   { last: YYYY-MM-DD, n: streak, grace: banked grace days }
//   listen:day:${email}:${day}      SET    verse keys credited today (TTL 3 days)
import { creditBonus, taipeiDay, dailySourceKey } from './points.js';

export const CHECKIN_BASE = 1000;
export const CHECKIN_STEP = 100;
export const CHECKIN_CYCLE = 11; // 1000 … 2000
export const GRACE_EVERY = 7;
export const GRACE_MAX = 2;
export const LISTEN_POINTS = 100;
export const LISTEN_DAILY_MAX = 20;
const DAY_TTL_SEC = 3 * 86400;

const norm = (email) => String(email || '').trim().toLowerCase();
export const checkinDayKey = (email, day) => `checkin:day:${norm(email)}:${day}`;
export const checkinStreakKey = (email) => `checkin:streak:${norm(email)}`;
export const listenDayKey = (email, day) => `listen:day:${norm(email)}:${day}`;

const toInt = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };

export function checkinAmount(streak) {
  const n = Math.max(1, toInt(streak));
  return CHECKIN_BASE + CHECKIN_STEP * ((n - 1) % CHECKIN_CYCLE);
}

// Whole days from a to b (YYYY-MM-DD); NaN when either is not a date.
export function daysBetween(a, b) {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return NaN;
  return Math.round((tb - ta) / 86400000);
}

// Next streak state for a check-in on `day`, given the stored { last, n, grace }.
export function nextStreak(prev, day) {
  const last = prev && prev.last ? String(prev.last) : '';
  let n = Math.max(0, toInt(prev && prev.n));
  let grace = Math.min(GRACE_MAX, Math.max(0, toInt(prev && prev.grace)));
  const gap = last ? daysBetween(last, day) : NaN;
  let graceUsed = 0;
  if (gap === 1) {
    n += 1;
  } else if (gap > 1 && gap - 1 <= grace) {
    graceUsed = gap - 1;
    grace -= graceUsed;
    n += 1;
  } else {
    n = 1;
  }
  if (n % GRACE_EVERY === 0) grace = Math.min(GRACE_MAX, grace + 1);
  return { n, grace, graceUsed };
}

// Pay today's check-in once. Returns null when it was already paid today.
export async function recordCheckin(redis, { email, now } = {}) {
  const em = norm(email);
  if (!em) return null;
  const day = taipeiDay(now || new Date());
  const latch = await redis.set(checkinDayKey(em, day), '1', { nx: true, ex: DAY_TTL_SEC });
  if (latch !== 'OK') return null;
  const prev = (await redis.hgetall(checkinStreakKey(em))) || {};
  const { n, grace, graceUsed } = nextStreak(prev, day);
  await redis.hset(checkinStreakKey(em), { last: day, n: String(n), grace: String(grace) });
  const amount = checkinAmount(n);
  const r = await creditBonus(redis, { email: em, points: amount, now, source: 'checkin' });
  return { amount, streak: n, grace, graceUsed, earnedPoints: r.earnedPoints };
}

// Verse keys are canonical refs from the client (e.g. "66|13:8").
export function cleanListenRef(ref) {
  const s = String(ref || '').trim();
  if (!s || s.length > 40 || /[\s\u0000-\u001f]/.test(s)) return '';
  return s;
}

// +100 for a verse listened to the end, once per verse per day, 20 a day.
export async function recordListen(redis, { email, ref, now } = {}) {
  const em = norm(email);
  const key = cleanListenRef(ref);
  if (!em || !key) return { error: 'bad_request' };
  const day = taipeiDay(now || new Date());
  const setKey = listenDayKey(em, day);
  const added = await redis.sadd(setKey, key);
  await redis.expire(setKey, DAY_TTL_SEC);
  const count = toInt(await redis.scard(setKey));
  if (!toInt(added)) return { duplicate: true, count: Math.min(count, LISTEN_DAILY_MAX) };
  if (count > LISTEN_DAILY_MAX) {
    await redis.srem(setKey, key);
    return { capped: true, count: LISTEN_DAILY_MAX };
  }
  const r = await creditBonus(redis, { email: em, points: LISTEN_POINTS, now, source: 'listen' });
  return { credited: LISTEN_POINTS, count, earnedPoints: r.earnedPoints };
}

// 今日得分 breakdown for the garden's "?" panel: points per source today,
// the check-in state (paid today, or what the next one would pay) and
// today's listening count. `todayPoints` is the day's total; whatever the
// sources do not explain (gains from before the breakdown existed) is `other`.
export const DAILY_SOURCES = ['challenge', 'checkin', 'listen', 'referral', 'shopReferral'];
export async function readDailySummary(redis, { email, now, todayPoints } = {}) {
  const em = norm(email);
  const day = taipeiDay(now || new Date());
  const [src, prevRaw, listenCount, paid] = await Promise.all([
    redis.hgetall(dailySourceKey(em, day)),
    redis.hgetall(checkinStreakKey(em)),
    redis.scard(listenDayKey(em, day)),
    redis.get(checkinDayKey(em, day)),
  ]);
  const breakdown = {};
  let known = 0;
  for (const k of DAILY_SOURCES) { const v = toInt(src && src[k]); breakdown[k] = v; known += v; }
  breakdown.other = Math.max(0, toInt(todayPoints) - known);
  const prev = prevRaw || {};
  let checkin;
  if (paid) {
    const n = Math.max(1, toInt(prev.n));
    checkin = { done: true, streak: n, amount: checkinAmount(n), grace: Math.max(0, toInt(prev.grace)) };
  } else {
    const next = nextStreak(prev, day);
    checkin = { done: false, streak: next.n, amount: checkinAmount(next.n), graceUsed: next.graceUsed, grace: Math.max(0, toInt(prev.grace)) };
  }
  return {
    day,
    breakdown,
    checkin,
    listen: { count: Math.min(LISTEN_DAILY_MAX, toInt(listenCount)), max: LISTEN_DAILY_MAX, points: LISTEN_POINTS },
    graceEvery: GRACE_EVERY,
    graceMax: GRACE_MAX,
  };
}
