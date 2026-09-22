// node --test api/_lib/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeSponsor, poolStats, publicView } from './sponsors.js';
import { requireAdmin } from './admins.js';

test('normalizeSponsor validates and fills defaults', () => {
  const s = normalizeSponsor({ displayName: ' 恩典教會 ', amount: '20000.4', currency: 'twd', message: 'x'.repeat(300) }, { recordedBy: 'HUNGRY4GRACE@gmail.com', now: new Date('2026-09-22T00:00:00Z') });
  assert.strictEqual(s.displayName, '恩典教會');
  assert.strictEqual(s.amount, 20000);
  assert.strictEqual(s.currency, 'TWD');
  assert.strictEqual(s.region, 'tw');
  assert.strictEqual(s.message.length, 200);
  assert.strictEqual(s.receivedAt, '2026-09-22');
  assert.strictEqual(s.active, true);
  assert.strictEqual(s.recordedBy, 'hungry4grace@gmail.com');
  assert.ok(s.id.startsWith('sp_'));
  assert.throws(() => normalizeSponsor({ amount: 5 }), /displayName/);
  assert.throws(() => normalizeSponsor({ displayName: 'A', amount: 0 }), /amount/);
  assert.throws(() => normalizeSponsor({ displayName: 'A', amount: 5, currency: 'EUR' }), /currency/);
  assert.throws(() => normalizeSponsor({ displayName: 'A', amount: 5, receivedAt: 'yesterday' }), /receivedAt/);
  const usd = normalizeSponsor({ displayName: 'B', amount: 100, currency: 'USD' });
  assert.strictEqual(usd.region, 'intl');
});

test('normalizeSponsor keeps identity of an existing record', () => {
  const existing = { id: 'sp_1', createdAt: '2026-01-01T00:00:00.000Z', recordedBy: 'a@x.com', receivedAt: '2026-01-01', currency: 'USD', region: 'intl', showAmount: true };
  const s = normalizeSponsor({ displayName: 'Renamed', amount: 50 }, { existing });
  assert.strictEqual(s.id, 'sp_1');
  assert.strictEqual(s.createdAt, existing.createdAt);
  assert.strictEqual(s.recordedBy, 'a@x.com');
  assert.strictEqual(s.receivedAt, '2026-01-01');
  assert.strictEqual(s.currency, 'USD');
  assert.strictEqual(s.showAmount, true);
});

test('poolStats derives balances per currency and per sponsor', () => {
  const sponsors = [
    { id: 'a', amount: 10000, currency: 'TWD', active: true },
    { id: 'b', amount: 5000, currency: 'TWD', active: false },
    { id: 'c', amount: 100, currency: 'USD', active: true },
  ];
  const rewards = [
    { status: 'sent', poolId: 'a', voucherValue: 300, voucherCurrency: 'TWD' },
    { status: 'sent', poolId: 'a', voucherValue: 500, voucherCurrency: 'TWD' },
    { status: 'sent', voucherValue: 200, voucherCurrency: 'TWD' },           // sent without a pool
    { status: 'sent', poolId: 'c', voucherValue: 10, voucherCurrency: 'USD' },
    { status: 'claimed', region: 'intl' },
    { status: 'pending' },
    { status: 'rejected' },
  ];
  const { byCurrency, bySponsor } = poolStats(sponsors, rewards);
  assert.deepStrictEqual(byCurrency.TWD, { raised: 10000, sentValue: 1000, sentCount: 3, pendingCount: 1, remaining: 9000 });
  assert.deepStrictEqual(byCurrency.USD, { raised: 100, sentValue: 10, sentCount: 1, pendingCount: 1, remaining: 90 });
  assert.deepStrictEqual(bySponsor.a, { spent: 800, remaining: 9200 });
  assert.strictEqual(bySponsor.b, undefined, 'inactive pools are excluded');
  assert.deepStrictEqual(bySponsor.c, { spent: 10, remaining: 90 });
});

