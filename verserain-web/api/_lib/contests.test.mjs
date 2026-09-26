// node --test api/_lib/*.test.mjs
// Bible reading contests (讀經比賽) against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert';
import {
  CONTEST_ID_RE, MAX_OPEN_CONTESTS_PER_PLACE,
  ContestError, newContestId, normalizeContestSubmission, applyContestAdminAction, contestIsOpen,
  listContests, getContest, saveContest, openContestsForPlace, contestCounters,
  joinContest, acceptChallenge, submitContestScore, contestLeaderboard, contestRank,
  checkContestCompletion, markCompleted,
  publicContest, publicContests, ownerContestView,
  contestJoinKey, contestChallengeKey, contestCompletedKey,
} from './contests.js';

function stubRedis() {
  const hashes = new Map();
  const strings = new Map();
  const sets = new Map();
  const zsets = new Map();
  const ttl = new Map();
  const h = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  const st = (k) => { if (!sets.has(k)) sets.set(k, new Set()); return sets.get(k); };
  const z = (k) => { if (!zsets.has(k)) zsets.set(k, new Map()); return zsets.get(k); };
  const num = (k) => { const v = strings.get(k); return v === undefined ? 0 : Number(v); };
  return {
    async hset(k, obj) { const m = h(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return 1; },
    async hget(k, f) { return h(k).get(f) ?? null; },
    async hgetall(k) { return Object.fromEntries(h(k)); },
    async sadd(k, v) { const s = st(k); if (s.has(v)) return 0; s.add(v); return 1; },
    async scard(k) { return st(k).size; },
    async sismember(k, v) { return st(k).has(v) ? 1 : 0; },
    async set(k, v, opts) {
      if (opts && opts.nx && strings.has(k)) return null;
      strings.set(k, String(v));
      if (opts && opts.ex) ttl.set(k, opts.ex);
      return 'OK';
    },
    async get(k) { return strings.get(k) ?? null; },
    async incr(k) { const n = num(k) + 1; strings.set(k, String(n)); return n; },
    async incrby(k, d) { const n = num(k) + Number(d); strings.set(k, String(n)); return n; },
    async decrby(k, d) { const n = num(k) - Number(d); strings.set(k, String(n)); return n; },
    async expire(k, s) { if (!strings.has(k)) return 0; ttl.set(k, s); return 1; },
    async zincrby(k, delta, member) { const m = z(k); const n = (m.get(member) || 0) + Number(delta); m.set(member, n); return n; },
    async zscore(k, m) { const zz = zsets.get(k); return zz && zz.has(m) ? zz.get(m) : null; },
    async zrevrank(k, member) {
      const zz = zsets.get(k); if (!zz || !zz.has(member)) return null;
      const sorted = [...zz.entries()].sort((a, b) => b[1] - a[1]).map(([mem]) => mem);
      const i = sorted.indexOf(member);
      return i === -1 ? null : i;
    },
    async zrange(k, start, stop, opts = {}) {
      const zz = zsets.get(k) || new Map();
      let entries = [...zz.entries()];
      entries.sort((a, b) => (opts.rev ? b[1] - a[1] : a[1] - b[1]));
      const slice = entries.slice(start, stop === -1 ? undefined : stop + 1);
      if (opts.withScores) return slice.flatMap(([mem, score]) => [mem, score]);
      return slice.map(([mem]) => mem);
    },
  };
}

const NOW = new Date('2026-10-04T03:00:00Z'); // 11:00 Taipei
const identity = { email: 'a@x.com', playerName: 'Alice', personalCode: 'ABCDEFGHJK', accountAgeDays: 30, emailKind: 'real', sessionValid: true };
const garden = { passedVerses: 12, treesPlanted: 10, activeDays: 20 };
const church = { id: 'pl_church0001', kind: 'church', name: '恩典教會', status: 'approved', ownerEmail: 'org@x.com', ownerCode: 'ORGCODE001' };
const VERSES = ['約翰福音 1:1', '約翰福音 3:16', '約翰福音 4:24'];

function draft(extra = {}) {
  return normalizeContestSubmission({
    name: '互惠經濟讀經比賽', setId: 'topic-mutual-economy', setTitle: '主題：互惠經濟', verses: VERSES,
    startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-10T23:59:59Z', rewardDescription: '完成者致贈紀念品',
    ...extra,
  }, { orgPlace: church, ownerEmail: 'org@x.com', ownerCode: 'ORGCODE001', now: NOW });
}
function approvedContest(extra = {}) {
  const c = draft(extra);
  return applyContestAdminAction(c, 'approve', { adminEmail: 'admin@x.com', now: NOW });
}

test('contest ids, normalize and the org-place rule', () => {
  assert.ok(CONTEST_ID_RE.test(newContestId(NOW)));
  const c = draft();
  assert.strictEqual(c.name, '互惠經濟讀經比賽');
  assert.strictEqual(c.status, 'pending');
  assert.strictEqual(c.verses.length, 3);
  assert.strictEqual(c.orgPlaceId, church.id);
  assert.throws(() => normalizeContestSubmission({ name: 'x', setId: 's', verses: VERSES, startsAt: NOW, endsAt: new Date(NOW.getTime() + 1000) }, { orgPlace: { ...church, status: 'pending' }, ownerEmail: 'org@x.com', now: NOW }), /org_place_invalid/);
  assert.throws(() => normalizeContestSubmission({ setId: 's', verses: VERSES, startsAt: NOW, endsAt: new Date(NOW.getTime() + 1000) }, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW }), /name_required/);
  assert.throws(() => normalizeContestSubmission({ name: 'x', verses: VERSES, startsAt: NOW, endsAt: new Date(NOW.getTime() + 1000) }, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW }), /set_required/);
  assert.throws(() => normalizeContestSubmission({ name: 'x', setId: 's', startsAt: NOW, endsAt: new Date(NOW.getTime() + 1000) }, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW }), /verses_required/);
  assert.throws(() => normalizeContestSubmission({ name: 'x', setId: 's', verses: VERSES, startsAt: NOW, endsAt: NOW }, { orgPlace: church, ownerEmail: 'org@x.com', now: NOW }), /ends_after_starts/);
});

