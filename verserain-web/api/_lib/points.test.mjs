// node --test api/_lib/*.test.mjs
// Points redemption (積分折抵) against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert';
import {
  CODE_ALPHABET, CODE_LEN, POINTS_PER_NTD, VOUCHER_MAX_NTD, MONTHLY_MAX_NTD, VOUCHER_TTL_SEC,
  PLAUSIBLE_POINTS_PER_TREE, PLAUSIBLE_SLACK, PLACES_KEY, LEADERBOARD_KEY,
  spentKey, openKey, dayKey, monthKey, placeDayKey, historyKey, refundedKey,
  taipeiDay, taipeiMonth, newVoucherCode, normalizeCode, formatCode, plausiblePoints, lifetimePoints, recordScore, ensureEarnedSeeded, earnedKey, bestKey, dailyEarnedKey, seededKey, eligibility,
  computeDiscount, voucherStatus, maskName, publicVoucher,
  readBalance, issueVoucher, markUsed, expireVoucher, voidVoucher, restoreVoucher, getVoucher, listVouchers,
} from './points.js';

function stubRedis() {
  const hashes = new Map();
  const lists = new Map();
  const strings = new Map();
  const zsets = new Map();
  const ttl = new Map();
  const h = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  const num = (k) => { const v = strings.get(k); return v === undefined ? 0 : Number(v); };
  return {
    hashes, lists, strings, zsets, ttl,
    async hset(k, obj) { const m = h(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return 1; },
    async hget(k, f) { return h(k).get(f) ?? null; },
    async hgetall(k) { return Object.fromEntries(h(k)); },
    async hdel(k, f) { return h(k).delete(f) ? 1 : 0; },
    async lpush(k, v) { const l = lists.get(k) || []; l.unshift(v); lists.set(k, l); return l.length; },
    async ltrim(k, a, b) { const l = lists.get(k) || []; lists.set(k, l.slice(a, b + 1)); return 'OK'; },
    async lrange(k, a, b) { const l = lists.get(k) || []; return l.slice(a, b === -1 ? undefined : b + 1); },
    async set(k, v, opts) {
      if (opts && opts.nx && strings.has(k)) return null;
      strings.set(k, String(v));
      if (opts && opts.ex) ttl.set(k, opts.ex);
      if (opts && opts.px) ttl.set(k, opts.px / 1000);
      return 'OK';
    },
    async get(k) { return strings.get(k) ?? null; },
    async del(k) { const had = strings.delete(k); ttl.delete(k); return had ? 1 : 0; },
    async incr(k) { const n = num(k) + 1; strings.set(k, String(n)); return n; },
    async incrby(k, d) { const n = num(k) + Number(d); strings.set(k, String(n)); return n; },
    async decrby(k, d) { const n = num(k) - Number(d); strings.set(k, String(n)); return n; },
    async expire(k, s) { if (!strings.has(k)) return 0; ttl.set(k, s); return 1; },
    async zadd(k, { score, member }) { const z = zsets.get(k) || new Map(); z.set(member, score); zsets.set(k, z); return 1; },
    async zscore(k, m) { const z = zsets.get(k); return z && z.has(m) ? z.get(m) : null; },
  };
}

const NOW = new Date('2026-09-22T06:00:00Z'); // 14:00 Taipei
const identity = { email: 'a@x.com', playerName: 'Alice', personalCode: 'ABCDEFGHJK', accountAgeDays: 30, emailKind: 'real', sessionValid: true };
const garden = { passedVerses: 12, treesPlanted: 10, activeDays: 20 };
const place = { id: 'p1', kind: 'merchant', name: '恩典咖啡', status: 'approved', discountPct: 10, dailyCapNTD: 2000, stats: { issued: 0, used: 0, usedNTD: 0 } };

async function seed(r, { earned = 100000, place: p = place } = {}) {
  await r.zadd(LEADERBOARD_KEY, { score: earned, member: identity.playerName });
  await r.hset(PLACES_KEY, { [p.id]: JSON.stringify(p) });
}

test('voucher codes use the safe alphabet, normalize and format', () => {
  for (let i = 0; i < 50; i++) {
    const c = newVoucherCode();
    assert.strictEqual(c.length, CODE_LEN);
    assert.ok([...c].every(ch => CODE_ALPHABET.includes(ch)), c);
  }
  assert.strictEqual(newVoucherCode(() => 0), 'AAAAAAAA');
  assert.strictEqual(newVoucherCode(() => 0.999999), '99999999');
  assert.strictEqual(normalizeCode(' abcd-efgh '), 'ABCDEFGH');
  assert.strictEqual(normalizeCode('ABCD EFGH'), 'ABCDEFGH');
  assert.strictEqual(normalizeCode('ABCD-EFG0'), null, '0 is not in the alphabet');
  assert.strictEqual(normalizeCode('ABCDEFG'), null);
  assert.strictEqual(normalizeCode(''), null);
  assert.strictEqual(formatCode('ABCDEFGH'), 'ABCD-EFGH');
});

test('taipeiDay / taipeiMonth shift to UTC+8', () => {
  assert.strictEqual(taipeiDay(new Date('2026-09-22T17:30:00Z')), '2026-09-23');
  assert.strictEqual(taipeiDay(new Date('2026-09-22T15:59:59Z')), '2026-09-22');
  assert.strictEqual(taipeiMonth(new Date('2026-09-30T16:00:00Z')), '2026-10');
});

test('plausiblePoints clamps to trees × rate + slack', () => {
  assert.strictEqual(plausiblePoints(50000, 10), 50000);
  assert.strictEqual(plausiblePoints(500000, 10), 10 * PLAUSIBLE_POINTS_PER_TREE + PLAUSIBLE_SLACK);
  assert.strictEqual(plausiblePoints(30000, 0), PLAUSIBLE_SLACK);
  assert.strictEqual(plausiblePoints(-5, 3), 0);
  assert.strictEqual(plausiblePoints(null, null), 0);
  assert.strictEqual(lifetimePoints(43192, { activityPoints: 778489 }), 778489, 'renamed player: garden log wins');
  assert.strictEqual(lifetimePoints(90000, { activityPoints: 500 }), 90000, 'truncated log: leaderboard wins');
  assert.strictEqual(lifetimePoints(null, null), 0);
  assert.strictEqual(lifetimePoints('abc', { activityPoints: 'x' }), 0);
});

test('eligibility lists every failing reason', () => {
  assert.deepStrictEqual(eligibility(identity, garden), { eligible: true, reasons: [] });
  const bad = eligibility({ ...identity, sessionValid: false, email: '', accountAgeDays: 2 }, { passedVerses: 1 });
  assert.deepStrictEqual(bad.reasons, ['session_invalid', 'no_email', 'not_enough_passed', 'account_too_new']);
  assert.deepStrictEqual(eligibility({ ...identity, emailKind: 'none' }, garden).reasons, ['no_email']);
  assert.deepStrictEqual(eligibility({ ...identity, accountAgeDays: null }, garden).reasons, ['account_too_new']);
  assert.deepStrictEqual(eligibility(identity, { passedVerses: 3 }).reasons, []);
});

test('computeDiscount applies each cap with the right limitedBy', () => {
  const base = { billNTD: 1000, discountPct: 10, balancePoints: 1_000_000, monthlyUsedNTD: 0, placeDailyUsedNTD: 0, placeDailyCap: 2000 };
  assert.deepStrictEqual(computeDiscount(base), { ntd: 100, points: 100000, limitedBy: null });
  assert.deepStrictEqual(computeDiscount({ ...base, billNTD: 5000 }), { ntd: VOUCHER_MAX_NTD, points: VOUCHER_MAX_NTD * POINTS_PER_NTD, limitedBy: 'voucher_cap' });
  assert.deepStrictEqual(computeDiscount({ ...base, monthlyUsedNTD: MONTHLY_MAX_NTD - 30 }), { ntd: 30, points: 30000, limitedBy: 'monthly' });
  assert.deepStrictEqual(computeDiscount({ ...base, balancePoints: 45999 }), { ntd: 45, points: 45000, limitedBy: 'balance' });
  assert.deepStrictEqual(computeDiscount({ ...base, placeDailyUsedNTD: 1980 }), { ntd: 20, points: 20000, limitedBy: 'place_daily' });
  // Tie: voucher cap and monthly both at 200 → precedence names voucher_cap.
  assert.strictEqual(computeDiscount({ ...base, billNTD: 5000, monthlyUsedNTD: 300 }).limitedBy, 'voucher_cap');
  // Exhausted → 0, never negative.
  assert.deepStrictEqual(computeDiscount({ ...base, monthlyUsedNTD: 600 }), { ntd: 0, points: 0, limitedBy: 'monthly' });
  assert.deepStrictEqual(computeDiscount({ ...base, balancePoints: 0 }), { ntd: 0, points: 0, limitedBy: 'balance' });
  // Missing place cap falls back to the global place ceiling.
  assert.strictEqual(computeDiscount({ ...base, placeDailyCap: undefined, placeDailyUsedNTD: 1990 }).ntd, 10);
  assert.strictEqual(computeDiscount({ billNTD: 59, discountPct: 10, balancePoints: 1e6 }).ntd, 5, 'floor');
});

test('voucherStatus, maskName and publicVoucher hide the email', () => {
  const v = { code: 'ABCDEFGH', status: 'issued', email: 'a@x.com', playerName: '王小明', expiresAt: '2026-09-22T06:30:00Z', placeName: 'X', ntd: 10, points: 10000 };
  assert.strictEqual(voucherStatus(v, new Date('2026-09-22T06:29:59Z')), 'issued');
  assert.strictEqual(voucherStatus(v, new Date('2026-09-22T06:30:00Z')), 'expired');
  assert.strictEqual(voucherStatus({ ...v, status: 'used' }, new Date('2026-09-23T00:00:00Z')), 'used');
  assert.strictEqual(maskName('王小明'), '王＊＊');
  assert.strictEqual(maskName('Alice'), 'A＊＊');
  assert.strictEqual(maskName(''), '＊＊');
  const pub = publicVoucher(v, new Date('2026-09-22T06:20:00Z'));
  assert.strictEqual(pub.email, undefined);
  assert.strictEqual(pub.holder, '王＊＊');
  assert.strictEqual(pub.formatted, 'ABCD-EFGH');
  assert.strictEqual(pub.secondsLeft, 600);
});

test('issueVoucher happy path charges the ledgers and records the voucher', async () => {
  const r = stubRedis();
  await seed(r);
  const { voucher } = await issueVoucher(r, { email: 'A@x.com', identity, garden, place, billNTD: 800, now: NOW, rand: () => 0.5 });
  assert.strictEqual(voucher.status, 'issued');
  assert.strictEqual(voucher.ntd, 80);
  assert.strictEqual(voucher.points, 80000);
  assert.strictEqual(voucher.email, 'a@x.com');
  assert.strictEqual(voucher.ownerCode, 'ABCDEFGHJK');
  assert.strictEqual(voucher.placeName, '恩典咖啡');
  assert.strictEqual(voucher.issuedAt, NOW.toISOString());
  assert.strictEqual(Date.parse(voucher.expiresAt) - Date.parse(voucher.issuedAt), VOUCHER_TTL_SEC * 1000);
  assert.strictEqual(await r.get(spentKey('a@x.com')), '80000');
  assert.strictEqual(await r.get(monthKey('a@x.com', '2026-09')), '80');
  assert.strictEqual(await r.get(placeDayKey('p1', '2026-09-22')), '80');
  assert.strictEqual(await r.get(openKey('a@x.com')), voucher.code);
  assert.strictEqual(r.ttl.get(openKey('a@x.com')), VOUCHER_TTL_SEC);
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '1');
  assert.deepStrictEqual(await r.lrange(historyKey('a@x.com'), 0, -1), [voucher.code]);
  assert.strictEqual((await getVoucher(r, voucher.code)).code, voucher.code);
  assert.strictEqual(JSON.parse(await r.hget(PLACES_KEY, 'p1')).stats.issued, 1);
  assert.strictEqual((await listVouchers(r)).length, 1);
});

