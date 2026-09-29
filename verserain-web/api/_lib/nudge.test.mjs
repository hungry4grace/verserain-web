// node --test api/_lib/*.test.mjs
// 🔔 提醒他: who may nudge whom, the 3-day / daily limits and delivery to
// every device code of the friend, against an in-memory Upstash stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendNudge, NUDGE_DAILY_MAX, nudgeDayKey } from './nudge.js';
import { taipeiDay } from './points.js';

const ME = 'me@example.com';
const MY_CODE = 'AbCdEfGh23';
const FRIEND = '霓希';
const FRIEND_CODES = ['FrNdCd2345', 'FrNdCd6789'];

function stubRedis(initial = {}) {
  const strings = new Map();
  const ttls = new Map();
  const lists = new Map();
  const hashes = new Map(Object.entries({
    player_mapping: new Map([[MY_CODE, '瑞爸'], [FRIEND_CODES[0], FRIEND], [FRIEND_CODES[1], FRIEND], ['OtHrCd2345', '別人']]),
    ...initial,
  }));
  return {
    strings, lists,
    async hgetall(k) { return hashes.has(k) ? Object.fromEntries(hashes.get(k)) : null; },
    async smembers() { return []; },
    async get(k) { return strings.has(k) ? strings.get(k) : null; },
    async set(k, v, opts = {}) {
      if (opts.nx && strings.has(k)) return null;
      strings.set(k, String(v)); if (opts.ex) ttls.set(k, opts.ex); return 'OK';
    },
    async ttl(k) { return ttls.get(k) ?? -1; },
    async incr(k) { const v = Number(strings.get(k) || 0) + 1; strings.set(k, String(v)); return v; },
    async expire() { return 1; },
    async lpush(k, v) { if (!lists.has(k)) lists.set(k, []); lists.get(k).unshift(v); return lists.get(k).length; },
    async ltrim() { return 'OK'; },
  };
}

function deps({ sessionValid = true, list = [{ name: FRIEND, passedVerses: 0 }] } = {}) {
  const pushed = [];
  const calls = [];
  return {
    pushed, calls,
    partyFetch: async (path, body) => { calls.push({ path, body }); return { identity: { sessionValid, playerName: '瑞爸' }, referrals: { list } }; },
    push: async (code, msg) => { pushed.push({ code, msg }); },
  };
}

const at = (iso) => new Date(iso);
const req = (over = {}) => ({ email: ME, sessionKey: 'sk', authors: ['瑞爸', MY_CODE], name: FRIEND, now: at('2026-09-29T04:00:00Z'), ...over });

test('delivers to every device code of the friend, sender name from the account', async () => {
  const r = stubRedis();
  const d = deps();
  const out = await sendNudge(r, req(), d);
  assert.equal(out.success, true);
  assert.equal(out.delivered, 2);
  assert.deepEqual(d.calls[0], { path: '/reward-eligibility', body: { email: ME, sessionKey: 'sk', inviterCodes: [MY_CODE] } });
  for (const code of FRIEND_CODES) {
    const item = JSON.parse(r.lists.get(`gamification:notify:${code}`)[0]);
    assert.equal(item.kind, 'nudge');
    assert.equal(item.fromName, '瑞爸');
  }
  assert.deepEqual(d.pushed.map((p) => p.code), FRIEND_CODES);
  assert.match(d.pushed[0].msg.body, /瑞爸 邀你來經文雨/);
});

test('same friend again within 3 days is refused with a retry time', async () => {
  const r = stubRedis();
  await sendNudge(r, req(), deps());
  const again = await sendNudge(r, req({ now: at('2026-09-30T04:00:00Z') }), deps());
  assert.equal(again.error, 'too_soon');
  assert.ok(again.retryAt > Date.parse('2026-09-30T04:00:00Z'));
});

test('daily cap per inviter', async () => {
  const r = stubRedis();
  const now = at('2026-09-29T04:00:00Z');
  r.strings.set(nudgeDayKey(ME, taipeiDay(now)), String(NUDGE_DAILY_MAX));
  assert.equal((await sendNudge(r, req({ now }), deps())).error, 'daily_limit');
});

test('only my own pending referees, with a valid session', async () => {
  const r = stubRedis();
  assert.equal((await sendNudge(r, req({ name: '別人' }), deps())).error, 'not_your_referee');
  assert.equal((await sendNudge(r, req(), deps({ list: [{ name: FRIEND, passedVerses: 2 }] }))).error, 'already_started');
  assert.equal((await sendNudge(r, req(), deps({ sessionValid: false }))).error, 'session_invalid');
  assert.equal((await sendNudge(r, req({ sessionKey: '' }), deps())).error, 'session_invalid');
  assert.equal((await sendNudge(r, req({ name: '' }), deps())).error, 'bad_request');
  // someone else's code in my authors does not make their referees mine
  assert.equal((await sendNudge(r, req({ authors: ['OtHrCd2345'] }), deps())).error, 'not_your_referee');
  const d = deps();
  await sendNudge(r, req({ authors: ['瑞爸', 'OtHrCd2345', MY_CODE] }), d);
  assert.deepEqual(d.calls[0].body.inviterCodes, [MY_CODE]);
  // nothing was sent by the refused attempts
  assert.equal(r.lists.size, 2);
});

test('a friend with no device code gets nothing but the call succeeds', async () => {
  const r = stubRedis();
  const out = await sendNudge(r, req({ name: '沒裝置' }), deps({ list: [{ name: '沒裝置', passedVerses: 0 }] }));
  assert.equal(out.success, true);
  assert.equal(out.delivered, 0);
  assert.equal(r.lists.size, 0);
});
