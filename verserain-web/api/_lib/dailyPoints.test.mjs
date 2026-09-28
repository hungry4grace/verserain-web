// node --test api/_lib/*.test.mjs
// 每日登入 (streak + 恩典日) and 聆聽經文 (+100, once per verse per day, 20 a day)
// against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkinAmount, daysBetween, nextStreak, recordCheckin, recordListen, cleanListenRef, readDailySummary,
  LISTEN_DAILY_MAX, checkinStreakKey,
} from './dailyPoints.js';
import { earnedKey, dailyEarnedKey, dailySourceKey, recordScore, creditBonus, debitBonus } from './points.js';

function stubRedis() {
  const strings = new Map();
  const hashes = new Map();
  const sets = new Map();
  const num = (k) => Number(strings.get(k) || 0);
  return {
    strings, hashes, sets,
    async get(k) { return strings.has(k) ? strings.get(k) : null; },
    async set(k, v, opts = {}) {
      if (opts.nx && strings.has(k)) return null;
      strings.set(k, String(v)); return 'OK';
    },
    async incrby(k, n) { const v = num(k) + Number(n); strings.set(k, String(v)); return v; },
    async decrby(k, n) { const v = num(k) - Number(n); strings.set(k, String(v)); return v; },
    async expire() { return 1; },
    async hgetall(k) { return hashes.has(k) ? Object.fromEntries(hashes.get(k)) : null; },
    async hincrby(k, f, d) { if (!hashes.has(k)) hashes.set(k, new Map()); const m = hashes.get(k); const n = Number(m.get(f) || 0) + Number(d); m.set(f, String(n)); return n; },
    async hget(k, f) { return hashes.has(k) ? (hashes.get(k).get(f) ?? null) : null; },
    async zscore() { return null; },
    async hset(k, obj) { if (!hashes.has(k)) hashes.set(k, new Map()); for (const [f, v] of Object.entries(obj)) hashes.get(k).set(f, v); return 1; },
    async sadd(k, m) { if (!sets.has(k)) sets.set(k, new Set()); const s = sets.get(k); if (s.has(m)) return 0; s.add(m); return 1; },
    async scard(k) { return sets.has(k) ? sets.get(k).size : 0; },
    async srem(k, m) { return sets.has(k) && sets.get(k).delete(m) ? 1 : 0; },
  };
}

// Noon Taipei (04:00 UTC) on the given Taipei date.
const at = (day) => new Date(`${day}T04:00:00Z`);
const EMAIL = 'Player@Example.com';

test('check-in amounts climb 1000 → 2000 then restart at 1000', () => {
  assert.equal(checkinAmount(1), 1000);
  assert.equal(checkinAmount(2), 1100);
  assert.equal(checkinAmount(11), 2000);
  assert.equal(checkinAmount(12), 1000);
  assert.equal(checkinAmount(22), 2000);
  assert.equal(checkinAmount(0), 1000);
});