test('issueVoucher refuses a second open voucher and honours the per-shop daily count', async () => {
  const r = stubRedis();
  await seed(r);
  const onePerDay = { ...place, dailyPerPerson: 1 };
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: onePerDay, billNTD: 300, now: NOW });
  await assert.rejects(
    issueVoucher(r, { email: 'a@x.com', identity, garden, place: { ...place, id: 'p2' }, billNTD: 300, now: NOW }),
    (e) => e.code === 'open_voucher_exists' && e.voucher.code === voucher.code,
  );
  // Use it, then the same place on the same day is exhausted (limit 1); another place is fine.
  await markUsed(r, voucher.code, { now: new Date(NOW.getTime() + 60000) });
  await assert.rejects(
    issueVoucher(r, { email: 'a@x.com', identity, garden, place: onePerDay, billNTD: 300, now: new Date(NOW.getTime() + 120000) }),
    (e) => e.code === 'daily_place_limit' && e.limit === 1 && e.used === 1,
  );
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '1', 'a refused attempt does not consume a slot');
  await r.hset(PLACES_KEY, { p2: JSON.stringify({ ...place, id: 'p2' }) });
  const second = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: { ...place, id: 'p2' }, billNTD: 300, now: new Date(NOW.getTime() + 120000) });
  assert.strictEqual(second.voucher.placeId, 'p2');
  // Next Taipei day, the first place opens again.
  await markUsed(r, second.voucher.code, { now: new Date(NOW.getTime() + 180000) });
  const tomorrow = new Date('2026-09-22T16:30:00Z'); // 00:30 Taipei next day
  const third = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: onePerDay, billNTD: 300, now: tomorrow });
  assert.strictEqual(third.voucher.placeId, 'p1');
});

