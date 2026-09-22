// node --test api/_lib/*.test.mjs
// Map places: validation, admin transitions, public view, submission counter.
import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizePlaceSubmission, applyAdminAction, publicView, newPlaceId, taipeiDay,
  listPlaces, getPlace, savePlace, deletePlace, countSubmissionsToday, bumpSubmissions,
  PLACE_ID_RE, DEFAULT_DAILY_CAP_NTD,
} from './places.js';

function stubRedis() {
  const hashes = new Map();
  const strings = new Map();
  const ttls = new Map();
  const h = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
  return {
    hashes, strings, ttls,
    async hset(k, obj) { const m = h(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return 1; },
    async hget(k, f) { return h(k).get(f) ?? null; },
    async hgetall(k) { return Object.fromEntries(h(k)); },
    async hdel(k, f) { return h(k).delete(f) ? 1 : 0; },
    async set(k, v, opts) { if (opts && opts.nx && strings.has(k)) return null; strings.set(k, v); return 'OK'; },
    async get(k) { return strings.get(k) ?? null; },
    async incr(k) { const n = (Number(strings.get(k)) || 0) + 1; strings.set(k, String(n)); return n; },
    async expire(k, s) { ttls.set(k, s); return 1; },
  };
}

const NOW = new Date('2026-09-22T03:00:00Z');
const merchant = () => ({ kind: 'merchant', name: ' 恩典咖啡 ', address: '台北市中正區重慶南路一段 122 號', lat: '25.0421234567', lng: 121.5123456, discountPct: 10, website: 'https://grace.coffee', description: 'd'.repeat(400) });

test('normalizePlaceSubmission validates and fills defaults', () => {
  const p = normalizePlaceSubmission(merchant(), { ownerEmail: 'OWNER@Example.com', ownerCode: 'ABCDEFGHJK', now: NOW });
  assert.ok(PLACE_ID_RE.test(p.id), p.id);
  assert.strictEqual(p.name, '恩典咖啡');
  assert.strictEqual(p.lat, 25.04212, 'rounded to 5 dp');
  assert.strictEqual(p.lng, 121.51235);
  assert.strictEqual(p.discountPct, 10);
  assert.strictEqual(p.description.length, 300);
  assert.strictEqual(p.ownerEmail, 'owner@example.com');
  assert.strictEqual(p.ownerCode, 'ABCDEFGHJK');
  assert.strictEqual(p.status, 'pending');
  assert.strictEqual(p.dailyCapNTD, DEFAULT_DAILY_CAP_NTD);
  assert.strictEqual(p.createdAt, NOW.toISOString());
  assert.strictEqual(p.updatedAt, NOW.toISOString());
  assert.strictEqual(p.approvedAt, null);
  assert.deepStrictEqual(p.stats, { issued: 0, used: 0, usedNTD: 0 });
  assert.strictEqual(p.photoAssetId, '');
});

test('normalizePlaceSubmission rejects bad input with readable messages', () => {
  const opts = { ownerEmail: 'a@x.com' };
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), name: '  ' }, opts), /name required/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), address: '' }, opts), /address required/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), kind: 'bar' }, opts), /kind must be/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), discountPct: 4 }, opts), /discountPct/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), discountPct: 21 }, opts), /discountPct/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), discountPct: 7.5 }, opts), /discountPct/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), discountPct: undefined }, opts), /discountPct/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), website: 'grace.coffee' }, opts), /website/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), lat: 91 }, opts), /lat/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), lat: 'abc' }, opts), /lat/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), lng: -181 }, opts), /lng/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), lng: undefined }, opts), /lng/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), photoAssetId: 'nope' }, opts), /photoAssetId/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), photoAssetId: 'a_abc123' }, opts), /photoMime required/);
  assert.throws(() => normalizePlaceSubmission({ ...merchant(), photoAssetId: 'a_abc123', photoMime: 'image/gif' }, opts), /photoMime must be/);
  const withPhoto = normalizePlaceSubmission({ ...merchant(), photoAssetId: 'a_abc123', photoMime: 'image/webp' }, opts);
  assert.strictEqual(withPhoto.photoAssetId, 'a_abc123');
  assert.strictEqual(withPhoto.photoMime, 'image/webp');
});

