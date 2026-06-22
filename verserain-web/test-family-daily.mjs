// Integration test harness for the Cloud Family daily feature.
// Wraps the REAL Server class (src/party/server.js) in a mock Map-backed
// PartyKit room, exposes it over HTTP, drives 10 pseudo users through every
// new endpoint, then runs the actual cron sender against it. Self-contained.
import http from 'node:http';
import { spawn } from 'node:child_process';
import webpush from 'web-push';
import Server from './src/party/server.js';

let PASS = 0, FAIL = 0;
const fails = [];
function ok(name, cond, extra = '') {
  if (cond) { PASS++; console.log(`  ✓ ${name}`); }
  else { FAIL++; fails.push(name); console.log(`  ✗ ${name} ${extra}`); }
}
const today = new Date().toISOString().slice(0, 10);

// ---- Mock PartyKit storage: Map with structured-clone semantics ----
function makeStorage() {
  const m = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    _m: m,
    async get(k) { return clone(m.get(k)); },
    async put(k, v) { m.set(k, clone(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix } = {}) {
      const out = new Map();
      for (const [k, v] of m) if (!prefix || k.startsWith(prefix)) out.set(k, clone(v));
      return out;
    },
  };
}

const room = { id: 'global-auth-db', storage: makeStorage(), env: { ADMIN_TOKEN: 'test-admin-token' } };
const server = new Server(room);

