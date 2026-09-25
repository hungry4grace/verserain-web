// node --test api/_lib/*.test.mjs
// Charity discount pools (愛心折抵池) against an in-memory Upstash stub. The
// compliance memo's rules are asserted here: a contribution burns the
// player's points (no wallet, no refund), the allowance only ever becomes a
// merchant-verified voucher, and refunds go back to the pool, never a person.
import { test } from 'node:test';
import assert from 'node:assert';
import {
  POINTS_PER_NTD, LEADERBOARD_KEY, PLACES_KEY, VOUCHERS_KEY, VOUCHER_TTL_SEC,
  spentKey, monthKey, placeHistoryKey, poolAllowanceKey, poolMerchantMonthKey, poolOpenKey, refundedKey, taipeiMonth,
  publicVoucher, markUsed, expireVoucher, voidVoucher, restoreVoucher, getVoucher, listVouchersForPlace, settleReferralBonus, issueVoucher, readBalance,
} from './points.js';
import {
  POOL_ID_RE, CONTRIB_STEP_POINTS, CONTRIB_DAILY_MAX_POINTS, MERCHANT_PER_ORDER_MAX_NTD, MERCHANT_MONTHLY_MAX_NTD,
  PoolError, newPoolId, normalizePoolSubmission, applyPoolAdminAction, applyMerchantJoin, applyMerchantLeave, computePoolDiscount,
  listPools, getPool, savePool, findPoolByOrgPlace, openPoolsForPlace, MAX_OPEN_POOLS_PER_PLACE, poolCounters, poolMerchantMonthUsed, contribute, issuePoolVoucher,
  listContributionsForPool, listContributionsForEmail, listVouchersForPool, summarizePoolVouchers,
  publicContribution, publicPool, publicPools, ownerPoolView, contribDayKey, poolStatsKey, poolContributorsKey,
} from './pools.js';

