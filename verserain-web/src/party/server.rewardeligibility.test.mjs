// Faithful tests against the REAL Server class: drives onRequest() for the
// /reward-eligibility route (sponsored rewards) and the export gate.
// node --test src/party/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import Server, { summarizeGardenForRewards, REWARD_QUALIFIED_PASSES } from './server.js';

const BASE = 'https://x.partykit.dev/parties/main/global-auth-db';

// Mimics PartyKit storage.list({ prefix, limit, startAfter }) — the route
// pages through users, so the stub must honour paging or it loops forever.
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    async get(k) { return map.has(k) ? map.get(k) : undefined; },
    async put(k, v) { map.set(k, v); },
    async delete(k) { map.delete(k); },
    async list(opts = {}) {
      const keys = Array.from(map.keys()).sort();
      let out = keys.filter(k => !opts.prefix || k.startsWith(opts.prefix));
      if (opts.startAfter) out = out.filter(k => k > opts.startAfter);
      if (opts.limit) out = out.slice(0, opts.limit);
      return new Map(out.map(k => [k, map.get(k)]));
    },
  };
}

function makeServer(initial = {}, env = { ADMIN_TOKEN: 'test-token' }) {
  const storage = makeStorage(initial);
  const srv = new Server({ id: 'global-auth-db', storage, env });
  srv.sendEmail = async () => ({ ok: true });
  return { srv, storage };
}