test('discount is forced to 0 for churches and organisations', () => {
  const church = normalizePlaceSubmission({ kind: 'church', name: '恩典教會', address: '某處', lat: 25, lng: 121, discountPct: 15 }, { ownerEmail: 'a@x.com' });
  assert.strictEqual(church.discountPct, 0);
  const org = normalizePlaceSubmission({ kind: 'org', name: '機構', address: '某處', lat: 25, lng: 121 }, { ownerEmail: 'a@x.com' });
  assert.strictEqual(org.discountPct, 0);
});

test('id: accepts a well-formed input id, else keeps existing, else mints one', () => {
  const opts = { ownerEmail: 'a@x.com' };
  assert.strictEqual(normalizePlaceSubmission({ ...merchant(), id: 'pl_abcdefgh12' }, opts).id, 'pl_abcdefgh12');
  assert.ok(PLACE_ID_RE.test(normalizePlaceSubmission({ ...merchant(), id: 'DROP TABLE' }, opts).id), 'bad ids are replaced');
  const existing = { id: 'pl_existing01', createdAt: '2026-01-01T00:00:00.000Z', status: 'approved', approvedAt: '2026-01-02T00:00:00.000Z', approvedBy: 'admin@x.com', note: 'n', dailyCapNTD: 500, stats: { issued: 3, used: 1, usedNTD: 120 }, ownerEmail: 'a@x.com', ownerCode: 'CODE' };
  const edited = normalizePlaceSubmission(merchant(), { ownerEmail: 'a@x.com', existing, now: NOW });
  assert.strictEqual(edited.id, 'pl_existing01');
  assert.strictEqual(edited.status, 'approved', 'edits keep the stored status');
  assert.strictEqual(edited.createdAt, existing.createdAt);
  assert.strictEqual(edited.updatedAt, NOW.toISOString());
  assert.strictEqual(edited.approvedBy, 'admin@x.com');
  assert.strictEqual(edited.note, 'n');
  assert.strictEqual(edited.dailyCapNTD, 500);
  assert.deepStrictEqual(edited.stats, existing.stats);
  assert.ok(PLACE_ID_RE.test(newPlaceId()));
});

test('publicView returns only approved places with public fields', () => {
  const base = normalizePlaceSubmission({ ...merchant(), phone: '02-1234', hours: '09-18' }, { ownerEmail: 'a@x.com', ownerCode: 'C' });
  const approved = { ...base, id: 'pl_approved01', status: 'approved', note: 'secret' };
  const pending = { ...base, id: 'pl_pending001', status: 'pending' };
  const hidden = { ...base, id: 'pl_hidden0001', status: 'hidden' };
  const v = publicView([approved, pending, hidden, null]);
  assert.strictEqual(v.length, 1);
  assert.deepStrictEqual(Object.keys(v[0]).sort(), ['address', 'description', 'discountPct', 'hours', 'id', 'kind', 'lat', 'lng', 'message', 'name', 'phone', 'photoAssetId', 'photoMime', 'website'].sort());
  assert.strictEqual(v[0].id, 'pl_approved01');
  assert.strictEqual(v[0].phone, '02-1234');
  assert.ok(!('ownerEmail' in v[0]) && !('ownerCode' in v[0]) && !('note' in v[0]) && !('dailyCapNTD' in v[0]));
});