test('issueVoucher: default 3 per shop per day, 0 means unlimited', async () => {
  const r = stubRedis();
  await seed(r);
  let t = NOW.getTime();
  const open = async (pl) => { const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: pl, billNTD: 100, now: new Date(t) }); t += 60000; await markUsed(r, voucher.code, { now: new Date(t) }); t += 60000; return voucher; };
  await open(place); await open(place); await open(place);
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '3');
  await assert.rejects(issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 100, now: new Date(t) }), (e) => e.code === 'daily_place_limit' && e.limit === 3 && e.used === 3);
  const unlimited = { ...place, dailyPerPerson: 0 };
  for (let i = 0; i < 5; i++) await open(unlimited);
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '8');
  // A bogus setting falls back to the default of 3.
  await assert.rejects(issueVoucher(r, { email: 'a@x.com', identity, garden, place: { ...place, dailyPerPerson: 'lots' }, billNTD: 100, now: new Date(t) }), (e) => e.code === 'daily_place_limit' && e.limit === 3);
});

test('refund gives the day slot back without going negative', async () => {
  const r = stubRedis();
  await seed(r);
  const a = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 100, now: NOW });
  await markUsed(r, a.voucher.code, { now: new Date(NOW.getTime() + 1000) });
  const b = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 100, now: new Date(NOW.getTime() + 2000) });
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '2');
  const later = new Date(NOW.getTime() + VOUCHER_TTL_SEC * 1000 + 5000);
  await expireVoucher(r, await getVoucher(r, b.voucher.code), later);
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), '1', 'only the expired one is refunded');
});