function stubRedis() {
  const hashes = new Map();
  const lists = new Map();
  const strings = new Map();
  const sets = new Map();
  const zsets = new Map();
  const ttl = new Map();
  const h = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  const st = (k) => { if (!sets.has(k)) sets.set(k, new Set()); return sets.get(k); };
  const num = (k) => { const v = strings.get(k); return v === undefined ? 0 : Number(v); };
  return {
    hashes, lists, strings, sets, ttl,
    async hset(k, obj) { const m = h(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return 1; },
    async hget(k, f) { return h(k).get(f) ?? null; },
    async hgetall(k) { return Object.fromEntries(h(k)); },
    async hdel(k, f) { return h(k).delete(f) ? 1 : 0; },
    async hincrby(k, f, d) { const m = h(k); const n = Number(m.get(f) || 0) + Number(d); m.set(f, String(n)); return n; },
    async lpush(k, v) { const l = lists.get(k) || []; l.unshift(v); lists.set(k, l); return l.length; },
    async ltrim(k, a, b) { const l = lists.get(k) || []; lists.set(k, l.slice(a, b + 1)); return 'OK'; },
    async lrange(k, a, b) { const l = lists.get(k) || []; return l.slice(a, b === -1 ? undefined : b + 1); },
    async sadd(k, v) { const s = st(k); if (s.has(v)) return 0; s.add(v); return 1; },
    async scard(k) { return st(k).size; },
    async set(k, v, opts) {
      if (opts && opts.nx && strings.has(k)) return null;
      strings.set(k, String(v));
      if (opts && opts.ex) ttl.set(k, opts.ex);
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

const NOW = new Date('2026-10-04T03:00:00Z'); // 11:00 Taipei
const identity = { email: 'a@x.com', playerName: 'Alice', personalCode: 'ABCDEFGHJK', accountAgeDays: 30, emailKind: 'real', sessionValid: true };
const garden = { passedVerses: 12, treesPlanted: 10, activeDays: 20 };
const orgIdentity = { email: 'org@x.com', playerName: '恩典教會', personalCode: 'ORGCODE001', accountAgeDays: 100, emailKind: 'real', sessionValid: true };
const church = { id: 'pl_church0001', kind: 'church', name: '恩典教會', status: 'approved', ownerEmail: 'org@x.com', ownerCode: 'ORGCODE001', discountPct: 0 };
const shop = { id: 'pl_bento00001', kind: 'merchant', name: '主愛便當', status: 'approved', ownerEmail: 'shop@x.com', discountPct: 10, dailyCapNTD: 2000, referrerCode: 'REFCODE001', stats: { issued: 0, used: 0, usedNTD: 0 } };

function approvedPool(extra = {}) {
  const p = normalizePoolSubmission({ name: '偏鄉長輩愛筵池', description: '每月一次愛筵' }, { orgPlace: church, ownerEmail: 'org@x.com', ownerCode: 'ORGCODE001', now: NOW });
  const approved = applyPoolAdminAction(p, 'approve', { adminEmail: 'admin@x.com', now: NOW });
  return { ...approved, ...extra };
}
function joined(pool, terms = { perOrderMaxNTD: 50, monthlyMaxNTD: 120 }) {
  return applyMerchantJoin(pool, shop, { ...terms, consent: true, now: NOW });
}
async function seed(r, { earned = 200000, pool } = {}) {
  await r.zadd(LEADERBOARD_KEY, { score: earned, member: identity.playerName });
  await r.hset(PLACES_KEY, { [church.id]: JSON.stringify(church), [shop.id]: JSON.stringify(shop) });
  if (pool) await savePool(r, pool);
}
async function fund(r, pool, ntd, now = NOW) {
  // NT$1 per 1,000 points, so ntd NT$ of allowance costs ntd × 1,000 points.
  // A big garden so the plausible-balance cap never binds in the voucher tests.
  await contribute(r, { pool, email: identity.email, identity, garden: { ...garden, treesPlanted: 100 }, points: ntd * POINTS_PER_NTD, now, earnedPoints: 200000 });
}

test('pool ids, normalize and the org-place rule', () => {
  assert.ok(POOL_ID_RE.test(newPoolId(NOW)));
  const p = normalizePoolSubmission({ name: '  偏鄉長輩愛筵池  ', description: 'x'.repeat(400) }, { orgPlace: church, ownerEmail: 'ORG@x.com', ownerCode: 'C', now: NOW });
  assert.strictEqual(p.name, '偏鄉長輩愛筵池');
  assert.strictEqual(p.description.length, 300);
  assert.strictEqual(p.status, 'pending');
  assert.strictEqual(p.ownerEmail, 'org@x.com');
  assert.strictEqual(p.orgPlaceId, church.id);
  assert.deepStrictEqual(p.merchants, {});
  const noName = normalizePoolSubmission({}, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW });
  assert.strictEqual(noName.name, '恩典教會', 'name defaults to the marker');
  assert.throws(() => normalizePoolSubmission({}, { orgPlace: shop, ownerEmail: 'shop@x.com' }), /org_place_invalid/, 'a shop cannot open a pool');
  assert.throws(() => normalizePoolSubmission({}, { orgPlace: { ...church, status: 'pending' }, ownerEmail: 'org@x.com' }), /org_place_invalid/, 'the marker must be approved');
});

test('admin transitions', () => {
  const p = normalizePoolSubmission({ name: 'P' }, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW });
  const a = applyPoolAdminAction(p, 'approve', { adminEmail: 'Admin@x.com', now: NOW });
  assert.strictEqual(a.status, 'approved');
  assert.strictEqual(a.approvedBy, 'admin@x.com');
  const c = applyPoolAdminAction(a, 'close', { now: NOW });
  assert.strictEqual(c.status, 'closed');
  assert.ok(c.closedAt);
  assert.strictEqual(applyPoolAdminAction(c, 'approve', { adminEmail: 'admin@x.com', now: NOW }).status, 'approved', 'a closed pool can reopen');
  assert.throws(() => applyPoolAdminAction(a, 'reject', { now: NOW }), (e) => e instanceof PoolError && e.code === 'invalid_state');
  assert.throws(() => applyPoolAdminAction(p, 'close', { now: NOW }), (e) => e.code === 'invalid_state');
  assert.strictEqual(applyPoolAdminAction(p, 'reject', { now: NOW }).status, 'rejected');
  assert.strictEqual(p.status, 'pending', 'pure: input untouched');
});

test('merchant join validates caps, consent and kind; leave removes', () => {
  const pool = approvedPool();
  const j = joined(pool, { perOrderMaxNTD: 500, monthlyMaxNTD: 5000 });
  assert.deepStrictEqual(Object.keys(j.merchants), [shop.id]);
  assert.strictEqual(j.merchants[shop.id].perOrderMaxNTD, 500);
  assert.strictEqual(j.merchants[shop.id].monthlyMaxNTD, 5000);
  assert.ok(j.merchants[shop.id].consentAt);
  const updated = applyMerchantJoin(j, shop, { perOrderMaxNTD: 1000, monthlyMaxNTD: 6000, consent: true, now: new Date('2026-10-05T00:00:00Z') });
  assert.strictEqual(updated.merchants[shop.id].joinedAt, j.merchants[shop.id].joinedAt, 'joinedAt kept on update');
  assert.strictEqual(updated.merchants[shop.id].perOrderMaxNTD, 1000);
  assert.throws(() => applyMerchantJoin(pool, shop, { perOrderMaxNTD: 500, monthlyMaxNTD: 5000, consent: false, now: NOW }), (e) => e.code === 'consent_required');
  assert.throws(() => applyMerchantJoin(pool, shop, { perOrderMaxNTD: MERCHANT_PER_ORDER_MAX_NTD + 1, monthlyMaxNTD: 5000, consent: true }), (e) => e.code === 'caps_invalid');
  assert.throws(() => applyMerchantJoin(pool, shop, { perOrderMaxNTD: 500, monthlyMaxNTD: MERCHANT_MONTHLY_MAX_NTD + 1, consent: true }), (e) => e.code === 'caps_invalid');
  assert.throws(() => applyMerchantJoin(pool, shop, { perOrderMaxNTD: 0, monthlyMaxNTD: 5000, consent: true }), (e) => e.code === 'caps_invalid');
  assert.throws(() => applyMerchantJoin(pool, shop, { perOrderMaxNTD: 12.5, monthlyMaxNTD: 5000, consent: true }), (e) => e.code === 'caps_invalid');
  assert.throws(() => applyMerchantJoin(pool, church, { perOrderMaxNTD: 500, monthlyMaxNTD: 5000, consent: true }), (e) => e.code === 'place_unavailable');
  assert.throws(() => applyMerchantJoin({ ...pool, status: 'closed' }, shop, { perOrderMaxNTD: 500, monthlyMaxNTD: 5000, consent: true }), (e) => e.code === 'pool_unavailable');
  const left = applyMerchantLeave(j, shop.id, { now: NOW });
  assert.deepStrictEqual(left.merchants, {});
  assert.throws(() => applyMerchantLeave(left, shop.id), (e) => e.code === 'merchant_not_in_pool');
});

test('computePoolDiscount: bill, then per_order → monthly → allowance', () => {
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 30, perOrderMaxNTD: 50, monthlyMaxNTD: 120, monthlyUsedNTD: 0, allowanceNTD: 100 }), { ntd: 30, limitedBy: null });
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 80, perOrderMaxNTD: 50, monthlyMaxNTD: 120, monthlyUsedNTD: 0, allowanceNTD: 100 }), { ntd: 50, limitedBy: 'per_order' });
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 80, perOrderMaxNTD: 50, monthlyMaxNTD: 120, monthlyUsedNTD: 100, allowanceNTD: 100 }), { ntd: 20, limitedBy: 'monthly' });
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 80, perOrderMaxNTD: 50, monthlyMaxNTD: 120, monthlyUsedNTD: 0, allowanceNTD: 7 }), { ntd: 7, limitedBy: 'allowance' });
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 80, perOrderMaxNTD: 50, monthlyMaxNTD: 120, monthlyUsedNTD: 120, allowanceNTD: 100 }), { ntd: 0, limitedBy: 'monthly' });
  assert.deepStrictEqual(computePoolDiscount({ billNTD: 8000, perOrderMaxNTD: 2000, monthlyMaxNTD: 6000, monthlyUsedNTD: 0, allowanceNTD: 9000 }), { ntd: 2000, limitedBy: 'per_order' }, 'the report example');
});

