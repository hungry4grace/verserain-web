// Session keys: logins mint one, /reward-eligibility validates it, and
// map-place photo uploads require it.  node --test src/party/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import Server, { issueSessionKey, sessionValidFor, MAX_SESSION_KEYS } from './server.js';

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

test('issueSessionKey keeps the last five keys and sessionValidFor recognises them', () => {
  const user = { email: 'a@x.com' };
  const keys = Array.from({ length: MAX_SESSION_KEYS + 2 }, () => issueSessionKey(user));
  assert.strictEqual(user.sessionKeys.length, MAX_SESSION_KEYS);
  assert.strictEqual(sessionValidFor(user, keys[0]), false, 'oldest key rotated out');
  assert.strictEqual(sessionValidFor(user, keys[keys.length - 1]), true);
  assert.strictEqual(sessionValidFor(user, ''), false);
  assert.strictEqual(sessionValidFor(null, keys[1]), false);
});

test('/verify-email returns a session key that /reward-eligibility validates', async () => {
  const { srv, storage } = makeServer({ 'user:v@x.com': { email: 'v@x.com', name: 'V', verified: false, verificationCode: '123456', createdAt: new Date().toISOString() } });
  const d = await json(await srv.onRequest(req('/verify-email', { email: 'v@x.com', code: '123456', personalCode: 'VVVVVVVV22' })));
  assert.strictEqual(d.success, true);
  assert.ok(d.sessionKey && d.sessionKey.length > 20);
  assert.strictEqual(storage.map.get('user:v@x.com').sessionKeys.length, 1);
  const ok = await json(await srv.onRequest(req('/reward-eligibility', { email: 'v@x.com', sessionKey: d.sessionKey }, { token: 'test-token' })));
  assert.strictEqual(ok.identity.sessionValid, true);
  const bad = await json(await srv.onRequest(req('/reward-eligibility', { email: 'v@x.com', sessionKey: 'nope' }, { token: 'test-token' })));
  assert.strictEqual(bad.identity.sessionValid, false);
  const none = await json(await srv.onRequest(req('/reward-eligibility', { email: 'v@x.com' }, { token: 'test-token' })));
  assert.strictEqual(none.identity.sessionValid, false);
});

test('map-place photo chunks need a valid session key; set assets do not', async () => {
  const user = { email: 'p@x.com', name: 'P', verified: true };
  const key = issueSessionKey(user);
  const { srv } = makeServer({ 'user:p@x.com': user });
  const chunk = (setId, sessionKey) => req('/sets/asset/chunk', { email: 'p@x.com', setId, assetId: 'a_abcdef', kind: 'image', index: 0, total: 1, data: 'AAAA', ...(sessionKey ? { sessionKey } : {}) });
  assert.strictEqual((await srv.onRequest(chunk('place:pl_123', ''))).status, 401);
  assert.strictEqual((await srv.onRequest(chunk('place:pl_123', 'wrong'))).status, 401);
  assert.strictEqual((await srv.onRequest(chunk('place:pl_123', key))).status, 200);
  assert.strictEqual((await srv.onRequest(chunk('someset', ''))).status, 200, 'ordinary set assets keep the old behaviour');
});

test('a LINE account is found even when the caller lowercased its synthetic email', async () => {
  const key = 'user:line_UAbC123xyz@privaterelay.verserain.com';
  const user = { email: 'line_UAbC123xyz@privaterelay.verserain.com', name: 'L', verified: true };
  const sk = issueSessionKey(user);
  const { srv } = makeServer({ [key]: user });
  const d = await json(await srv.onRequest(req('/reward-eligibility', { email: 'line_uabc123xyz@privaterelay.verserain.com', sessionKey: sk }, { token: 'test-token' })));
  assert.strictEqual(d.identity.found, true);
  assert.strictEqual(d.identity.sessionValid, true);
  assert.strictEqual(d.identity.playerName, 'L');
});

test('/session-check confirms a live key without reading the garden', async () => {
  const { srv } = makeServer({
    'user:amy@x.com': { email: 'amy@x.com', name: 'Amy', sessionKeys: [{ key: 'k-live', at: 1 }] },
  });
  const ok = await json(await srv.onRequest(req('/session-check', { email: 'AMY@x.com', sessionKey: 'k-live' }, { token: 'test-token' })));
  assert.deepStrictEqual({ valid: ok.valid, playerName: ok.playerName, found: ok.found }, { valid: true, playerName: 'Amy', found: true });
  const bad = await json(await srv.onRequest(req('/session-check', { email: 'amy@x.com', sessionKey: 'nope' }, { token: 'test-token' })));
  assert.strictEqual(bad.valid, false);
  assert.strictEqual(bad.playerName, '', 'no name leaks on a bad key');
  const ghost = await json(await srv.onRequest(req('/session-check', { email: 'ghost@x.com', sessionKey: 'k-live' }, { token: 'test-token' })));
  assert.strictEqual(ghost.found, false);
  assert.strictEqual((await srv.onRequest(req('/session-check', { email: 'amy@x.com', sessionKey: 'k-live' }))).status, 401);
});