test('issueVoucher: too_small releases the day lock; bad input never locks', async () => {
  const r = stubRedis();
  await seed(r);
  await assert.rejects(issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 5, now: NOW }), (e) => e.code === 'too_small');
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), null, 'lock released');
  assert.strictEqual(await r.get(spentKey('a@x.com')), null, 'nothing charged');
  const ok = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 100, now: NOW });
  assert.strictEqual(ok.voucher.ntd, 10);

  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com', accountAgeDays: 1 }, garden, place, billNTD: 100, now: NOW }), (e) => e.code === 'not_eligible' && e.reasons.includes('account_too_new'));
  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com' }, garden, place: { ...place, status: 'pending' }, billNTD: 100, now: NOW }), (e) => e.code === 'place_unavailable');
  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com' }, garden, place: { ...place, kind: 'church' }, billNTD: 100, now: NOW }), (e) => e.code === 'place_unavailable');
  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com' }, garden, place, billNTD: 0, now: NOW }), (e) => e.code === 'bill_invalid');
  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com' }, garden, place, billNTD: 12.5, now: NOW }), (e) => e.code === 'bill_invalid');
  await assert.rejects(issueVoucher(r, { email: 'b@x.com', identity: { ...identity, email: 'b@x.com' }, garden, place, billNTD: 100001, now: NOW }), (e) => e.code === 'bill_invalid');
  assert.strictEqual(await r.get(dayKey('b@x.com', 'p1', '2026-09-22')), null);
});