test('publicView hides names of anonymous sponsors and amounts unless allowed', () => {
  const v = publicView([
    { id: '1', displayName: 'Open', anonymous: false, showAmount: true, amount: 5000, currency: 'TWD', region: 'tw', message: 'm', receivedAt: '2026-09-01', active: true },
    { id: '2', displayName: 'Secret', anonymous: true, showAmount: false, amount: 9999, currency: 'TWD', region: 'tw', active: true },
    { id: '3', displayName: 'Gone', active: false },
  ]);
  assert.strictEqual(v.length, 2);
  assert.strictEqual(v[0].displayName, 'Open');
  assert.strictEqual(v[0].amount, 5000);
  assert.strictEqual(v[1].displayName, '');
  assert.strictEqual(v[1].amount, null);
  assert.ok(!('note' in v[0]) && !('recordedBy' in v[0]));
});

test('requireAdmin needs the whitelist and, when configured, the token', () => {
  const req = (headers) => ({ headers });
  assert.deepStrictEqual(requireAdmin(req({}), 'nobody@x.com', {}), { status: 403, error: 'Forbidden' });
  assert.strictEqual(requireAdmin(req({}), 'hungry4grace@gmail.com', {}), null, 'no ADMIN_TOKEN → email-only');
  assert.deepStrictEqual(requireAdmin(req({}), 'hungry4grace@gmail.com', { ADMIN_TOKEN: 's3cret' }), { status: 401, error: 'admin token required' });
  assert.strictEqual(requireAdmin(req({ 'x-admin-token': 's3cret' }), 'HUNGRY4GRACE@gmail.com', { ADMIN_TOKEN: 's3cret' }), null);
  assert.strictEqual(requireAdmin(req({ authorization: 'Bearer s3cret' }), 'hungry4grace@gmail.com', { ADMIN_TOKEN: 's3cret' }), null);
  assert.deepStrictEqual(requireAdmin(req({ 'x-admin-token': 'wrong' }), 'hungry4grace@gmail.com', { ADMIN_TOKEN: 's3cret' }), { status: 401, error: 'admin token required' });
});

test('church pools: validation, public view, and who they pay', async () => {
  const { normalizeSponsor: ns, publicView: pv, poolAccepts } = await import('./sponsors.js');
  assert.throws(() => ns({ displayName: 'Grace', amount: 5000, scope: 'church' }), /churchCode/);
  assert.throws(() => ns({ displayName: 'Grace', amount: 5000, scope: 'church', churchCode: 'x' }), /churchCode/);
  const church = ns({ displayName: 'Grace Church', amount: 5000, scope: 'church', churchCode: ' grace tpe ', churchName: '恩典教會' });
  assert.strictEqual(church.scope, 'church');
  assert.strictEqual(church.churchCode, 'GRACE-TPE');
  assert.strictEqual(church.churchName, '恩典教會');
  const open = ns({ displayName: 'Anyone', amount: 100 });
  assert.strictEqual(open.scope, 'open');
  assert.strictEqual(open.churchCode, '');

  const view = pv([church, open], 'grace-tpe');
  assert.ok(!('churchCode' in view[0]), 'the code is never public');
  assert.strictEqual(view[0].churchName, '恩典教會');
  assert.strictEqual(view[0].mine, true);
  assert.strictEqual(pv([church], 'OTHER')[0].mine, false);
  assert.strictEqual(pv([open])[0].scope, 'open');

  assert.strictEqual(poolAccepts(open, { churchCode: '' }), true);
  assert.strictEqual(poolAccepts(church, { churchCode: 'grace-tpe' }), true);
  assert.strictEqual(poolAccepts(church, { churchCode: 'OTHER' }), false);
  assert.strictEqual(poolAccepts(church, {}), false);
  assert.strictEqual(poolAccepts({ ...open, active: false }, {}), false);
});