test('applyAdminAction transitions and update re-validates', () => {
  const place = normalizePlaceSubmission(merchant(), { ownerEmail: 'a@x.com', ownerCode: 'CODE', now: NOW });
  const t = new Date('2026-09-23T00:00:00Z');
  const approved = applyAdminAction(place, 'approve', { adminEmail: 'ADMIN@x.com', now: t });
  assert.strictEqual(approved.status, 'approved');
  assert.strictEqual(approved.approvedAt, t.toISOString());
  assert.strictEqual(approved.approvedBy, 'admin@x.com');
  assert.strictEqual(place.status, 'pending', 'input is not mutated');
  assert.strictEqual(applyAdminAction(place, 'reject', { now: t }).status, 'rejected');
  const hidden = applyAdminAction(approved, 'hide', { now: t });
  assert.strictEqual(hidden.status, 'hidden');
  assert.strictEqual(applyAdminAction(hidden, 'unhide', { now: t }).status, 'approved');

  const updated = applyAdminAction(approved, 'update', { adminEmail: 'admin@x.com', now: t, patch: { name: 'New name', discountPct: 20, note: 'checked', dailyCapNTD: 3000, sponsorId: 'sp_1', ownerEmail: 'evil@x.com', status: 'pending', stats: { issued: 99 } } });
  assert.strictEqual(updated.name, 'New name');
  assert.strictEqual(updated.discountPct, 20);
  assert.strictEqual(updated.note, 'checked');
  assert.strictEqual(updated.dailyCapNTD, 3000);
  assert.strictEqual(updated.sponsorId, 'sp_1');
  assert.strictEqual(updated.status, 'approved', 'status is kept on update');
  assert.strictEqual(updated.ownerEmail, 'a@x.com', 'non-whitelisted fields are ignored');
  assert.strictEqual(updated.ownerCode, 'CODE');
  assert.strictEqual(updated.approvedBy, 'admin@x.com');
  assert.strictEqual(updated.id, approved.id);
  assert.deepStrictEqual(updated.stats, { issued: 0, used: 0, usedNTD: 0 });
  assert.strictEqual(updated.address, approved.address, 'unpatched fields survive');

  const asChurch = applyAdminAction(approved, 'update', { patch: { kind: 'church' } });
  assert.strictEqual(asChurch.discountPct, 0);
  assert.throws(() => applyAdminAction(approved, 'update', { patch: { discountPct: 50 } }), /discountPct/);
  assert.throws(() => applyAdminAction(approved, 'update', { patch: { dailyCapNTD: -1 } }), /dailyCapNTD/);
  assert.throws(() => applyAdminAction(approved, 'update', { patch: { website: 'ftp://x' } }), /website/);
  assert.throws(() => applyAdminAction(approved, 'explode'), /action must be/);
});

test('storage helpers and the daily submission counter', async () => {
  const r = stubRedis();
  const a = normalizePlaceSubmission({ ...merchant(), id: 'pl_aaaaaaaa01' }, { ownerEmail: 'a@x.com', now: new Date('2026-09-01T00:00:00Z') });
  const b = normalizePlaceSubmission({ ...merchant(), id: 'pl_bbbbbbbb01' }, { ownerEmail: 'b@x.com', now: new Date('2026-09-02T00:00:00Z') });
  await savePlace(r, a);
  await savePlace(r, b);
  const all = await listPlaces(r);
  assert.deepStrictEqual(all.map((p) => p.id), ['pl_bbbbbbbb01', 'pl_aaaaaaaa01'], 'newest first');
  assert.strictEqual((await getPlace(r, 'pl_aaaaaaaa01')).ownerEmail, 'a@x.com');
  assert.strictEqual(await getPlace(r, 'pl_missing000'), null);
  await deletePlace(r, 'pl_aaaaaaaa01');
  assert.strictEqual(await getPlace(r, 'pl_aaaaaaaa01'), null);
  assert.strictEqual((await listPlaces(r)).length, 1);

  const day = '2026-09-22';
  assert.strictEqual(await countSubmissionsToday(r, 'A@x.com', day), 0);
  assert.strictEqual(await bumpSubmissions(r, 'a@x.com', day), 1);
  assert.strictEqual(await bumpSubmissions(r, 'A@X.COM', day), 2, 'email is case-folded');
  assert.strictEqual(await countSubmissionsToday(r, 'a@x.com', day), 2);
  assert.strictEqual(r.ttls.get(`places:submit:a@x.com:${day}`), 86400);
  assert.strictEqual(await countSubmissionsToday(r, 'a@x.com', '2026-09-23'), 0, 'counter is per day');
  assert.match(taipeiDay(new Date('2026-09-22T17:30:00Z')), /^2026-09-23$/, 'UTC evening is already the next day in Taipei');
});