test('readBalance seeds the account ledger once from the larger of leaderboard and activity total', async () => {
  const r = stubRedis();
  await seed(r, { earned: 43192 });
  const g = { ...garden, activityPoints: 778489 };
  const b = await readBalance(r, { email: 'a@x.com', identity, garden: g, now: NOW });
  assert.strictEqual(b.earnedPoints, 778489);
  assert.strictEqual(await r.get(earnedKey('a@x.com')), '778489');
  assert.ok(await r.get(seededKey('a@x.com')), 'seed flag set');
  // Later reads never re-seed, even if the leaderboard grows under the name.
  await r.zadd(LEADERBOARD_KEY, { score: 999999, member: identity.playerName });
  const again = await readBalance(r, { email: 'a@x.com', identity, garden: g, now: NOW });
  assert.strictEqual(again.earnedPoints, 778489);
  assert.strictEqual(b.balancePoints, plausiblePoints(778489, garden.treesPlanted));
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden: g, place, billNTD: 1000, now: NOW });
  assert.strictEqual(voucher.ntd, 100, 'NT$100 off a NT$1000 bill at 10% now fits the balance');
});

test('recordScore credits only the improvement over the verse best, keyed by account', async () => {
  const r = stubRedis();
  const em = 'a@x.com';
  const a = await recordScore(r, { email: em, playerName: 'A', verseRef: 'John 3:16', score: 817, now: NOW });
  assert.deepStrictEqual({ delta: a.delta, earned: a.earnedPoints, today: a.todayPoints }, { delta: 817, earned: 817, today: 817 });
  const lower = await recordScore(r, { email: em, playerName: 'A', verseRef: 'John 3:16', score: 500, now: NOW });
  assert.strictEqual(lower.delta, 0, 'below the record adds nothing');
  assert.strictEqual(lower.earnedPoints, 817);
  const better = await recordScore(r, { email: em, playerName: 'A', verseRef: 'John 3:16', score: 1000, now: NOW });
  assert.strictEqual(better.delta, 183);
  const other = await recordScore(r, { email: em, playerName: 'A', verseRef: 'Ps 23:1', score: 300, now: NOW });
  assert.strictEqual(other.earnedPoints, 1300);
  assert.strictEqual(await r.hget(bestKey(em), 'John 3:16'), '1000');
  assert.strictEqual(await r.get(dailyEarnedKey(em, '2026-09-22')), '1300');
  // A rename does not matter: same email, different playerName.
  const renamed = await recordScore(r, { email: em, playerName: 'A-new', verseRef: 'John 3:16', score: 1100, now: NOW });
  assert.strictEqual(renamed.delta, 100);
  // Bad input credits nothing.
  assert.strictEqual((await recordScore(r, { email: '', verseRef: 'x', score: 10 })).delta, 0);
  assert.strictEqual((await recordScore(r, { email: em, verseRef: 'x', score: -5 })).delta, 0);
});

