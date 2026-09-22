// Personal codes are per account: two accounts on one device never share one.
// node --test src/party/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import Server, { claimPersonalCode, deviceCodeTaken, personalCodeOwner } from './server.js';

const BASE = 'https://x.partykit.dev/parties/main/global-auth-db';
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
const req = (path, body, { token = '', method = 'POST' } = {}) => new Request(`${BASE}${path}`, {
  method, headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
});
const json = async (r) => JSON.parse(await r.text());
const CODE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;

test('claimPersonalCode keeps an unowned device code and mints a fresh one when another account owns it', async () => {
  const { srv } = makeServer({ 'user:a@x.com': { email: 'a@x.com', name: 'A', personalCode: 'DEVCEAAAAA' } });
  assert.strictEqual(await personalCodeOwner(srv, 'DEVCEAAAAA'), 'a@x.com');
  assert.strictEqual(await personalCodeOwner(srv, 'DEVCEAAAAA', 'a@x.com'), null, 'the owner itself is not "someone else"');
  assert.strictEqual(await claimPersonalCode(srv, 'a@x.com', 'DEVCEAAAAA'), 'DEVCEAAAAA', 'the owner keeps it');
  const fresh = await claimPersonalCode(srv, 'b@x.com', 'DEVCEAAAAA');
  assert.notStrictEqual(fresh, 'DEVCEAAAAA');
  assert.ok(CODE.test(fresh));
  assert.strictEqual(await claimPersonalCode(srv, 'c@x.com', 'FREECDEE22'), 'FREECDEE22', 'an unowned code is adopted');
  assert.strictEqual(await claimPersonalCode(srv, 'd@x.com', 'legacy-odd-code'), 'legacy-odd-code', 'an odd but unowned legacy code is kept');
  assert.strictEqual(await deviceCodeTaken(srv, 'b@x.com', 'DEVCEAAAAA', fresh), true);
  assert.strictEqual(await deviceCodeTaken(srv, 'a@x.com', 'DEVCEAAAAA', 'DEVCEAAAAA'), false);
});

test('/sync-code gives the second account on a shared device its own code and flags the device code as taken', async () => {
  const { srv, storage } = makeServer({
    'user:first@x.com': { email: 'first@x.com', name: 'First', personalCode: 'SHAREDCDEE' },
    'user:second@x.com': { email: 'second@x.com', name: 'Second' },
  });
  const d = await json(await srv.onRequest(req('/sync-code', { email: 'second@x.com', personalCode: 'SHAREDCDEE' })));
  assert.strictEqual(d.success, true);
  assert.notStrictEqual(d.personalCode, 'SHAREDCDEE');
  assert.strictEqual(d.deviceCodeTaken, true);
  assert.strictEqual(storage.map.get('user:second@x.com').personalCode, d.personalCode);
  assert.strictEqual(storage.map.get('user:first@x.com').personalCode, 'SHAREDCDEE', 'the first account is untouched');
  const again = await json(await srv.onRequest(req('/sync-code', { email: 'first@x.com', personalCode: 'SHAREDCDEE' })));
  assert.strictEqual(again.personalCode, 'SHAREDCDEE');
  assert.strictEqual(again.deviceCodeTaken, false);
});

test('/rebind-personal-code is admin-only and never hands out a code another account owns', async () => {
  const { srv, storage } = makeServer({
    'user:a@x.com': { email: 'a@x.com', name: 'A', personalCode: 'SHAREDCDEE' },
    'user:b@x.com': { email: 'b@x.com', name: 'B', personalCode: 'SHAREDCDEE' },
  });
  assert.strictEqual((await srv.onRequest(req('/rebind-personal-code', { email: 'b@x.com' }))).status, 401);
  const clash = await srv.onRequest(req('/rebind-personal-code', { email: 'b@x.com', code: 'SHAREDCDEE' }, { token: 'test-token' }));
  assert.strictEqual(clash.status, 409);
  const d = await json(await srv.onRequest(req('/rebind-personal-code', { email: 'b@x.com' }, { token: 'test-token' })));
  assert.strictEqual(d.previous, 'SHAREDCDEE');
  assert.ok(CODE.test(d.personalCode) && d.personalCode !== 'SHAREDCDEE');
  assert.strictEqual(storage.map.get('user:b@x.com').personalCode, d.personalCode);
  assert.strictEqual(storage.map.get('user:a@x.com').personalCode, 'SHAREDCDEE');
  assert.strictEqual((await srv.onRequest(req('/rebind-personal-code', { email: 'nobody@x.com' }, { token: 'test-token' }))).status, 404);
});

test('/rebind-personal-code and /sync-code find LINE/Apple accounts keyed by a mixed-case synthetic email', async () => {
  const key = 'user:line_UABC123@privaterelay.verserain.com';
  const { srv, storage } = makeServer({ [key]: { email: 'line_UABC123@privaterelay.verserain.com', name: 'L', personalCode: 'SHAREDCDEE' } });
  const d = await json(await srv.onRequest(req('/rebind-personal-code', { email: 'line_UABC123@privaterelay.verserain.com' }, { token: 'test-token' })));
  assert.strictEqual(d.success, true);
  assert.strictEqual(storage.map.get(key).personalCode, d.personalCode);
  assert.strictEqual(storage.map.has(key.toLowerCase()), false, 'no duplicate lowercase record is created');
  const sc = await json(await srv.onRequest(req('/sync-code', { email: 'line_UABC123@privaterelay.verserain.com', personalCode: 'XYZXYZXYZ2' })));
  assert.strictEqual(sc.personalCode, d.personalCode);
});
