// node --test api/_lib/*.test.mjs
// Admin notifications for newly registered map places: inbox notice + push +
// APNs per admin code, nothing when REWARDS_ADMIN_CODES is unset.
import { test } from 'node:test';
import assert from 'node:assert';
import { adminCodes, notifyAdmins, placeSubmittedMessage, placeResubmittedMessage, poolSubmittedMessage } from './adminNotify.js';

function stubRedis() {
  const lists = new Map();
  return {
    lists,
    async lpush(k, v) { const l = lists.get(k) || []; l.unshift(v); lists.set(k, l); return l.length; },
    async ltrim(k, a, b) { const l = lists.get(k) || []; lists.set(k, l.slice(a, b + 1)); return 'OK'; },
  };
}
const place = { id: 'pl_abc12345', name: '菲菲檸檬', kind: 'merchant', status: 'pending' };

test('adminCodes parses the comma-separated env', () => {
  assert.deepStrictEqual(adminCodes({ REWARDS_ADMIN_CODES: ' AAAA111111, BBBB222222 ,,' }), ['AAAA111111', 'BBBB222222']);
  assert.deepStrictEqual(adminCodes({}), []);
});

test('placeSubmittedMessage: inbox record + push text name the submitter, the place and its kind', () => {
  const m = placeSubmittedMessage(place, '菲菲檸檬');
  assert.deepStrictEqual(m.record, { kind: 'place_submitted', placeId: 'pl_abc12345', name: '菲菲檸檬', placeKind: 'merchant', by: '菲菲檸檬' });
  assert.match(m.body, /菲菲檸檬 登記了「菲菲檸檬」（商家）/);
  assert.strictEqual(m.url, 'https://www.verserain.com/#rewards_admin');
  assert.strictEqual(m.tag, 'verserain-place-pl_abc12345');
  assert.match(placeSubmittedMessage({ ...place, kind: 'church' }, '').body, /^有人 登記了.*（教會）/, 'unknown submitter, church kind');
});

test('notifyAdmins: no env → nothing sent, no inbox write', async () => {
  const r = stubRedis();
  const calls = [];
  const out = await notifyAdmins(r, placeSubmittedMessage(place, 'x'), { env: {}, push: async (...a) => calls.push(a), apns: async (...a) => calls.push(a) });
  assert.deepStrictEqual(out, { notified: 0 });
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(r.lists.size, 0);
});

test('notifyAdmins: every admin code gets the inbox notice, a web push and an APNs alert', async () => {
  const r = stubRedis();
  const pushes = [];
  const apnss = [];
  const msg = placeSubmittedMessage(place, '菲菲檸檬');
  const out = await notifyAdmins(r, msg, { env: { REWARDS_ADMIN_CODES: 'ADMIN00001,ADMIN00002' }, push: async (code, p) => pushes.push([code, p]), apns: async (code, p) => apnss.push([code, p]) });
  assert.deepStrictEqual(out, { notified: 2 });
  for (const code of ['ADMIN00001', 'ADMIN00002']) {
    const inbox = r.lists.get(`gamification:notify:${code}`);
    assert.strictEqual(inbox.length, 1);
    const rec = JSON.parse(inbox[0]);
    assert.strictEqual(rec.kind, 'place_submitted');
    assert.strictEqual(rec.name, '菲菲檸檬');
    assert.ok(rec.at, 'stamped');
  }
  assert.deepStrictEqual(pushes.map(([c]) => c), ['ADMIN00001', 'ADMIN00002']);
  assert.strictEqual(pushes[0][1].url, 'https://www.verserain.com/#rewards_admin');
  assert.strictEqual(pushes[0][1].tag, 'verserain-place-pl_abc12345-admin');
  assert.strictEqual(apnss.length, 2);
  assert.strictEqual(apnss[1][1].collapseId, 'verserain-place-pl_abc12345-admin');
});

test('notifyAdmins: a failing push never fails the call', async () => {
  const r = stubRedis();
  const out = await notifyAdmins(r, placeSubmittedMessage(place, 'x'), { env: { REWARDS_ADMIN_CODES: 'ADMIN00001' }, push: async () => { throw new Error('boom'); }, apns: async () => { throw new Error('boom'); } });
  assert.deepStrictEqual(out, { notified: 1 });
  assert.strictEqual(r.lists.get('gamification:notify:ADMIN00001').length, 1, 'inbox still written');
});

test('placeResubmittedMessage: same inbox kind (renders as-is), names the changed fields', () => {
  const m = placeResubmittedMessage(place, '菲菲檸檬', ['name', 'lat', 'lng']);
  assert.deepStrictEqual(m.record, { kind: 'place_submitted', placeId: 'pl_abc12345', name: '菲菲檸檬', placeKind: 'merchant', by: '菲菲檸檬', resubmitted: true });
  assert.match(m.body, /修改了「菲菲檸檬」的名稱、位置，已暫時下地圖/);
  assert.strictEqual(m.tag, 'verserain-place-pl_abc12345');
  assert.strictEqual(m.url, 'https://www.verserain.com/#rewards_admin');
  assert.match(placeResubmittedMessage(place, '', []).body, /^有人 修改了「菲菲檸檬」的資料/);
});

test('poolSubmittedMessage: inbox record + push text name the organisation and the pool', () => {
  const m = poolSubmittedMessage({ id: 'cp_abc12345', name: '偏鄉長輩愛筵池', orgPlaceName: '恩典教會' }, '瑞爸');
  assert.deepStrictEqual(m.record, { kind: 'pool_submitted', poolId: 'cp_abc12345', name: '偏鄉長輩愛筵池', orgPlaceName: '恩典教會', by: '瑞爸' });
  assert.match(m.title, /愛心折抵池/);
  assert.match(m.body, /瑞爸.*恩典教會.*偏鄉長輩愛筵池/);
  assert.strictEqual(m.tag, 'verserain-pool-cp_abc12345');
  assert.doesNotMatch(m.title + m.body, /捐|募/, 'no donation wording');
});