test('contribute burns the player\'s points and grows the pool allowance', async () => {
  const r = stubRedis();
  const pool = approvedPool();
  await seed(r, { pool });
  const { contribution, allowanceNTD } = await contribute(r, { pool, email: 'A@x.com', identity, garden, points: 10000, now: NOW, earnedPoints: 200000 });
  assert.strictEqual(allowanceNTD, 10);
  assert.strictEqual(await r.get(spentKey('a@x.com')), '10000', 'burned from the spent ledger');
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '10');
  assert.deepStrictEqual(await poolCounters(r, pool.id), { allowanceNTD: 10, contributedPoints: 10000, contributedNTD: 10, contributions: 1, contributors: 1 });
  assert.strictEqual(contribution.points, 10000);
  assert.strictEqual(contribution.ntd, 10);
  assert.strictEqual(contribution.email, 'a@x.com');
  assert.match(contribution.id, /^ct_/);
  assert.strictEqual((await listContributionsForPool(r, pool.id)).length, 1);
  assert.strictEqual((await listContributionsForEmail(r, 'a@x.com'))[0].poolName, '偏鄉長輩愛筵池');
  assert.strictEqual(await r.get(contribDayKey('a@x.com', pool.id, '2026-10-04')), '10000');
  assert.strictEqual(r.ttl.get(contribDayKey('a@x.com', pool.id, '2026-10-04')), 2 * 86400);
  // the player's balance reflects the burn
  const bal = await readBalance(r, { email: 'a@x.com', identity, garden, now: NOW, earnedPoints: 200000 });
  assert.strictEqual(bal.spentPoints, 10000);
  assert.strictEqual(bal.balancePoints, 100000 - 10000, 'plausible (10 trees × 8000 + 20000) minus spent');
  // second contribution from the same person counts once as a contributor
  await contribute(r, { pool, email: 'a@x.com', identity, garden, points: 1000, now: NOW, earnedPoints: 200000 });
  assert.strictEqual((await poolCounters(r, pool.id)).contributors, 1);
  assert.strictEqual((await poolCounters(r, pool.id)).contributions, 2);
  assert.strictEqual(publicContribution(contribution).who, 'A＊＊');
  assert.ok(!('email' in publicContribution(contribution)));
});

