// A published set belongs to the account (ownerEmail), not to the display name
// it was published under. Renaming must carry 「作者」 to the new name, earlier
// names can be claimed after the fact, and the owner (never anyone else) may
// change the author name when re-publishing.

import assert from 'node:assert';
import Server, { rememberName } from './server.js';

const BASE = 'https://x.partykit.dev/parties/main/global-auth-db';

function makeServer(initial = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    map,
    async get(k) { return map.has(k) ? map.get(k) : undefined; },
    async put(k, v) { map.set(k, v); },
    async delete(k) { map.delete(k); },
    async list({ prefix = '' } = {}) {
      return new Map(Array.from(map.entries()).filter(([k]) => k.startsWith(prefix)));
    },
  };
  const srv = new Server({ id: 'global-auth-db', storage, env: {} });
  srv.sendEmail = async () => ({ ok: true });
  return { srv, storage };
}
const req = (p, b, method = 'POST') => new Request(`${BASE}${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const json = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { __raw: t }; } };

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

const ME = 'hungry4grace@gmail.com';
const google = (name, extra = {}) => ({ email: ME, password: null, name, verified: true, oauthProvider: 'google', oauthSub: 'sub-1', ...extra });
const sets = () => ({
  'verseset:s-bound': { id: 's-bound', title: 'Bound', authorName: 'hungry@G', ownerEmail: ME, lastEditorName: 'hungry@G', verses: [] },
  'verseset:s-legacy': { id: 's-legacy', title: 'Legacy', authorName: 'hungry@G', verses: [] },          // published before ownerEmail existed
  'verseset:s-other': { id: 's-other', title: 'Other', authorName: 'Bene', ownerEmail: 'bene@x.com', verses: [] },
  'verseset:s-other-legacy': { id: 's-other-legacy', title: 'OtherLegacy', authorName: 'Amy', verses: [] },
});

console.log('rememberName:');
await test('dedupes case-insensitively, newest last, capped at 20', () => {
  assert.deepStrictEqual(rememberName(undefined, 'hungry@G'), ['hungry@G']);
  assert.deepStrictEqual(rememberName(['hungry@G', 'Old'], 'HUNGRY@g'), ['Old', 'HUNGRY@g']);
  assert.deepStrictEqual(rememberName(['a'], '  '), ['a']);
  assert.strictEqual(rememberName(Array.from({ length: 25 }, (_, i) => `n${i}`), 'z').length, 20);
});

console.log('\nupdate-profile rename re-tags the account\'s published sets:');
await test('bound + legacy sets under the old name get the new name and the email; others untouched', async () => {
  const { srv, storage } = makeServer({ [`user:${ME}`]: google('hungry@G'), ...sets() });
  const data = await json(await srv.onRequest(req('/update-profile', { email: ME, authProvider: 'google', newName: '瑞爸' })));
  assert.strictEqual(data.success, true);
  const bound = storage.map.get('verseset:s-bound');
  assert.strictEqual(bound.authorName, '瑞爸');
  assert.strictEqual(bound.lastEditorName, '瑞爸', 'last editor was the old name → follows too');
  const legacy = storage.map.get('verseset:s-legacy');
  assert.strictEqual(legacy.authorName, '瑞爸');
  assert.strictEqual(legacy.ownerEmail, ME, 'legacy set is bound to the account now');
  assert.strictEqual(storage.map.get('verseset:s-other').authorName, 'Bene');
  assert.strictEqual(storage.map.get('verseset:s-other-legacy').authorName, 'Amy');
  assert.deepStrictEqual(storage.map.get(`user:${ME}`).previousNames, ['hungry@G']);
});

await test('a second rename keeps following (previousNames accumulate)', async () => {
  const { srv, storage } = makeServer({ [`user:${ME}`]: google('hungry@G'), ...sets() });
  await srv.onRequest(req('/update-profile', { email: ME, authProvider: 'google', newName: '瑞爸' }));
  await srv.onRequest(req('/update-profile', { email: ME, authProvider: 'google', newName: '瑞爸二號' }));
  assert.strictEqual(storage.map.get('verseset:s-bound').authorName, '瑞爸二號');
  assert.strictEqual(storage.map.get('verseset:s-legacy').authorName, '瑞爸二號');
  assert.deepStrictEqual(storage.map.get(`user:${ME}`).previousNames, ['hungry@G', '瑞爸']);
});

console.log('\n/sets/claim-author (rename happened before this existed):');
await test('claims sets authored under an earlier name (case-insensitive) and remembers the name', async () => {
  const { srv, storage } = makeServer({ [`user:${ME}`]: google('瑞爸'), ...sets() });
  const data = await json(await srv.onRequest(req('/sets/claim-author', { email: ME, names: ['Hungry@G', '瑞爸'] })));
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.changed, 2, 'bound + legacy');
  assert.deepStrictEqual(data.accepted, ['Hungry@G'], 'the current name is not a claim');
  assert.strictEqual(storage.map.get('verseset:s-bound').authorName, '瑞爸');
  assert.strictEqual(storage.map.get('verseset:s-legacy').ownerEmail, ME);
  assert.strictEqual(storage.map.get('verseset:s-other-legacy').authorName, 'Amy');
  assert.deepStrictEqual(storage.map.get(`user:${ME}`).previousNames, ['Hungry@G']);
  const again = await json(await srv.onRequest(req('/sets/claim-author', { email: ME, names: ['Hungry@G'] })));
  assert.strictEqual(again.changed, 0, 'idempotent');
});

await test('refuses a name another account currently uses; never takes a set bound to another email', async () => {
  const { srv, storage } = makeServer({
    [`user:${ME}`]: google('瑞爸'),
    'user:amy@x.com': { email: 'amy@x.com', name: 'Amy', password: 'x' },
    ...sets(),
  });
  const data = await json(await srv.onRequest(req('/sets/claim-author', { email: ME, names: ['Amy', 'Bene'] })));
  assert.deepStrictEqual(data.rejected, ['Amy'], 'Amy is someone else\'s current name');
  assert.strictEqual(storage.map.get('verseset:s-other-legacy').authorName, 'Amy');
  assert.strictEqual(storage.map.get('verseset:s-other').ownerEmail, 'bene@x.com', 'bound to bene → untouched even though "Bene" was accepted');
  assert.strictEqual(storage.map.get('verseset:s-other').authorName, 'Bene');
});

await test('unknown account → 404; missing email → 400', async () => {
  const { srv } = makeServer();
  assert.strictEqual((await srv.onRequest(req('/sets/claim-author', { email: 'nobody@x.com', names: ['a'] }))).status, 404);
  assert.strictEqual((await srv.onRequest(req('/sets/claim-author', { names: ['a'] }))).status, 400);
});

console.log('\n/custom-sets publish: the owner sets 「作者」, nobody else does:');
await test('owner re-publishing under a new name updates the author', async () => {
  const { srv, storage } = makeServer({ [`user:${ME}`]: google('瑞爸'), ...sets() });
  const res = await srv.onRequest(req('/custom-sets', { id: 's-bound', title: 'Bound', authorName: '瑞爸', verses: [], adminEmail: 'other@x.com' }));
  // other@x.com is not the owner → 403, author untouched
  assert.strictEqual(res.status, 403);
  const ok = await srv.onRequest(req('/custom-sets', { id: 's-bound', title: 'Bound', authorName: '瑞爸', verses: [], adminEmail: ME }));
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(storage.map.get('verseset:s-bound').authorName, '瑞爸');
  assert.strictEqual(storage.map.get('verseset:s-bound').ownerEmail, ME);
});

await test('an admin editing someone else\'s set keeps its author', async () => {
  const { srv, storage } = makeServer({ ...sets() });
  const res = await srv.onRequest(req('/custom-sets', { id: 's-other', title: 'Other (admin edit)', authorName: 'samhsiung', verses: [], adminEmail: 'samhsiung@gmail.com' }));
  assert.strictEqual(res.status, 200);
  const set = storage.map.get('verseset:s-other');
  assert.strictEqual(set.authorName, 'Bene');
  assert.strictEqual(set.ownerEmail, 'bene@x.com');
  assert.strictEqual(set.title, 'Other (admin edit)');
});

await test('a legacy set authored under one of my earlier names is mine to update, and gets bound', async () => {
  const { srv, storage } = makeServer({ [`user:${ME}`]: google('瑞爸', { previousNames: ['hungry@G'] }), ...sets() });
  const res = await srv.onRequest(req('/custom-sets', { id: 's-legacy', title: 'Legacy v2', authorName: '瑞爸', verses: [], adminEmail: ME }));
  assert.strictEqual(res.status, 200);
  const set = storage.map.get('verseset:s-legacy');
  assert.strictEqual(set.authorName, '瑞爸');
  assert.strictEqual(set.ownerEmail, ME);
  // a stranger still cannot touch a legacy set
  const no = await srv.onRequest(req('/custom-sets', { id: 's-other-legacy', title: 'x', authorName: 'Eve', verses: [], adminEmail: 'eve@x.com' }));
  assert.strictEqual(no.status, 403);
});

console.log(`\n${passed} assertions passed.`);