function req(path, body, { method = 'POST', token = 'test-token', headers = {} } = {}) {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const json = async (res) => { const t = await res.text(); try { return JSON.parse(t); } catch { return { __raw: t }; } };

const tree = (stage, fruits = 0, gridIndex = 0) => ({ gridIndex, stage, fruits, setId: null });
const dayAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

test('summarizeGardenForRewards counts passed trees after dedupe and fixture drop', () => {
  const gd = {
    'John 3:16': tree(10, 2, 0),
    'john  3:16': tree(10, 0, 1),       // duplicate spelling → folded
    'Psalm 23:1': tree(10, 0, 2),
    'Romans 8:28': tree(4, 0, 3),
    'FakeVerse 1': tree(10, 0, 4),      // test fixture → dropped
    '   ': tree(10, 0, 5),              // blank ref → ignored
    _activity: { '2026-09-01': 100, '2026-09-20': 500, '2020-01-01': 0 },
  };
  const s = summarizeGardenForRewards(gd, Date.parse('2026-09-22T00:00:00Z'));
  assert.strictEqual(s.passedVerses, 2);
  assert.strictEqual(s.treesPlanted, 3);
  assert.strictEqual(s.activeDays, 2, 'zero-point days do not count');
  assert.strictEqual(s.activityPoints, 600, 'lifetime score = sum of the activity log');
  assert.strictEqual(s.activeDays30, 2);
  assert.strictEqual(s.firstActiveDay, '2026-09-01');
  assert.deepStrictEqual(summarizeGardenForRewards(null).passedVerses, 0);
});

test('/reward-eligibility rejects callers without the admin token', async () => {
  const { srv } = makeServer();
  const res = await srv.onRequest(req('/reward-eligibility', { email: 'a@x.com' }, { token: '' }));
  assert.strictEqual(res.status, 401);
  const bad = await srv.onRequest(req('/reward-eligibility', { email: 'a@x.com' }, { token: 'nope' }));
  assert.strictEqual(bad.status, 401);
});

test('/reward-eligibility returns verified garden counts for the account', async () => {
  const garden = { 'A 1:1': tree(10), 'A 1:2': tree(10, 0, 1), 'A 1:3': tree(9, 0, 2), _activity: { '2026-09-10': 100 } };
  const { srv } = makeServer({
    'user:amy@x.com': { email: 'amy@x.com', name: 'Amy', personalCode: 'AAAAAAAAAA', createdAt: dayAgo(40), verified: true },
    'garden:Amy': garden,
  });
  const d = await json(await srv.onRequest(req('/reward-eligibility', { email: 'Amy@X.com' })));
  assert.strictEqual(d.success, true);
  assert.strictEqual(d.identity.found, true);
  assert.strictEqual(d.identity.playerName, 'Amy');
  assert.strictEqual(d.identity.emailKind, 'real');
  assert.strictEqual(d.identity.accountAgeDays, 40);
  assert.strictEqual(d.garden.passedVerses, 2);
  assert.strictEqual(d.garden.treesPlanted, 3);
  assert.strictEqual(d.referrals, undefined, 'no inviter codes → no referral scan');
});

test('/reward-eligibility falls back to the garden first active day when createdAt is missing', async () => {
  const garden = { 'A 1:1': tree(10), _activity: { [dayAgo(40).slice(0, 10)]: 50, [dayAgo(2).slice(0, 10)]: 80 } };
  const { srv } = makeServer({
    'user:old@x.com': { email: 'old@x.com', name: 'Old', personalCode: 'BBBBBBBBBB', verified: true },
    'garden:Old': garden,
  });
  const d = await json(await srv.onRequest(req('/reward-eligibility', { email: 'old@x.com' })));
  assert.strictEqual(d.identity.createdAt, null);
  assert.strictEqual(d.identity.accountAgeSource, 'firstActiveDay');
  assert.ok(d.identity.accountAgeDays >= 39 && d.identity.accountAgeDays <= 41, `got ${d.identity.accountAgeDays}`);
  const noGarden = await json(await srv.onRequest(req('/reward-eligibility', { email: 'ghost2@x.com' })));
  assert.strictEqual(noGarden.identity.accountAgeDays, null, 'unknown account with no garden stays null');
});

test('/reward-eligibility flags private-relay emails and unknown accounts', async () => {
  const { srv } = makeServer({ 'user:line_123@privaterelay.verserain.com': { email: 'line_123@privaterelay.verserain.com', name: 'L', createdAt: dayAgo(1) } });
  const d = await json(await srv.onRequest(req('/reward-eligibility', { email: 'line_123@privaterelay.verserain.com' })));
  assert.strictEqual(d.identity.emailKind, 'privaterelay');
  const u = await json(await srv.onRequest(req('/reward-eligibility', { email: 'ghost@x.com', playerName: 'Ghost' })));
  assert.strictEqual(u.identity.found, false);
  assert.strictEqual(u.garden.passedVerses, 0);
});

test('/reward-eligibility counts only referees bound to the codes, qualified by passes', async () => {
  const passedN = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`B ${i + 1}:1`, tree(10, 0, i)]));
  const users = {};
  // 60 accounts so paging (PAGE=50) is exercised.
  for (let i = 0; i < 60; i++) {
    users[`user:u${i}@x.com`] = { email: `u${i}@x.com`, name: `U${i}`, personalCode: `U${String(i).padStart(9, '2')}`, invitedBy: i < 12 ? 'HSTHSTAAAA' : 'SMNELSEAAA', createdAt: i < 5 ? '2026-09-01T10:00:00Z' : dayAgo(30 + i) };
  }
  const gardens = {};
  for (let i = 0; i < 12; i++) gardens[`garden:U${i}`] = passedN(i < 7 ? REWARD_QUALIFIED_PASSES : REWARD_QUALIFIED_PASSES - 1);
  const { srv } = makeServer({
    ...users, ...gardens,
    'user:host@x.com': { email: 'host@x.com', name: 'Host', personalCode: 'HSTHSTAAAA', createdAt: dayAgo(200) },
    'garden:Host': passedN(150),
  });
  const d = await json(await srv.onRequest(req('/reward-eligibility', { email: 'host@x.com', inviterCodes: ['HSTHSTAAAA', 'not-a-code'] })));
  assert.strictEqual(d.garden.passedVerses, 150);
  assert.strictEqual(d.referrals.total, 12);
  assert.strictEqual(d.referrals.qualified, 7);
  assert.strictEqual(d.referrals.qualifiedPasses, REWARD_QUALIFIED_PASSES);
  assert.strictEqual(d.referrals.sameDayClusters, 5, 'five referees registered on the same day');
  assert.ok(d.referrals.list.every(r => !('email' in r)), 'referee emails are never returned');
});

test('export routes accept the admin token or EXPORT_SECRET, never the old literal', async () => {
  const { srv } = makeServer({}, { ADMIN_TOKEN: 'test-token', EXPORT_SECRET: 'env-secret' });
  assert.strictEqual((await srv.onRequest(req('/export-users?secret=vrain_export_2026', undefined, { method: 'GET', token: '' }))).status, 401);
  assert.strictEqual((await srv.onRequest(req('/export-users?secret=env-secret', undefined, { method: 'GET', token: '' }))).status, 200);
  assert.strictEqual((await srv.onRequest(req('/export-users', undefined, { method: 'GET' }))).status, 200);
  const noSecret = makeServer({}, { ADMIN_TOKEN: 'test-token' }).srv;
  assert.strictEqual((await noSecret.onRequest(req('/dau-stats?secret=', undefined, { method: 'GET', token: '' }))).status, 401);
});