test('contribute rejects bad amounts, closed pools and ineligible players without touching ledgers', async () => {
  const r = stubRedis();
  const pool = approvedPool();
  await seed(r, { pool });
  for (const points of [0, 500, 1500, -1000, 1000.5, CONTRIB_DAILY_MAX_POINTS + CONTRIB_STEP_POINTS, 'abc']) {
    await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity, garden, points, now: NOW, earnedPoints: 200000 }), (e) => e instanceof PoolError && e.code === 'contrib_invalid', `points=${points}`);
  }
  await assert.rejects(contribute(r, { pool: { ...pool, status: 'closed' }, email: 'a@x.com', identity, garden, points: 1000, now: NOW }), (e) => e.code === 'pool_unavailable');
  await assert.rejects(contribute(r, { pool: { ...pool, status: 'pending' }, email: 'a@x.com', identity, garden, points: 1000, now: NOW }), (e) => e.code === 'pool_unavailable');
  await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity: { ...identity, accountAgeDays: 2 }, garden, points: 1000, now: NOW }), (e) => e.code === 'not_eligible' && e.reasons.includes('account_too_new'));
  await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity, garden: { ...garden, passedVerses: 1 }, points: 1000, now: NOW }), (e) => e.code === 'not_eligible' && e.reasons.includes('not_enough_passed'));
  assert.strictEqual(await r.get(spentKey('a@x.com')), null);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), null);
  assert.strictEqual(await r.get(contribDayKey('a@x.com', pool.id, '2026-10-04')), null, 'no day reservation left behind');
});