test('recordScore falls back to the name-keyed per-verse best before the account has one', async () => {
  const r = stubRedis();
  await r.zadd('leaderboard:John 3:16', { score: 900, member: 'A' });
  const first = await recordScore(r, { email: 'a@x.com', playerName: 'A', verseRef: 'John 3:16', score: 950, now: NOW });
  assert.strictEqual(first.delta, 50, 'only the improvement over the old name-keyed best');
  const seeded = await ensureEarnedSeeded(r, { email: 'a@x.com', identity, garden: { treesPlanted: 10, activityPoints: 20000 }, leaderboardScore: 43192 });
  assert.strictEqual(seeded, 43192, 'seed takes the larger history, not less than what was already credited');
  assert.strictEqual(await r.get(earnedKey('a@x.com')), '43192');
  const later = await recordScore(r, { email: 'a@x.com', playerName: 'A', verseRef: 'Ps 1:1', score: 100, now: NOW });
  assert.strictEqual(later.earnedPoints, 43292);
});

test('issueVoucher is capped by the plausible balance, not the raw leaderboard', async () => {
  const r = stubRedis();
  await seed(r, { earned: 5_000_000 });
  // 10 trees → plausible 100000 points = NT$100.
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: { ...place, discountPct: 50 }, billNTD: 1000, now: NOW });
  assert.strictEqual(voucher.ntd, 100);
});

test('markUsed transitions and rejects reuse / void / expired', async () => {
  const r = stubRedis();
  await seed(r);
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 300, now: NOW });
  await assert.rejects(markUsed(r, 'ZZZZZZZZ', { now: NOW }), (e) => e.code === 'not_found');
  await assert.rejects(markUsed(r, 'bad code', { now: NOW }), (e) => e.code === 'not_found');
  const used = await markUsed(r, formatCode(voucher.code).toLowerCase(), { now: new Date(NOW.getTime() + 1000), via: 'merchant_app' });
  assert.strictEqual(used.status, 'used');
  assert.strictEqual(used.usedVia, 'merchant_app');
  assert.strictEqual(await r.get(openKey('a@x.com')), null, 'open slot freed');
  const p = JSON.parse(await r.hget(PLACES_KEY, 'p1'));
  assert.deepStrictEqual(p.stats, { issued: 1, used: 1, usedNTD: 30 });
  await assert.rejects(markUsed(r, voucher.code, { now: NOW }), (e) => e.code === 'already_used');

  // Expired at the counter: refunded and rejected.
  const r2 = stubRedis();
  await seed(r2);
  const late = await issueVoucher(r2, { email: 'a@x.com', identity, garden, place, billNTD: 300, now: NOW });
  await assert.rejects(markUsed(r2, late.voucher.code, { now: new Date(NOW.getTime() + VOUCHER_TTL_SEC * 1000) }), (e) => e.code === 'expired');
  assert.strictEqual((await getVoucher(r2, late.voucher.code)).status, 'expired');
  assert.strictEqual(await r2.get(spentKey('a@x.com')), '0');
  await assert.rejects(markUsed(r2, late.voucher.code, { now: NOW }), (e) => e.code === 'expired');

  // Voided: rejected with 'void'.
  const r3 = stubRedis();
  await seed(r3);
  const v3 = await issueVoucher(r3, { email: 'a@x.com', identity, garden, place, billNTD: 300, now: NOW });
  await voidVoucher(r3, v3.voucher.code, 'hungry4grace@gmail.com', NOW);
  await assert.rejects(markUsed(r3, v3.voucher.code, { now: NOW }), (e) => e.code === 'void');
});

test('expireVoucher refunds exactly once', async () => {
  const r = stubRedis();
  await seed(r);
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 600, now: NOW });
  assert.strictEqual(await r.get(spentKey('a@x.com')), '60000');
  const later = new Date(NOW.getTime() + VOUCHER_TTL_SEC * 1000 + 1);
  const v = await expireVoucher(r, await getVoucher(r, voucher.code), later);
  assert.strictEqual(v.status, 'expired');
  assert.strictEqual(await r.get(spentKey('a@x.com')), '0');
  assert.strictEqual(await r.get(monthKey('a@x.com', '2026-09')), '0');
  assert.strictEqual(await r.get(placeDayKey('p1', '2026-09-22')), '0');
  assert.strictEqual(await r.get(dayKey('a@x.com', 'p1', '2026-09-22')), null);
  assert.strictEqual(await r.get(openKey('a@x.com')), null);
  assert.strictEqual(await r.get(refundedKey(voucher.code)), '1');
  // Second call: no double refund, no state change.
  await expireVoucher(r, await getVoucher(r, voucher.code), later);
  assert.strictEqual(await r.get(spentKey('a@x.com')), '0');
  // Voiding an already-expired voucher is refused; voiding a used one refunds once.
  await assert.rejects(voidVoucher(r, voucher.code, 'admin@x.com', later), (e) => e.code === 'invalid_state');
});

