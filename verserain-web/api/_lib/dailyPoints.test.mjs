// node --test api/_lib/*.test.mjs
// 每日登入 (streak + 恩典日) and 聆聽經文 (+100, once per verse per day, 20 a day)
// against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkinAmount, daysBetween, nextStreak, recordCheckin, recordListen, cleanListenRef,
  LISTEN_DAILY_MAX, checkinStreakKey,
} from './dailyPoints.js';
import { earnedKey, dailyEarnedKey } from './points.js';

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
    async expire() { return 1; },
    async hgetall(k) { return hashes.has(k) ? Object.fromEntries(hashes.get(k)) : null; },
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