test('daily cap per player per pool, reservation released, resets on the next Taipei day', async () => {
  const r = stubRedis();
  const pool = approvedPool();
  await seed(r, { earned: 500000, pool });
  const bigGarden = { ...garden, treesPlanted: 100 }; // plausible 820000
  await contribute(r, { pool, email: 'a@x.com', identity, garden: bigGarden, points: 60000, now: NOW, earnedPoints: 500000 });
  await contribute(r, { pool, email: 'a@x.com', identity, garden: bigGarden, points: 40000, now: NOW, earnedPoints: 500000 });
  await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity, garden: bigGarden, points: 1000, now: NOW, earnedPoints: 500000 }), (e) => e.code === 'daily_cap' && e.limit === CONTRIB_DAILY_MAX_POINTS && e.used === 100000);
  assert.strictEqual(await r.get(contribDayKey('a@x.com', pool.id, '2026-10-04')), '100000', 'the failed attempt was not counted');
  assert.strictEqual(await r.get(spentKey('a@x.com')), '100000');
  // another pool has its own cap
  const other = approvedPool({ id: 'cp_other000001', name: '另一個池' });
  await savePool(r, other);
  await contribute(r, { pool: other, email: 'a@x.com', identity, garden: bigGarden, points: 1000, now: NOW, earnedPoints: 500000 });
  // next day
  const tomorrow = new Date('2026-10-04T17:00:00Z'); // 01:00 Taipei on 10/05
  await contribute(r, { pool, email: 'a@x.com', identity, garden: bigGarden, points: 5000, now: tomorrow, earnedPoints: 500000 });
  assert.strictEqual(await r.get(contribDayKey('a@x.com', pool.id, '2026-10-05')), '5000');
});

test('insufficient plausible balance: nothing burned, reservation released', async () => {
  const r = stubRedis();
  const pool = approvedPool();
  await seed(r, { earned: 100000, pool });
  const g = { ...garden, treesPlanted: 0 }; // plausible = min(100000, 0 + 20000) = 20000
  await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity, garden: g, points: 30000, now: NOW, earnedPoints: 100000 }), (e) => e.code === 'insufficient_balance' && e.balancePoints === 20000);
  assert.strictEqual(await r.get(spentKey('a@x.com')), null);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), null);
  assert.strictEqual(await r.get(contribDayKey('a@x.com', pool.id, '2026-10-04')), '0');
  await contribute(r, { pool, email: 'a@x.com', identity, garden: g, points: 20000, now: NOW, earnedPoints: 100000 });
  assert.strictEqual(await r.get(spentKey('a@x.com')), '20000');
  await assert.rejects(contribute(r, { pool, email: 'a@x.com', identity, garden: g, points: 1000, now: NOW, earnedPoints: 100000 }), (e) => e.code === 'insufficient_balance' && e.balancePoints === 0);
});