test('voidVoucher refunds a used voucher once; restoreVoucher only fixes the record', async () => {
  const r = stubRedis();
  await seed(r);
  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 400, now: NOW });
  await markUsed(r, voucher.code, { now: NOW });
  const voided = await voidVoucher(r, voucher.code, 'HUNGRY4GRACE@gmail.com', NOW);
  assert.strictEqual(voided.status, 'void');
  assert.strictEqual(voided.voidedBy, 'hungry4grace@gmail.com');
  assert.strictEqual(await r.get(spentKey('a@x.com')), '0');
  assert.deepStrictEqual(JSON.parse(await r.hget(PLACES_KEY, 'p1')).stats, { issued: 1, used: 0, usedNTD: 0 });
  await assert.rejects(voidVoucher(r, voucher.code, 'a@x.com', NOW), (e) => e.code === 'invalid_state');
  await assert.rejects(restoreVoucher(r, 'ZZZZZZZZ', 'a@x.com', NOW), (e) => e.code === 'not_found');
  const restored = await restoreVoucher(r, voucher.code, 'hungry4grace@gmail.com', NOW);
  assert.strictEqual(restored.status, 'used', 'had usedAt → back to used');
  assert.strictEqual(restored.voidedAt, undefined);
  assert.strictEqual(await r.get(spentKey('a@x.com')), '0', 'refund is not re-charged');
  assert.deepStrictEqual(JSON.parse(await r.hget(PLACES_KEY, 'p1')).stats, { issued: 1, used: 1, usedNTD: 40 });
  await assert.rejects(restoreVoucher(r, voucher.code, 'a@x.com', NOW), (e) => e.code === 'invalid_state');

  const r2 = stubRedis();
  await seed(r2);
  const v2 = await issueVoucher(r2, { email: 'a@x.com', identity, garden, place, billNTD: 400, now: NOW });
  await voidVoucher(r2, v2.voucher.code, 'hungry4grace@gmail.com', NOW);
  assert.strictEqual(await r2.get(openKey('a@x.com')), null, 'void frees the open slot');
  assert.strictEqual((await restoreVoucher(r2, v2.voucher.code, 'hungry4grace@gmail.com', NOW)).status, 'issued');
});

