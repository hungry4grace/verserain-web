// node --test api/_lib/*.test.mjs
// Exercises the shipped ledger logic against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert';
import { createReward, grantMilestones, flagsFor, recordQualifiedReferral, milestonesKey, LEDGER_KEY, VERSES_PER_REWARD, INVITES_PER_REWARD } from './rewards.js';

function stubRedis() {
  const hashes = new Map();
  const sets = new Map();
  const lists = new Map();
  const strings = new Map();
  const h = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  const s = (k) => { if (!sets.has(k)) sets.set(k, new Set()); return sets.get(k); };
  return {
    hashes, sets, lists, strings,
    async hsetnx(k, f, v) { const m = h(k); if (m.has(f)) return 0; m.set(f, v); return 1; },
    async hset(k, obj) { const m = h(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return 1; },
    async hget(k, f) { return h(k).get(f) ?? null; },
    async hgetall(k) { return Object.fromEntries(h(k)); },
    async sadd(k, v) { const set = s(k); if (set.has(v)) return 0; set.add(v); return 1; },
    async scard(k) { return s(k).size; },
    async lpush(k, v) { const l = lists.get(k) || []; l.unshift(v); lists.set(k, l); return l.length; },
    async ltrim(k, a, b) { const l = lists.get(k) || []; lists.set(k, l.slice(a, b + 1)); return 'OK'; },
    async set(k, v, opts) { if (opts && opts.nx && strings.has(k)) return null; strings.set(k, v); return 'OK'; },
    async get(k) { return strings.get(k) ?? null; },
  };
}

test('createReward is idempotent per (code, kind, milestone)', async () => {
  const r = stubRedis();
  const a = await createReward(r, { code: 'ABCDEFGHJK', name: 'A', email: 'a@x.com', kind: 'verses', milestone: 100 });
  const b = await createReward(r, { code: 'ABCDEFGHJK', name: 'A', email: 'a@x.com', kind: 'verses', milestone: 100 });
  assert.strictEqual(a.created, true);
  assert.strictEqual(b.created, false);
  assert.strictEqual(r.hashes.get(LEDGER_KEY).size, 1);
  assert.strictEqual((r.lists.get('gamification:notify:ABCDEFGHJK') || []).length, 1, 'one inbox item, not two');
});

test('createReward stores the verification snapshot', async () => {
  const r = stubRedis();
  const { reward } = await createReward(r, { code: 'ABCDEFGHJK', email: 'a@x.com', kind: 'verses', milestone: 100, verified: { passedVerses: 123, activeDays: 20, accountAgeDays: 90, emailKind: 'real' } });
  assert.strictEqual(reward.verified.passedVerses, 123);
  assert.ok(reward.verified.checkedAt);
  assert.strictEqual(reward.status, 'pending');
});

test('grantMilestones mints every milestone reached, once per email', async () => {
  const r = stubRedis();
  const first = await grantMilestones(r, { code: 'ABCDEFGHJK', name: 'A', email: 'A@x.com', kind: 'verses', count: 250, verified: { passedVerses: 250 } });
  assert.deepStrictEqual(first.created.map(x => x.milestone), [100, 200]);
  // Same person from another device (new code): nothing new.
  const again = await grantMilestones(r, { code: 'ZZZZZZZZZZ', name: 'A', email: 'a@x.com', kind: 'verses', count: 260 });
  assert.deepStrictEqual(again.created, []);
  // Reaching 300 later mints exactly the 300 reward.
  const later = await grantMilestones(r, { code: 'ZZZZZZZZZZ', name: 'A', email: 'a@x.com', kind: 'verses', count: 300 });
  assert.deepStrictEqual(later.created.map(x => x.milestone), [300]);
  assert.strictEqual(r.sets.get(milestonesKey('verses', 'a@x.com')).size, 3);
});

test('grantMilestones needs an email and a count', async () => {
  const r = stubRedis();
  assert.deepStrictEqual((await grantMilestones(r, { code: 'ABCDEFGHJK', email: '', kind: 'verses', count: 500 })).created, []);
  assert.deepStrictEqual((await grantMilestones(r, { code: 'ABCDEFGHJK', email: 'a@x.com', kind: 'verses', count: NaN })).created, []);
  assert.deepStrictEqual((await grantMilestones(r, { code: 'ABCDEFGHJK', email: 'a@x.com', kind: 'verses', count: VERSES_PER_REWARD - 1 })).created, []);
  assert.strictEqual((await grantMilestones(r, { code: 'ABCDEFGHJK', email: 'a@x.com', kind: 'invites', count: INVITES_PER_REWARD })).created.length, 1);
});

test('flagsFor marks thin or suspicious snapshots, and legacy rows', () => {
  assert.deepStrictEqual(flagsFor({ kind: 'verses' }), ['unverified']);
  assert.deepStrictEqual(flagsFor({ kind: 'verses', verified: { activeDays: 30, accountAgeDays: 100, emailKind: 'real' } }), []);
  assert.deepStrictEqual(flagsFor({ kind: 'verses', verified: { activeDays: 2, accountAgeDays: 3, emailKind: 'privaterelay' } }), ['low_active_days', 'young_account', 'privaterelay_email']);
  assert.deepStrictEqual(flagsFor({ kind: 'invites', verified: { activeDays: 30, accountAgeDays: 100, emailKind: 'real', sameDayClusters: 5 } }), ['referee_cluster']);
  assert.deepStrictEqual(flagsFor({ kind: 'verses', verified: { activeDays: 30, accountAgeDays: 100, emailKind: 'real', sameDayClusters: 5 } }), [], 'cluster flag is invites-only');
});

test('recordQualifiedReferral counts a person once and never awards', async () => {
  const r = stubRedis();
  const a = await recordQualifiedReferral(r, { inviterCode: 'ABCDEFGHJK', refereeCode: 'BBBBBBBBBB', refereeEmail: 'b@x.com' });
  const dup = await recordQualifiedReferral(r, { inviterCode: 'ABCDEFGHJK', refereeCode: 'CCCCCCCCCC', refereeEmail: 'B@x.com' });
  assert.strictEqual(a.count, 1);
  assert.strictEqual(dup.duplicate, true);
  for (let i = 0; i < 12; i++) await recordQualifiedReferral(r, { inviterCode: 'ABCDEFGHJK', refereeCode: `C${i}`, refereeEmail: `c${i}@x.com` });
  assert.strictEqual((r.hashes.get(LEDGER_KEY) || new Map()).size, 0, 'no reward minted from the dashboard count');
  const self = await recordQualifiedReferral(r, { inviterCode: 'ABCDEFGHJK', refereeCode: 'ABCDEFGHJK', refereeEmail: '' });
  assert.strictEqual(self.count, 0);
});
