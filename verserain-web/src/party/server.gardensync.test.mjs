// Faithful tests against the REAL Server class in server.js.
// We construct it with an in-memory storage that mimics PartyKit's
// room.storage (get/put/list) and drive the real onRequest() handler with
// real Request objects. No logic is re-typed — we exercise the shipped code.

import assert from 'node:assert';
import Server from './server.js';

const BASE = 'https://x.partykit.dev/parties/main/global-auth-db';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    async get(k) { return map.has(k) ? map.get(k) : undefined; },
    async put(k, v) { map.set(k, v); },
    async delete(k) { map.delete(k); },
    async list() { return map; },
  };
}

function makeServer(initial = {}) {
  const storage = makeStorage(initial);
  const room = { id: 'global-auth-db', storage };
  const srv = new Server(room);
  // Stub email sending so register/verify don't try to hit a mail provider.
  srv.sendEmail = async () => ({ ok: true });
  return { srv, storage };
}

function req(path, body, method = 'POST') {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

// ---------------------------------------------------------------------------
console.log('save-garden defensive merge:');

await test('first write stores garden as-is', async () => {
  const { srv, storage } = makeServer();
  const gd = { 'John 3:16': { stage: 3, fruits: 2 }, _activity: { '2026-06-10': 100 } };
  const res = await srv.onRequest(req('/save-garden', { playerName: 'Nate', gardenData: gd }));
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(storage.map.get('garden:Nate'), gd);
});

await test('STALE snapshot cannot lower stage/fruits (the回退 bug)', async () => {
  // Cloud already has progress; a stale device pushes lower numbers.
  const initial = { 'garden:Nate': { 'John 3:16': { stage: 8, fruits: 5 }, _activity: { '2026-06-15': 1000 } } };
  const { srv, storage } = makeServer(initial);
  const stale = { 'John 3:16': { stage: 2, fruits: 1 }, _activity: { '2026-06-08': 100 } };
  await srv.onRequest(req('/save-garden', { playerName: 'Nate', gardenData: stale }));
  const saved = storage.map.get('garden:Nate');
  assert.strictEqual(saved['John 3:16'].stage, 8, 'stage must not drop');
  assert.strictEqual(saved['John 3:16'].fruits, 5, 'fruits must not drop');
  // activity days are unioned, never dropped
  assert.strictEqual(saved._activity['2026-06-15'], 1000, 'newer day kept');
  assert.strictEqual(saved._activity['2026-06-08'], 100, 'old day from stale push also kept');
});

await test('higher incoming values DO win (legit progress is saved)', async () => {
  const initial = { 'garden:Nate': { 'John 3:16': { stage: 3, fruits: 2 } } };
  const { srv, storage } = makeServer(initial);
  const newer = { 'John 3:16': { stage: 7, fruits: 9 } };
  await srv.onRequest(req('/save-garden', { playerName: 'Nate', gardenData: newer }));
  const saved = storage.map.get('garden:Nate');
  assert.strictEqual(saved['John 3:16'].stage, 7);
  assert.strictEqual(saved['John 3:16'].fruits, 9);
});

await test('a verse missing from the incoming push is NOT deleted', async () => {
  // The core of "回到上周": pushing a partial garden must not drop other verses.
  const initial = { 'garden:Nate': { 'John 3:16': { stage: 8, fruits: 5 }, 'Ps 23:1': { stage: 4, fruits: 1 } } };
  const { srv, storage } = makeServer(initial);
  const partial = { 'John 3:16': { stage: 8, fruits: 5 } }; // Ps 23:1 absent
  await srv.onRequest(req('/save-garden', { playerName: 'Nate', gardenData: partial }));
  const saved = storage.map.get('garden:Nate');
  assert.ok(saved['Ps 23:1'], 'Ps 23:1 must survive');
  assert.strictEqual(saved['Ps 23:1'].stage, 4);
});

await test('activity day count keeps the higher value on conflict', async () => {
  const initial = { 'garden:Nate': { _activity: { '2026-06-16': 1000 } } };
  const { srv, storage } = makeServer(initial);
  await srv.onRequest(req('/save-garden', { playerName: 'Nate', gardenData: { _activity: { '2026-06-16': 100 } } }));
  assert.strictEqual(storage.map.get('garden:Nate')._activity['2026-06-16'], 1000);
});

await test('GET /garden returns stored data; 404 when none', async () => {
  const { srv } = makeServer({ 'garden:Nate': { 'John 3:16': { stage: 1, fruits: 0 } } });
  const ok = await srv.onRequest(req(`/garden?player=Nate`, undefined, 'GET'));
  assert.strictEqual(ok.status, 200);
  const miss = await srv.onRequest(req(`/garden?player=Ghost`, undefined, 'GET'));
  assert.strictEqual(miss.status, 404, 'missing player must be 404 so client treats it as empty, not unknown');
});

console.log('\nsave-garden mergedInto (合併重複的樹):');

await test('mergedInto moves the dropped key into the kept key and removes it', async () => {
  const { srv, storage } = makeServer({
    'garden:Amy': {
      'Isaiah 55:10-11': { gridIndex: 3, stage: 4, fruits: 0 },
      'Isaiah 55:10–11': { gridIndex: 12, stage: 10, fruits: 2, setId: 'daily' },
      _activity: { '2026-09-20': 100 },
    },
  });
  const res = await srv.onRequest(req('/save-garden', {
    playerName: 'Amy',
    gardenData: { 'Isaiah 55:10-11': { gridIndex: 3, stage: 10, fruits: 2, setId: 'daily' }, _activity: { '2026-09-20': 100 } },
    mergedInto: { 'Isaiah 55:10–11': 'Isaiah 55:10-11' },
  }));
  assert.strictEqual((await json(res)).success, true);
  const saved = storage.map.get('garden:Amy');
  assert.strictEqual(saved['Isaiah 55:10–11'], undefined, 'duplicate key dropped');
  assert.deepStrictEqual(saved['Isaiah 55:10-11'], { gridIndex: 3, stage: 10, fruits: 2, setId: 'daily' });
});

await test('mergedInto never loses progress: kept key takes the higher stage/fruits even if the client sent less', async () => {
  const { srv, storage } = makeServer({
    'garden:Amy': { 'A 1:1': { gridIndex: 0, stage: 2, fruits: 0 }, 'a 1:1': { gridIndex: 9, stage: 8, fruits: 3 } },
  });
  await srv.onRequest(req('/save-garden', {
    playerName: 'Amy',
    gardenData: { 'A 1:1': { gridIndex: 0, stage: 2, fruits: 0 } },
    mergedInto: { 'a 1:1': 'A 1:1' },
  }));
  const saved = storage.map.get('garden:Amy');
  assert.strictEqual(saved['a 1:1'], undefined);
  assert.strictEqual(saved['A 1:1'].stage, 8);
  assert.strictEqual(saved['A 1:1'].fruits, 3);
});

await test('mergedInto ignores junk: self, _activity, unknown keys, non-object', async () => {
  const { srv, storage } = makeServer({
    'garden:Amy': { 'A 1:1': { gridIndex: 0, stage: 2, fruits: 0 }, _activity: { '2026-09-20': 100 } },
  });
  await srv.onRequest(req('/save-garden', {
    playerName: 'Amy',
    gardenData: { 'A 1:1': { gridIndex: 0, stage: 2, fruits: 0 } },
    mergedInto: { 'A 1:1': 'A 1:1', _activity: 'A 1:1', 'A 1:1 ': '_activity', 'nope': 'A 1:1', 'B 2:2': 5 },
  }));
  const saved = storage.map.get('garden:Amy');
  assert.deepStrictEqual(saved['A 1:1'], { gridIndex: 0, stage: 2, fruits: 0 });
  assert.deepStrictEqual(saved._activity, { '2026-09-20': 100 });
  const res2 = await srv.onRequest(req('/save-garden', { playerName: 'Amy', gardenData: { 'A 1:1': { gridIndex: 0, stage: 3, fruits: 0 } }, mergedInto: ['x'] }));
  assert.strictEqual((await json(res2)).success, true, 'array mergedInto is ignored, not an error');
  assert.strictEqual(storage.map.get('garden:Amy')['A 1:1'].stage, 3);
});

console.log(`\n${passed} assertions passed.`);