test('readBalance math and lazy expiry of the open voucher', async () => {
  const r = stubRedis();
  await seed(r, { earned: 250000 });
  const empty = await readBalance(r, { email: 'a@x.com', identity, garden, now: NOW });
  assert.strictEqual(empty.earnedPoints, 250000);
  assert.strictEqual(empty.plausiblePoints, 100000, '10 trees × 8000 + 20000');
  assert.strictEqual(empty.spentPoints, 0);
  assert.strictEqual(empty.balancePoints, 100000);
  assert.strictEqual(empty.balanceNTD, 100);
  assert.strictEqual(empty.monthlyUsedNTD, 0);
  assert.strictEqual(empty.monthlyCapNTD, MONTHLY_MAX_NTD);
  assert.strictEqual(empty.voucherCapNTD, VOUCHER_MAX_NTD);
  assert.strictEqual(empty.pointsPerNTD, POINTS_PER_NTD);
  assert.strictEqual(empty.eligible, true);
  assert.strictEqual(empty.openVoucher, null);

  const { voucher } = await issueVoucher(r, { email: 'a@x.com', identity, garden, place, billNTD: 300, now: NOW });
  const mid = await readBalance(r, { email: 'a@x.com', identity, garden, now: new Date(NOW.getTime() + 60000) });
  assert.strictEqual(mid.spentPoints, 30000);
  assert.strictEqual(mid.balancePoints, 70000);
  assert.strictEqual(mid.balanceNTD, 70);
  assert.strictEqual(mid.monthlyUsedNTD, 30);
  assert.strictEqual(mid.openVoucher.code, voucher.code);
  assert.strictEqual(mid.openVoucher.email, undefined);
  assert.strictEqual(mid.openVoucher.secondsLeft, VOUCHER_TTL_SEC - 60);

  // Past expiry: reading the balance refunds and clears the open voucher.
  const after = await readBalance(r, { email: 'a@x.com', identity, garden, now: new Date(NOW.getTime() + VOUCHER_TTL_SEC * 1000) });
  assert.strictEqual(after.openVoucher, null);
  assert.strictEqual(after.spentPoints, 0);
  assert.strictEqual(after.balancePoints, 100000);
  assert.strictEqual((await getVoucher(r, voucher.code)).status, 'expired');

  // Once seeded, the account ledger is authoritative: a leaderboard value the
  // caller passes no longer overrides it. Spent above plausible floors at 0.
  await r.set(spentKey('a@x.com'), '999999');
  const floored = await readBalance(r, { email: 'a@x.com', identity, garden, now: NOW, earnedPoints: 50000 });
  assert.strictEqual(floored.earnedPoints, 250000);
  assert.strictEqual(floored.balancePoints, 0);
  assert.strictEqual(floored.balanceNTD, 0);
  // Unknown player on the leaderboard → 0 earned.
  const nobody = await readBalance(r, { email: 'z@x.com', identity: { ...identity, email: 'z@x.com', playerName: 'Nobody' }, garden, now: NOW });
  assert.strictEqual(nobody.earnedPoints, 0);
  assert.deepStrictEqual(nobody.reasons, []);
  const noSession = await readBalance(r, { email: 'z@x.com', identity: { ...identity, sessionValid: false }, garden: { passedVerses: 0 }, now: NOW });
  assert.strictEqual(noSession.eligible, false);
  assert.deepStrictEqual(noSession.reasons, ['session_invalid', 'not_enough_passed']);
});

test('history: per-place index, owner list, scan fallback, and summary', async () => {
  const { listVouchersForEmail, listVouchersForPlace, summarizeVouchers, placeHistoryKey, VOUCHERS_KEY } = await import('./points.js');
  const r = stubRedis();
  const identity = { email: 'h@x.com', playerName: 'Hana', personalCode: 'HHHHHHHHHH', accountAgeDays: 30, emailKind: 'real', sessionValid: true };
  const garden = { passedVerses: 10, treesPlanted: 10 };
  const place = { id: 'pl_shop1', kind: 'merchant', name: 'Shop', status: 'approved', discountPct: 10, dailyCapNTD: 2000 };
  await r.hset('map:places', { [place.id]: JSON.stringify(place) });
  const { voucher } = await issueVoucher(r, { email: 'h@x.com', identity, garden, place, billNTD: 500, earnedPoints: 200000, now: new Date('2026-09-22T10:00:00Z') });
  assert.deepStrictEqual(await r.lrange(placeHistoryKey(place.id), 0, -1), [voucher.code], 'place index written');
  const mine = await listVouchersForEmail(r, 'H@x.com', { now: new Date('2026-09-22T10:05:00Z') });
  assert.strictEqual(mine.length, 1);
  assert.strictEqual(mine[0].computedStatus, 'issued');
  const forPlace = await listVouchersForPlace(r, place.id, { now: new Date('2026-09-22T10:05:00Z') });
  assert.strictEqual(forPlace[0].code, voucher.code);
  // Legacy voucher without an index entry is still found by scan.
  await r.hset(VOUCHERS_KEY, { LEGACYAB12: JSON.stringify({ code: 'LEGACYAB12', placeId: 'pl_old', status: 'used', ntd: 30, points: 30000, issuedAt: '2026-09-01T00:00:00Z' }) });
  const old = await listVouchersForPlace(r, 'pl_old', { now: new Date() });
  assert.strictEqual(old.length, 1);
  assert.deepStrictEqual(summarizeVouchers([...old, ...mine]), { issued: 2, open: 1, used: 1, usedNTD: 30, usedPoints: 30000, expired: 0, void: 0 });
});