test('issuePoolVoucher draws from the allowance, stores a kind:pool voucher the shop can verify', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool());
  await seed(r, { pool });
  await fund(r, pool, 100);
  const { voucher } = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'ORG@x.com', identity: orgIdentity, billNTD: 30, now: NOW, rand: () => 0.5 });
  assert.strictEqual(voucher.kind, 'pool');
  assert.strictEqual(voucher.poolId, pool.id);
  assert.strictEqual(voucher.poolName, '偏鄉長輩愛筵池');
  assert.strictEqual(voucher.email, 'org@x.com');
  assert.strictEqual(voucher.ownerCode, 'ORGCODE001');
  assert.strictEqual(voucher.points, 0, 'no player points involved');
  assert.strictEqual(voucher.discountPct, 0);
  assert.strictEqual(voucher.ntd, 30);
  assert.strictEqual(voucher.billNTD, 30);
  assert.strictEqual(voucher.status, 'issued');
  assert.strictEqual(voucher.expiresAt, new Date(NOW.getTime() + VOUCHER_TTL_SEC * 1000).toISOString());
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '70');
  assert.strictEqual(await poolMerchantMonthUsed(r, pool.id, shop.id, NOW), 30);
  assert.strictEqual(r.ttl.get(poolMerchantMonthKey(pool.id, shop.id, taipeiMonth(NOW))), 40 * 86400);
  assert.strictEqual(await r.get(poolOpenKey(pool.id)), voucher.code);
  assert.strictEqual(r.ttl.get(poolOpenKey(pool.id)), VOUCHER_TTL_SEC);
  assert.strictEqual(await r.get(spentKey('org@x.com')), null, 'the organisation\'s own points are untouched');
  assert.strictEqual(await r.get(monthKey('org@x.com', taipeiMonth(NOW))), null);
  assert.ok(await getVoucher(r, voucher.code), 'in the shared voucher table');
  assert.deepStrictEqual(await r.lrange(placeHistoryKey(shop.id), 0, -1), [voucher.code], 'in the shop\'s ledger');
  assert.strictEqual((await listVouchersForPlace(r, shop.id, { now: NOW }))[0].kind, 'pool');
  assert.strictEqual((await listVouchersForPool(r, pool.id, { now: NOW }))[0].computedStatus, 'issued');
  assert.strictEqual(JSON.parse(await r.hget(PLACES_KEY, shop.id)).stats.issued, 1);
  const pub = publicVoucher(voucher, NOW);
  assert.strictEqual(pub.kind, 'pool');
  assert.strictEqual(pub.poolName, '偏鄉長輩愛筵池');
  assert.strictEqual(pub.holder, '偏鄉長輩愛筵池', 'the shop sees which pool settles the remainder');
  assert.ok(!('email' in pub));
  // ordinary vouchers are unchanged
  const ordinary = publicVoucher({ code: 'ABCDEFGH', playerName: 'Alice', status: 'issued', ntd: 5, points: 5000 }, NOW);
  assert.strictEqual(ordinary.kind, 'points');
  assert.strictEqual(ordinary.holder, 'A＊＊');
});

test('one open pool voucher at a time; a used one frees the slot', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool());
  await seed(r, { pool });
  await fund(r, pool, 100);
  const { voucher } = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 30, now: NOW });
  await assert.rejects(issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 30, now: NOW }), (e) => e.code === 'open_voucher_exists' && e.voucher.code === voucher.code);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '70', 'the refused attempt charged nothing');
  const used = await markUsed(r, voucher.code, { now: NOW });
  assert.strictEqual(used.status, 'used');
  assert.strictEqual(await r.get(poolOpenKey(pool.id)), null);
  assert.strictEqual(JSON.parse(await r.hget(PLACES_KEY, shop.id)).stats.usedNTD, 30);
  const second = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 10, now: NOW });
  assert.strictEqual(second.voucher.ntd, 10);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '60');
  const sum = summarizePoolVouchers(await listVouchersForPool(r, pool.id, { now: NOW }));
  assert.deepStrictEqual(sum, { issued: 2, open: 1, used: 1, usedNTD: 30, expired: 0, void: 0 });
});

