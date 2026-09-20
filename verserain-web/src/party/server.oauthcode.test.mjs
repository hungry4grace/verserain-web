// /oauth-login must bind + return the account's canonical personalCode the
// same way /register and /login do. Before this, a Google user got a
// different referral code on every device (the handler ignored the code and
// returned none), so referral history and fruit points split across buckets.

import assert from 'node:assert';
import Server from './server.js';

const BASE = 'https://x.partykit.dev/parties/main/global-auth-db';

function makeServer(initial = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    map,
    async get(k) { return map.has(k) ? map.get(k) : undefined; },
    async put(k, v) { map.set(k, v); },
    async delete(k) { map.delete(k); },
    async list() { return map; },
  };
  const srv = new Server({ id: 'global-auth-db', storage });
  srv.sendEmail = async () => ({ ok: true });
  // Google verification is network-bound; stub it to a fixed identity.
  srv.verifyGoogleIdToken = async () => ({ sub: 'google-sub-1', email: 'G@X.com', name: 'Gee' });
  return { srv, storage };
}
const req = (p, b) => new Request(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const json = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { __raw: t }; } };
const oauth = (personalCode) => req('/oauth-login', { provider: 'google', idToken: 'tok', personalCode });

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

console.log('oauth-login canonical personalCode:');

await test('first Google sign-in binds the device code and returns it', async () => {
  const { srv, storage } = makeServer();
  const data = await json(await srv.onRequest(oauth('PhoneAAA22')));
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.user.personalCode, 'PhoneAAA22');
  assert.strictEqual(storage.map.get('user:g@x.com').personalCode, 'PhoneAAA22');
});

await test('second device gets the account code, not its own', async () => {
  const { srv, storage } = makeServer();
  await srv.onRequest(oauth('PhoneAAA22'));
  const data = await json(await srv.onRequest(oauth('LaptopBBB2')));
  assert.strictEqual(data.user.personalCode, 'PhoneAAA22', 'laptop must adopt the phone\'s code');
  assert.strictEqual(storage.map.get('user:g@x.com').personalCode, 'PhoneAAA22');
});

await test('legacy OAuth account without a code gets late-bound on next sign-in', async () => {
  const { srv, storage } = makeServer({
    'user:g@x.com': { email: 'g@x.com', password: null, name: 'Gee', verified: true, oauthProvider: 'google', oauthSub: 'google-sub-1' },
  });
  const data = await json(await srv.onRequest(oauth('LegacyCCC2')));
  assert.strictEqual(data.user.personalCode, 'LegacyCCC2');
  assert.strictEqual(storage.map.get('user:g@x.com').personalCode, 'LegacyCCC2');
});

await test('sign-in without a code keeps the binding and still returns it', async () => {
  const { srv } = makeServer({
    'user:g@x.com': { email: 'g@x.com', password: null, name: 'Gee', verified: true, oauthProvider: 'google', oauthSub: 'google-sub-1', personalCode: 'KeepThis22' },
  });
  const data = await json(await srv.onRequest(oauth(undefined)));
  assert.strictEqual(data.user.personalCode, 'KeepThis22');
});

await test('an account that also has a password login shares the same code', async () => {
  const { srv } = makeServer();
  await srv.onRequest(req('/register', { email: 'g@x.com', password: 'pw', nickname: 'Gee', personalCode: 'RegAAA2222' }));
  const data = await json(await srv.onRequest(oauth('PhoneAAA22')));
  assert.strictEqual(data.user.personalCode, 'RegAAA2222', 'OAuth on a password account adopts the existing code');
});


console.log('\n/sync-code on start-up:');

await test('restored session adopts the account code without logging in again', async () => {
  const { srv } = makeServer({
    'user:g@x.com': { email: 'g@x.com', password: null, name: 'Gee', verified: true, oauthProvider: 'google', oauthSub: 'google-sub-1', personalCode: 'PhoneAAA22' },
  });
  const data = await json(await srv.onRequest(req('/sync-code', { email: 'G@X.com', personalCode: 'LaptopBBB2' })));
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.personalCode, 'PhoneAAA22', 'laptop must be told the phone\'s code');
});

await test('account without a code takes the first device\'s code', async () => {
  const { srv, storage } = makeServer({
    'user:g@x.com': { email: 'g@x.com', password: null, name: 'Gee', verified: true, oauthProvider: 'google', oauthSub: 'google-sub-1' },
  });
  const first = await json(await srv.onRequest(req('/sync-code', { email: 'g@x.com', personalCode: 'LaptopBBB2' })));
  assert.strictEqual(first.personalCode, 'LaptopBBB2');
  assert.strictEqual(storage.map.get('user:g@x.com').personalCode, 'LaptopBBB2');
  const second = await json(await srv.onRequest(req('/sync-code', { email: 'g@x.com', personalCode: 'PhoneAAA22' })));
  assert.strictEqual(second.personalCode, 'LaptopBBB2', 'second device adopts, never overwrites');
});

await test('sync without a device code returns whatever is bound (or null) and stores nothing', async () => {
  const { srv, storage } = makeServer({
    'user:g@x.com': { email: 'g@x.com', password: null, name: 'Gee', verified: true },
  });
  const data = await json(await srv.onRequest(req('/sync-code', { email: 'g@x.com' })));
  assert.strictEqual(data.personalCode, null);
  assert.strictEqual(storage.map.get('user:g@x.com').personalCode, undefined);
});

await test('unknown email → 404, missing email → 400', async () => {
  const { srv } = makeServer();
  assert.strictEqual((await srv.onRequest(req('/sync-code', { email: 'nobody@x.com', personalCode: 'X' }))).status, 404);
  assert.strictEqual((await srv.onRequest(req('/sync-code', { personalCode: 'X' }))).status, 400);
});

console.log(`\n${passed} passed${process.exitCode ? ' (with failures)' : ''}`);