test('admin approve/reject/close lifecycle', () => {
  const c = draft();
  const approved = applyContestAdminAction(c, 'approve', { adminEmail: 'admin@x.com', now: NOW });
  assert.strictEqual(approved.status, 'approved');
  assert.throws(() => applyContestAdminAction(approved, 'approve', { now: NOW }), ContestError);
  const closed = applyContestAdminAction(approved, 'close', { now: NOW });
  assert.strictEqual(closed.status, 'closed');
  const reapproved = applyContestAdminAction(closed, 'approve', { now: NOW });
  assert.strictEqual(reapproved.status, 'approved');
  const rejected = applyContestAdminAction(draft(), 'reject', { now: NOW });
  assert.strictEqual(rejected.status, 'rejected');
  assert.throws(() => applyContestAdminAction(rejected, 'close', { now: NOW }), ContestError);
});

test('contestIsOpen: only approved AND inside the date window', () => {
  const c = approvedContest();
  assert.strictEqual(contestIsOpen(c, '2026-10-05T00:00:00Z'), true);
  assert.strictEqual(contestIsOpen(c, '2026-09-30T00:00:00Z'), false);
  assert.strictEqual(contestIsOpen(c, '2026-10-11T00:00:00Z'), false);
  assert.strictEqual(contestIsOpen(draft(), '2026-10-05T00:00:00Z'), false); // pending
});

test('openContestsForPlace and the per-marker cap', async () => {
  const r = stubRedis();
  const contests = [];
  for (let i = 0; i < MAX_OPEN_CONTESTS_PER_PLACE; i++) {
    const c = approvedContest({ seriesId: `series-${i}` });
    c.id = `rc_${i}${'a'.repeat(10)}`;
    await saveContest(r, c);
    contests.push(c);
  }
  const stored = await listContests(r);
  assert.strictEqual(openContestsForPlace(stored, church.id).length, MAX_OPEN_CONTESTS_PER_PLACE);
  assert.strictEqual(openContestsForPlace(stored, 'pl_other').length, 0);
  const closed = applyContestAdminAction(contests[0], 'close', { now: NOW });
  await saveContest(r, closed);
  assert.strictEqual(openContestsForPlace(await listContests(r), church.id).length, MAX_OPEN_CONTESTS_PER_PLACE - 1);
  assert.strictEqual((await getContest(r, contests[1].id)).status, 'approved');
});

test('join requires eligibility and an open contest', async () => {
  const r = stubRedis();
  const c = approvedContest();
  await assert.rejects(() => joinContest(r, { contest: draft(), email: identity.email, identity, garden, now: NOW }), ContestError); // pending, not open
  await assert.rejects(() => joinContest(r, { contest: c, email: identity.email, identity: { ...identity, accountAgeDays: 0 }, garden, now: '2026-10-05T00:00:00Z' }), ContestError); // not eligible
  await joinContest(r, { contest: c, email: identity.email, identity, garden, now: '2026-10-05T00:00:00Z' });
  assert.strictEqual(await r.sismember(contestJoinKey(c.id), identity.email), 1);
});

test('accept_challenge requires having joined first', async () => {
  const r = stubRedis();
  const c = approvedContest();
  await assert.rejects(() => acceptChallenge(r, { contest: c, email: identity.email, identity, now: '2026-10-05T00:00:00Z' }), ContestError);
  await joinContest(r, { contest: c, email: identity.email, identity, garden, now: '2026-10-05T00:00:00Z' });
  await acceptChallenge(r, { contest: c, email: identity.email, identity, now: '2026-10-05T00:00:00Z' });
  assert.strictEqual(await r.sismember(contestChallengeKey(c.id), identity.email), 1);
});