test('shop caps: per-order, then monthly; allowance cap; too_small names the cap', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool(), { perOrderMaxNTD: 50, monthlyMaxNTD: 120 });
  await seed(r, { pool });
  await fund(r, pool, 100);
  const issue = (bill, now = NOW) => issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: bill, now });
  const a = (await issue(500)).voucher; assert.strictEqual(a.ntd, 50, 'per-order cap'); await markUsed(r, a.code, { now: NOW });
  const b = (await issue(500)).voucher; assert.strictEqual(b.ntd, 50); await markUsed(r, b.code, { now: NOW });
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '0');
  await assert.rejects(issue(500), (e) => e.code === 'too_small' && e.limitedBy === 'allowance', 'pool is empty');
  await fund(r, pool, 100, new Date('2026-10-05T03:00:00Z')); // the contributor's daily cap is per day
  const c = (await issue(500)).voucher; assert.strictEqual(c.ntd, 20, 'monthly cap: 120 − 100'); await markUsed(r, c.code, { now: NOW });
  await assert.rejects(issue(500), (e) => e.code === 'too_small' && e.limitedBy === 'monthly');
  assert.strictEqual(await r.get(poolOpenKey(pool.id)), null, 'no lock left after too_small');
  // next month the shop's cap starts over
  const nextMonth = new Date('2026-11-02T03:00:00Z');
  const d = (await issue(500, nextMonth)).voucher; assert.strictEqual(d.ntd, 50);
  await assert.rejects(issuePoolVoucher(r, { pool, place: church, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 10, now: NOW }), (e) => e.code === 'place_unavailable');
  await assert.rejects(issuePoolVoucher(r, { pool: approvedPool(), place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 10, now: NOW }), (e) => e.code === 'merchant_not_in_pool');
  await assert.rejects(issuePoolVoucher(r, { pool: { ...pool, status: 'closed' }, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 10, now: NOW }), (e) => e.code === 'pool_unavailable');
  await assert.rejects(issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 0, now: NOW }), (e) => e.code === 'bill_invalid');
});

test('expire / void of a pool voucher refund the POOL once, never a person; restore does not re-charge', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool());
  await seed(r, { pool });
  await fund(r, pool, 100);
  const { voucher } = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 30, now: NOW });
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '70');
  // expiry (lazy, via the open-voucher check on the next issue)
  const later = new Date(NOW.getTime() + (VOUCHER_TTL_SEC + 1) * 1000);
  const next = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 10, now: later });
  const expired = await getVoucher(r, voucher.code);
  assert.strictEqual(expired.status, 'expired');
  assert.ok(expired.refundedAt);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '90', '70 + 30 back − 10 new');
  assert.strictEqual(await poolMerchantMonthUsed(r, pool.id, shop.id, NOW), 10);
  assert.strictEqual(await r.get(spentKey('org@x.com')), null);
  assert.strictEqual(await r.get(spentKey('a@x.com')), '100000', 'the contributor\'s burn is final');
  assert.strictEqual(await r.get(refundedKey(voucher.code)), '1');
  await expireVoucher(r, expired, later);
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '90', 'refund latched: a second expire refunds nothing');
  // void a used voucher
  await markUsed(r, next.voucher.code, { now: later });
  const voided = await voidVoucher(r, next.voucher.code, 'admin@x.com', later);
  assert.strictEqual(voided.status, 'void');
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '100');
  assert.strictEqual(await poolMerchantMonthUsed(r, pool.id, shop.id, NOW), 0);
  assert.strictEqual(JSON.parse(await r.hget(PLACES_KEY, shop.id)).stats.usedNTD, 0);
  const restored = await restoreVoucher(r, next.voucher.code, 'admin@x.com', later);
  assert.strictEqual(restored.status, 'used');
  assert.strictEqual(await r.get(poolAllowanceKey(pool.id)), '100', 'restore corrects the record only');
  assert.strictEqual(JSON.parse(await r.hget(PLACES_KEY, shop.id)).stats.usedNTD, 10);
});