// ---- Expose the real Server over HTTP so the cron can hit it ----
const httpServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const request = new Request(`http://127.0.0.1${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
  const resp = await server.onRequest(request);
  const text = await resp.text();
  res.writeHead(resp.status, { 'Content-Type': 'application/json' });
  res.end(text);
});
await new Promise((r) => httpServer.listen(0, '127.0.0.1', r));
const PORT = httpServer.address().port;
const BASE = `http://127.0.0.1:${PORT}/parties/main/global-auth-db`;

async function call(method, path, { body, admin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers['x-admin-token'] = 'test-admin-token';
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json; const text = await res.text();
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const vapid = webpush.generateVAPIDKeys();
function runCron(extra = {}) {
  return new Promise((resolve) => {
    const env = {
      ...process.env, PARTY_BASE: BASE, ADMIN_TOKEN: 'test-admin-token',
      VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey,
      VAPID_SUBJECT: 'mailto:test@test.com', PUBLIC_ORIGIN: 'https://www.verserain.com',
      LINE_CHANNEL_ACCESS_TOKEN: 'dummy-line-token', ...extra,
    };
    const p = spawn('node', ['scripts/send-family-daily.mjs'], { env });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}
const localDateTZ = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// ====================================================================
console.log('\n[1] Pseudo-login 10 users + create user records');
const users = [];
for (let i = 1; i <= 10; i++) {
  const email = `user${i}@test.com`;
  users.push(email);
  await room.storage.put(`user:${email}`, { name: `User ${i}`, email });
}
ok('10 user records seeded', (await room.storage.list({ prefix: 'user:' })).size === 10);

console.log('\n[2] u1 creates a Cloud Family');
const create = await call('POST', '/teams/create', { body: { email: users[0], name: '雲端家人測試' } });
ok('create returns success', create.json.success === true, JSON.stringify(create.json));
const teamId = create.json.team?.id;
const inviteCode = create.json.team?.inviteCode;
ok('team has id + invite code', !!teamId && !!inviteCode);

console.log('\n[3] u2..u10 join via invite code (→ 10 members)');
let joinFails = 0;
for (let i = 1; i < 10; i++) {
  const r = await call('POST', '/teams/join', { body: { email: users[i], inviteCode } });
  if (r.json.success !== true) joinFails++;
}
ok('all 9 joins succeeded', joinFails === 0, `joinFails=${joinFails}`);
const teamGet = await call('GET', `/teams/get?id=${teamId}&email=${users[0]}`);
ok('team now has 10 members', teamGet.json.team?.members?.length === 10, `len=${teamGet.json.team?.members?.length}`);

console.log("\n[4] u1 sets today's reading schedule (7-day plan, starts today)");
const verses = Array.from({ length: 7 }, (_, d) => ({ reference: `Ps 37:${d + 1}`, text: `Verse text for day ${d + 1}` }));
const sched = await call('POST', '/teams/schedule', {
  body: { email: users[0], teamId, schedule: { items: [{ id: 'i1', setId: 'ps37', title: 'Psalm 37', startDate: today, verses, totalCount: 7 }] } },
});
ok('schedule saved', sched.json.success === true, JSON.stringify(sched.json));

console.log('\n[5] 6 members enable daily push (via /save-push-subscription)');
for (let i = 0; i < 6; i++) {
  const r = await call('POST', '/save-push-subscription', {
    body: {
      playerName: `User ${i + 1}`, email: users[i],
      subscription: { endpoint: `https://push.example/sub-${i}`, keys: { p256dh: 'k', auth: 'a' } },
      timezone: 'Asia/Taipei', hour: 7,
    },
  });
  if (!r.json.success) console.log('   push sub fail', JSON.stringify(r.json));
}
ok('6 push subscriptions stored', (await room.storage.list({ prefix: 'push:' })).size === 6);

console.log('\n[6] GET /teams/daily-feed (admin)');
const feedNoAuth = await call('GET', '/teams/daily-feed');
ok('daily-feed rejects missing admin token (403)', feedNoAuth.status === 403, `status=${feedNoAuth.status}`);
const feed = await call('GET', '/teams/daily-feed', { admin: true });
ok('daily-feed ok', feed.json.success === true);
const ft = (feed.json.teams || [])[0];
ok('feed has exactly 1 team', (feed.json.teams || []).length === 1, `n=${(feed.json.teams||[]).length}`);
ok('feed hostTimezone = Asia/Taipei', ft?.hostTimezone === 'Asia/Taipei', ft?.hostTimezone);
ok("feed today's verse = Ps 37:1", ft?.item?.reference === 'Ps 37:1', ft?.item?.reference);
ok('feed dayIndex = 0', ft?.item?.dayIndex === 0, String(ft?.item?.dayIndex));
ok('feed carries 6 subscriptions', (ft?.subscriptions || []).length === 6, String((ft?.subscriptions||[]).length));
ok('feed hostEmail = u1', ft?.hostEmail === users[0], ft?.hostEmail);
ok('feed hostSubscriptions = 1 (host enabled push)', (ft?.hostSubscriptions || []).length === 1, String((ft?.hostSubscriptions||[]).length));
ok('feed line config null (not set)', ft?.line === null);
ok('feed lastDailySent empty initially', ft?.lastDailySent === '');

console.log('\n[7] One-tap Amen for all 10 members');
for (let i = 0; i < 10; i++) await call('POST', '/teams/amen', { body: { email: users[i], teamId } });
const amens = await call('GET', `/teams/amens?id=${teamId}&email=${users[0]}`);
ok('amens count = 10', amens.json.count === 10, String(amens.json.count));
ok('amens names length = 10', (amens.json.names || []).length === 10);
ok('amens mine = true for u1', amens.json.mine === true);
const dupe = await call('POST', '/teams/amen', { body: { email: users[0], teamId } });
ok('duplicate amen is idempotent (alreadyAmen)', dupe.json.alreadyAmen === true);
ok('duplicate amen keeps count at 10', dupe.json.todayCount === 10, String(dupe.json.todayCount));
const nonMember = await call('POST', '/teams/amen', { body: { email: 'stranger@test.com', teamId } });
ok('non-member amen rejected (403)', nonMember.status === 403, `status=${nonMember.status}`);

console.log('\n[8] Host one-tap forward — cron with NO LINE group bound');
const cron = await runCron({ FORCE: '1', DRY_RUN: '1' });
console.log(cron.out.split('\n').map((l) => '     ' + l).join('\n'));
ok('cron exits 0', cron.code === 0, `code=${cron.code}`);
ok('host gets the forward prompt (forward→host=1)', /forward→host=1/.test(cron.out));
ok('other members get read nudge (read→members=5)', /read→members=5/.test(cron.out));
ok('host-forward URL is a LINE share link', /host-forward url: https:\/\/line\.me\/R\/share/.test(cron.out));
ok('no LINE-group post when unbound', !/LINE-group=/.test(cron.out));
ok('cron processed 1 team', /1 team\(s\) nudged/.test(cron.out));

console.log('\n[9] Bound LINE group — host-forward skipped, group auto-posts');
const lineSet = await call('POST', '/teams/update', { body: { email: users[0], teamId, settings: { line: { groupId: 'Cabc123' } } } });
ok('update stores line settings', lineSet.json.success === true);
const feed2 = await call('GET', '/teams/daily-feed', { admin: true });
ok('feed now exposes line.groupId', (feed2.json.teams || [])[0]?.line?.groupId === 'Cabc123');
const cronBound = await runCron({ FORCE: '1', DRY_RUN: '1' });
console.log(cronBound.out.split('\n').map((l) => '     ' + l).join('\n'));
ok('group bound → host-forward skipped (forward→host=0)', /forward→host=0/.test(cronBound.out));
ok('group bound → members still nudged, host excluded (read→members=5)', /read→members=5/.test(cronBound.out));
ok('group bound → LINE-group=ok', /LINE-group=ok/.test(cronBound.out));

console.log('\n[10] Daily idempotency: mark-daily-sent then verify');
const markNoAuth = await call('POST', '/teams/mark-daily-sent', { body: { teamId, date: today } });
ok('mark-daily-sent rejects missing admin (403)', markNoAuth.status === 403, `status=${markNoAuth.status}`);
const mark = await call('POST', '/teams/mark-daily-sent', { body: { teamId, date: today }, admin: true });
ok('mark-daily-sent ok', mark.json.success === true);
const feed3 = await call('GET', '/teams/daily-feed', { admin: true });
ok('feed lastDailySent now = today', (feed3.json.teams || [])[0]?.lastDailySent === today);

console.log('\n[12] Today-verse date logic (advance / not-started / finished)');
const setStart = (offsetDays) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + offsetDays);
  const s = d.toISOString().slice(0, 10);
  return call('POST', '/teams/schedule', { body: { email: users[0], teamId, schedule: { items: [{ id: 'i1', setId: 'ps37', title: 'Psalm 37', startDate: s, verses, totalCount: 7 }] } } });
};
await setStart(-3);
let f = await call('GET', '/teams/daily-feed', { admin: true });
ok('startDate -3d → dayIndex 3 (Ps 37:4)', f.json.teams?.[0]?.item?.reference === 'Ps 37:4', f.json.teams?.[0]?.item?.reference);
await setStart(1);
f = await call('GET', '/teams/daily-feed', { admin: true });
ok('future startDate → team excluded (not started)', (f.json.teams || []).length === 0, `n=${(f.json.teams||[]).length}`);
await setStart(-10);
f = await call('GET', '/teams/daily-feed', { admin: true });
ok('past-end startDate → team excluded (finished)', (f.json.teams || []).length === 0, `n=${(f.json.teams||[]).length}`);
await setStart(0); // restore: starts today

console.log('\n[13] Cron idempotency — an already-sent team is skipped this hour');
await call('POST', '/teams/mark-daily-sent', { body: { teamId, date: localDateTZ('Asia/Taipei') }, admin: true });
const cronAgain = await runCron({ FORCE: '1', DRY_RUN: '1' });
ok('cron skips already-sent team (0 nudged)', /0 team\(s\) nudged/.test(cronAgain.out), cronAgain.out.replace(/\n/g, ' '));

console.log('\n[11] OG link-preview endpoint (api/family-card.js)');
process.env.PARTY_BASE = BASE; // so /fc resolves day-verse from our live server
const { default: ogHandler } = await import('./api/family-card.js');
async function renderFc(query) {
  let body = '', code = 0;
  await ogHandler({ headers: { host: 'www.verserain.com' }, url: '/fc', query },
    { setHeader() {}, status(c) { code = c; return this; }, send(b) { body = b; } });
  return { body, code };
}
// SHORT link (no verse params) — /fc must resolve the verse from team+set+i.
const short = await renderFc({ team: teamId, set: 'ps37', i: '0', amen: '1' });
ok('OG returns 200', short.code === 200);
ok('OG has og:image', short.body.includes('og-family.png'));
ok('short link resolves reference server-side (Ps 37:1)', /og:title" content="[^"]*Ps 37:1/.test(short.body), (short.body.match(/og:title" content="([^"]*)"/) || [])[1]);
ok('short link resolves verse text server-side', /Verse text for day 1/.test(short.body), (short.body.match(/og:description" content="([^"]*)"/) || [])[1]);
ok('OG redirects to SPA deep link with amen', /startSet=ps37/.test(short.body) && /amen=1/.test(short.body) && new RegExp('teamId=' + teamId).test(short.body));
// Inline vref/vtext still override (self-contained card).
const inline = await renderFc({ team: teamId, set: 'ps37', i: '0', vref: 'Gen 1:1', vtext: 'In the beginning', title: 'X' });
ok('inline vref/vtext still honored', /Gen 1:1/.test(inline.body) && /In the beginning/.test(inline.body));

console.log('\n[14] /teams/set-line — bind LINE group by invite code (admin)');
const slNoAuth = await call('POST', '/teams/set-line', { body: { inviteCode, groupId: 'Cdirect' } });
ok('set-line rejects missing admin (403)', slNoAuth.status === 403, `status=${slNoAuth.status}`);
const slBad = await call('POST', '/teams/set-line', { body: { inviteCode: 'ZZZ-9999', groupId: 'Cx' }, admin: true });
ok('set-line bad invite code → 404', slBad.status === 404, `status=${slBad.status}`);
const sl = await call('POST', '/teams/set-line', { body: { inviteCode, groupId: 'Cdirect' }, admin: true });
ok('set-line by invite code ok', sl.json.success === true && sl.json.teamId === teamId, JSON.stringify(sl.json));

console.log('\n[15] LINE webhook auto-binder — host types invite code in the group');
process.env.PARTY_BASE = BASE;
process.env.ADMIN_TOKEN = 'test-admin-token';
delete process.env.LINE_CHANNEL_ACCESS_TOKEN; // no reply network in test
delete process.env.LINE_CHANNEL_SECRET;        // skip signature check in test
const { default: lineHandler } = await import('./api/line-webhook.js');

async function fireWebhook(eventBody) {
  const { Readable } = await import('node:stream');
  const raw = Buffer.from(JSON.stringify(eventBody));
  const req = Object.assign(Readable.from([raw]), { method: 'POST', headers: {} });
  let code = 0;
  const resp = { status(c) { code = c; return this; }, send() {} };
  await lineHandler(req, resp);
  return code;
}
// Ordinary chatter must NOT bind.
await fireWebhook({ events: [{ type: 'message', source: { groupId: 'Cwebhook' }, message: { type: 'text', text: 'good morning everyone' }, replyToken: 'r1' }] });
let feedW = await call('GET', '/teams/daily-feed', { admin: true });
ok('chatter does not rebind the group', feedW.json.teams?.[0]?.line?.groupId === 'Cdirect');
// Host types the invite code → auto-bind to this group.
const wc = await fireWebhook({ events: [{ type: 'message', source: { groupId: 'Cwebhook' }, message: { type: 'text', text: inviteCode }, replyToken: 'r2' }] });
ok('webhook returns 200', wc === 200, `code=${wc}`);
feedW = await call('GET', '/teams/daily-feed', { admin: true });
ok('webhook auto-bound group to the family', feedW.json.teams?.[0]?.line?.groupId === 'Cwebhook', feedW.json.teams?.[0]?.line?.groupId);
// Non-group event (1:1 chat) is ignored.
const wDm = await fireWebhook({ events: [{ type: 'message', source: { userId: 'Uxyz' }, message: { type: 'text', text: inviteCode }, replyToken: 'r3' }] });
ok('1:1 message ignored (no groupId)', wDm === 200);

console.log('\n[16] daily-feed resolves verse text from the set when not stored inline');
// A published verse set lives in storage; the schedule references it by setId only.
await room.storage.put('verseset:ps23-set', {
  id: 'ps23-set', title: 'Psalm 23',
  verses: [
    { id: 'v1', reference: 'Ps 23:1', text: 'The Lord is my shepherd; I shall not want.' },
    { id: 'v2', reference: 'Ps 23:2', text: 'He makes me lie down in green pastures.' },
  ],
});
const t2 = await call('POST', '/teams/create', { body: { email: users[1], name: '詩篇家庭' } });
const team2 = t2.json.team.id;
await call('POST', '/teams/schedule', { body: { email: users[1], teamId: team2,
  schedule: { items: [{ id: 'i1', setId: 'ps23-set', title: 'Psalm 23', startDate: today, totalCount: 2, verses: [] }] } } });
const feedR = await call('GET', '/teams/daily-feed', { admin: true });
const f2 = (feedR.json.teams || []).find((x) => x.teamId === team2);
ok('team2 appears in feed', !!f2);
ok('feed resolved reference from set (Ps 23:1)', f2?.item?.reference === 'Ps 23:1', f2?.item?.reference);
ok('feed resolved text from set', /shepherd/.test(f2?.item?.text || ''), f2?.item?.text);

console.log('\n[17] link-only fallback — setId with no inline text and no stored set still sends');
const t3 = await call('POST', '/teams/create', { body: { email: users[2], name: '連結測試家庭' } });
const team3 = t3.json.team.id;
await call('POST', '/teams/schedule', { body: { email: users[2], teamId: team3,
  schedule: { items: [{ id: 'i1', setId: 'no-such-set-xyz', title: '無內文', startDate: today, totalCount: 3, verses: [] }] } } });
const feedR2 = await call('GET', '/teams/daily-feed', { admin: true });
const f3 = (feedR2.json.teams || []).find((x) => x.teamId === team3);
ok('team3 in feed with empty text but a setId', f3 && f3.item.setId === 'no-such-set-xyz' && f3.item.text === '', JSON.stringify(f3?.item));
const cronAll = await runCron({ FORCE: '1', DRY_RUN: '1' });
ok('link-only family is NOT skipped (appears in cron output)', /連結測試家庭/.test(cronAll.out), cronAll.out.replace(/\n/g, ' '));
ok('set-resolved family also processed', /詩篇家庭/.test(cronAll.out));

// ====================================================================
httpServer.close();
console.log(`\n==== RESULT: ${PASS} passed, ${FAIL} failed ====`);
if (FAIL) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
console.log('ALL GREEN ✅');
process.exit(0);