test('daysBetween handles month and year boundaries', () => {
  assert.equal(daysBetween('2026-09-30', '2026-10-01'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2); // leap year
  assert.ok(Number.isNaN(daysBetween('', '2026-01-01')));
});

test('nextStreak: first day, consecutive, grace and reset', () => {
  assert.deepEqual(nextStreak({}, '2026-09-01'), { n: 1, grace: 0, graceUsed: 0 });
  assert.deepEqual(nextStreak({ last: '2026-09-01', n: 1, grace: 0 }, '2026-09-02'), { n: 2, grace: 0, graceUsed: 0 });
  // 7th consecutive day earns a grace day
  assert.deepEqual(nextStreak({ last: '2026-09-06', n: 6, grace: 0 }, '2026-09-07'), { n: 7, grace: 1, graceUsed: 0 });
  // grace is capped at 2
  assert.deepEqual(nextStreak({ last: '2026-09-20', n: 20, grace: 2 }, '2026-09-21'), { n: 21, grace: 2, graceUsed: 0 });
  // one missed day covered by grace
  assert.deepEqual(nextStreak({ last: '2026-09-07', n: 7, grace: 1 }, '2026-09-09'), { n: 8, grace: 0, graceUsed: 1 });
  // missed more days than grace → restart, grace kept
  assert.deepEqual(nextStreak({ last: '2026-09-07', n: 7, grace: 1 }, '2026-09-10'), { n: 1, grace: 1, graceUsed: 0 });
  // no grace → restart
  assert.deepEqual(nextStreak({ last: '2026-09-01', n: 3, grace: 0 }, '2026-09-03'), { n: 1, grace: 0, graceUsed: 0 });
  // same day again (defensive; the latch normally blocks this) → restart rather than grow
  assert.equal(nextStreak({ last: '2026-09-03', n: 3, grace: 0 }, '2026-09-03').n, 1);
});

test('recordCheckin pays once a day and follows the streak', async () => {
  const r = stubRedis();
  const d1 = await recordCheckin(r, { email: EMAIL, now: at('2026-09-01') });
  assert.equal(d1.amount, 1000); assert.equal(d1.streak, 1);
  assert.equal(await recordCheckin(r, { email: EMAIL, now: at('2026-09-01') }), null, 'second time the same day');
  const d2 = await recordCheckin(r, { email: EMAIL, now: at('2026-09-02') });
  assert.equal(d2.amount, 1100); assert.equal(d2.streak, 2);
  assert.equal(await r.get(earnedKey('player@example.com')), '2100');
  assert.equal(await r.get(dailyEarnedKey('player@example.com', '2026-09-02')), '1100');
  // a missed day without grace restarts at 1000
  const d4 = await recordCheckin(r, { email: EMAIL, now: at('2026-09-04') });
  assert.equal(d4.amount, 1000); assert.equal(d4.streak, 1);
});

test('recordCheckin uses a grace day earned after 7 days', async () => {
  const r = stubRedis();
  for (let d = 1; d <= 7; d++) await recordCheckin(r, { email: EMAIL, now: at(`2026-09-0${d}`) });
  assert.equal((await r.hgetall(checkinStreakKey(EMAIL))).grace, '1');
  const back = await recordCheckin(r, { email: EMAIL, now: at('2026-09-09') }); // 09-08 missed
  assert.equal(back.streak, 8);
  assert.equal(back.amount, 1700);
  assert.equal(back.graceUsed, 1);
  assert.equal(back.grace, 0);
});

test('recordCheckin uses the Taipei day (UTC+8)', async () => {
  const r = stubRedis();
  // 2026-09-01 20:00 UTC is already 09-02 in Taipei
  await recordCheckin(r, { email: EMAIL, now: new Date('2026-09-01T20:00:00Z') });
  assert.equal((await r.hgetall(checkinStreakKey(EMAIL))).last, '2026-09-02');
});

test('recordListen: +100 per verse, once per verse per day, 20 a day', async () => {
  const r = stubRedis();
  const now = at('2026-09-01');
  const first = await recordListen(r, { email: EMAIL, ref: '43|3:16', now });
  assert.equal(first.credited, 100); assert.equal(first.count, 1);
  const dup = await recordListen(r, { email: EMAIL, ref: '43|3:16', now });
  assert.equal(dup.duplicate, true);
  for (let i = 2; i <= LISTEN_DAILY_MAX; i++) {
    const x = await recordListen(r, { email: EMAIL, ref: `19|23:${i}`, now });
    assert.equal(x.credited, 100);
  }
  const over = await recordListen(r, { email: EMAIL, ref: '1|1:1', now });
  assert.equal(over.capped, true);
  assert.equal(await r.get(earnedKey(EMAIL.toLowerCase())), String(100 * LISTEN_DAILY_MAX));
  // a new day starts a fresh count
  const next = await recordListen(r, { email: EMAIL, ref: '1|1:1', now: at('2026-09-02') });
  assert.equal(next.credited, 100);
});

test('recordListen rejects bad refs', async () => {
  const r = stubRedis();
  assert.equal(cleanListenRef(''), '');
  assert.equal(cleanListenRef('a b'), '');
  assert.equal(cleanListenRef('x'.repeat(41)), '');
  assert.deepEqual(await recordListen(r, { email: EMAIL, ref: '' }), { error: 'bad_request' });
  assert.deepEqual(await recordListen(r, { email: '', ref: '1|1:1' }), { error: 'bad_request' });
});

test('today\'s points are recorded by source', async () => {
  const r = stubRedis();
  const now = at('2026-09-01');
  const em = 'player@example.com';
  await recordScore(r, { email: EMAIL, playerName: 'P', verseRef: '43|3:16', score: 800, now, fallbackBest: 0 });
  await recordCheckin(r, { email: EMAIL, now });
  await recordListen(r, { email: EMAIL, ref: '43|3:16', now });
  await recordListen(r, { email: EMAIL, ref: '19|23:1', now });
  await creditBonus(r, { email: EMAIL, points: 5000, now, source: 'referral' });
  await creditBonus(r, { email: EMAIL, points: 25, now, source: 'shopReferral' });
  await debitBonus(r, { email: EMAIL, points: 10, now, source: 'shopReferral' });
  const src = await r.hgetall(dailySourceKey(em, '2026-09-01'));
  assert.deepEqual(src, { challenge: '800', checkin: '1000', listen: '200', referral: '5000', shopReferral: '15' });
  assert.equal(await r.get(dailyEarnedKey(em, '2026-09-01')), '7015');
});

test('readDailySummary: breakdown, check-in preview and listening count', async () => {
  const r = stubRedis();
  const em = 'player@example.com';
  // yesterday checked in (streak 3), nothing yet today
  await r.hset(checkinStreakKey(em), { last: '2026-09-01', n: '3', grace: '0' });
  // 300 points from before the breakdown existed
  await r.set(dailyEarnedKey(em, '2026-09-02'), '300');
  let s = await readDailySummary(r, { email: EMAIL, now: at('2026-09-02'), todayPoints: 300 });
  assert.equal(s.checkin.done, false);
  assert.equal(s.checkin.streak, 4);
  assert.equal(s.checkin.amount, 1300);
  assert.equal(s.breakdown.other, 300);
  assert.equal(s.listen.count, 0);
  // listen once: pays the listen and the check-in
  await recordListen(r, { email: EMAIL, ref: '1|1:1', now: at('2026-09-02') });
  await recordCheckin(r, { email: EMAIL, now: at('2026-09-02') });
  s = await readDailySummary(r, { email: EMAIL, now: at('2026-09-02'), todayPoints: 300 + 100 + 1300 });
  assert.equal(s.checkin.done, true);
  assert.equal(s.checkin.streak, 4);
  assert.equal(s.checkin.amount, 1300);
  assert.deepEqual(s.breakdown, { challenge: 0, checkin: 1300, listen: 100, referral: 0, shopReferral: 0, other: 300 });
  assert.equal(s.listen.count, 1);
  // a gap too long for grace previews a restart at day 1
  const r2 = stubRedis();
  await r2.hset(checkinStreakKey(em), { last: '2026-08-20', n: '9', grace: '1' });
  const s2 = await readDailySummary(r2, { email: EMAIL, now: at('2026-09-02'), todayPoints: 0 });
  assert.equal(s2.checkin.streak, 1);
  assert.equal(s2.checkin.amount, 1000);
});