test('a pool voucher pays no merchant referral bonus; a player voucher at the same shop still does', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool());
  await seed(r, { pool });
  await fund(r, pool, 20); // leaves Alice plenty of points for her own voucher below
  const { voucher } = await issuePoolVoucher(r, { pool, place: shop, ownerEmail: 'org@x.com', identity: orgIdentity, billNTD: 20, now: NOW });
  await markUsed(r, voucher.code, { now: NOW });
  const settled = await settleReferralBonus(r, { voucher: await getVoucher(r, voucher.code), place: shop, resolveEmail: async () => 'ref@x.com', now: NOW, direction: 'earn' });
  assert.strictEqual(settled.paid, false);
  assert.strictEqual(settled.reason, 'too_small');
  // control: an ordinary voucher issued at the same shop
  const player = await issueVoucher(r, { email: 'a@x.com', identity, garden, place: shop, billNTD: 800, now: NOW, earnedPoints: 200000 });
  assert.strictEqual(player.voucher.kind, undefined);
  await markUsed(r, player.voucher.code, { now: NOW });
  const paid = await settleReferralBonus(r, { voucher: await getVoucher(r, player.voucher.code), place: shop, resolveEmail: async () => 'ref@x.com', now: NOW, direction: 'earn' });
  assert.strictEqual(paid.paid, true);
});

test('views hide emails, owner codes and monthly caps; only approved pools are public', async () => {
  const r = stubRedis();
  const pool = joined(approvedPool(), { perOrderMaxNTD: 500, monthlyMaxNTD: 5000 });
  await seed(r, { pool });
  await fund(r, pool, 20);
  const counters = await poolCounters(r, pool.id);
  const pub = publicPool(pool, counters, { usedNTD: 3 });
  assert.deepStrictEqual(Object.keys(pub).sort(), ['allowanceNTD', 'approvedAt', 'contributedNTD', 'contributedPoints', 'contributions', 'contributors', 'createdAt', 'description', 'id', 'merchants', 'name', 'orgPlaceId', 'orgPlaceName', 'status', 'usedNTD'].sort());
  assert.deepStrictEqual(pub.merchants, [{ placeId: shop.id, placeName: '主愛便當', perOrderMaxNTD: 500 }], 'no monthly cap in public');
  assert.strictEqual(pub.allowanceNTD, 20);
  assert.strictEqual(pub.contributors, 1);
  const pending = { ...approvedPool({ id: 'cp_pending0001' }), status: 'pending' };
  const list = publicPools([pool, pending, null], { [pool.id]: counters });
  assert.strictEqual(list.length, 1);
  const own = ownerPoolView({ ...pool, note: 'secret' }, counters);
  assert.ok(!('note' in own));
  assert.strictEqual(own.ownerEmail, 'org@x.com');
  assert.strictEqual(own.merchants[0].monthlyMaxNTD, 5000);
  assert.strictEqual(findPoolByOrgPlace([pool, pending], church.id), pool);
  assert.strictEqual(findPoolByOrgPlace([{ ...pool, status: 'rejected' }], church.id), null, 'a rejected pool does not block a new one');
  // several activities per marker: pending + approved count, rejected / closed do not
  const second = approvedPool({ id: 'cp_second00001', name: '課輔班文具池' });
  const closed = { ...approvedPool({ id: 'cp_closed00001' }), status: 'closed' };
  const rejected = { ...pending, id: 'cp_rej0000001', status: 'rejected' };
  assert.deepStrictEqual(openPoolsForPlace([pool, second, pending, closed, rejected], church.id).map((p) => p.id), [pool.id, second.id, pending.id]);
  assert.strictEqual(openPoolsForPlace([pool], 'pl_other').length, 0, 'other marker → none');
  assert.strictEqual(MAX_OPEN_POOLS_PER_PLACE, 5);
  assert.strictEqual((await listPools(r))[0].id, pool.id);
  assert.strictEqual((await getPool(r, pool.id)).name, '偏鄉長輩愛筵池');
  assert.strictEqual(await getPool(r, ''), null);
  assert.strictEqual(r.sets.get(poolContributorsKey(pool.id)).size, 1);
  assert.strictEqual((await r.hgetall(poolStatsKey(pool.id))).contributedNTD, '20');
  assert.ok(!JSON.stringify(list).includes('@x.com'), 'no email anywhere in the public list');
  assert.ok(!JSON.stringify(list).includes('ORGCODE001'));
  assert.strictEqual(VOUCHERS_KEY, 'redeem:vouchers');
});