test('score only counts for the right set, an accepted challenger, while open, and accumulates', async () => {
  const r = stubRedis();
  const c = approvedContest();
  await assert.rejects(() => submitContestScore(r, { contest: c, email: identity.email, identity, setId: c.setId, score: 100, now: '2026-10-05T00:00:00Z' }), /challenge_required/);
  await joinContest(r, { contest: c, email: identity.email, identity, garden, now: '2026-10-05T00:00:00Z' });
  await acceptChallenge(r, { contest: c, email: identity.email, identity, now: '2026-10-05T00:00:00Z' });
  await assert.rejects(() => submitContestScore(r, { contest: c, email: identity.email, identity, setId: 'some-other-set', score: 100, now: '2026-10-05T00:00:00Z' }), /set_mismatch/);
  await assert.rejects(() => submitContestScore(r, { contest: c, email: identity.email, identity, setId: c.setId, score: 100, now: '2026-11-01T00:00:00Z' }), /contest_closed/);
  const first = await submitContestScore(r, { contest: c, email: identity.email, identity, setId: c.setId, score: 300, now: '2026-10-05T00:00:00Z' });
  assert.strictEqual(first.total, 300);
  const second = await submitContestScore(r, { contest: c, email: identity.email, identity, setId: c.setId, score: 150, now: '2026-10-06T00:00:00Z' });
  assert.strictEqual(second.total, 450, 'scores accumulate, they are not best-of');
  const { rank, score } = await contestRank(r, c.id, identity.email);
  assert.strictEqual(rank, 1);
  assert.strictEqual(score, 450);
});

test('leaderboard only lists challengers, ranked by cumulative score', async () => {
  const r = stubRedis();
  const c = approvedContest();
  const bob = { ...identity, email: 'b@x.com', playerName: 'Bob' };
  for (const [who, score] of [[identity, 200], [bob, 500]]) {
    await joinContest(r, { contest: c, email: who.email, identity: who, garden, now: '2026-10-05T00:00:00Z' });
    await acceptChallenge(r, { contest: c, email: who.email, identity: who, now: '2026-10-05T00:00:00Z' });
    await submitContestScore(r, { contest: c, email: who.email, identity: who, setId: c.setId, score, now: '2026-10-05T00:00:00Z' });
  }
  const board = await contestLeaderboard(r, c.id);
  assert.strictEqual(board.length, 2);
  assert.strictEqual(board[0].score, 500);
  assert.strictEqual(board[1].score, 200);
  assert.match(board[0].who, /^B/); // maskName keeps the first character
});

test('checkContestCompletion needs every verse at garden stage ≥ 10', () => {
  const c = approvedContest();
  assert.deepStrictEqual(checkContestCompletion(c, {}), { complete: false, passed: 0, total: 3 });
  const partial = { [VERSES[0]]: { stage: 10 }, [VERSES[1]]: { stage: 4 } };
  const r1 = checkContestCompletion(c, partial);
  assert.strictEqual(r1.complete, false);
  assert.strictEqual(r1.passed, 1);
  const full = Object.fromEntries(VERSES.map((v) => [v, { stage: 10 }]));
  const r2 = checkContestCompletion(c, full);
  assert.strictEqual(r2.complete, true);
  assert.strictEqual(r2.passed, 3);
});

test('markCompleted requires having joined and is idempotent', async () => {
  const r = stubRedis();
  const c = approvedContest();
  await assert.rejects(() => markCompleted(r, { contest: c, email: identity.email, identity, now: NOW }), ContestError);
  await joinContest(r, { contest: c, email: identity.email, identity, garden, now: '2026-10-05T00:00:00Z' });
  await markCompleted(r, { contest: c, email: identity.email, identity, now: NOW });
  await markCompleted(r, { contest: c, email: identity.email, identity, now: NOW }); // second claim: no error, stays completed
  assert.strictEqual(await r.sismember(contestCompletedKey(c.id), identity.email), 1);
  const counters = await contestCounters(r, c.id);
  assert.strictEqual(counters.joined, 1);
  assert.strictEqual(counters.completed, 1);
  assert.strictEqual(counters.accepted, 0);
});

test('public views hide owner/admin fields', () => {
  const c = approvedContest();
  const pub = publicContest(c, { joined: 3, accepted: 1, completed: 1 });
  assert.strictEqual(pub.ownerEmail, undefined);
  assert.strictEqual(pub.ownerCode, undefined);
  assert.strictEqual(pub.totalVerses, 3);
  assert.strictEqual(pub.joined, 3);
  const owner = ownerContestView(c, { joined: 0, accepted: 0, completed: 0 });
  assert.strictEqual(owner.ownerEmail, 'org@x.com');
  assert.strictEqual(owner.note, undefined);
  assert.strictEqual(publicContests([c, draft()], {}).length, 1, 'only approved contests are public');
});
