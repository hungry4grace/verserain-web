import { test } from 'node:test';
import assert from 'node:assert';
import { mergePendingReferees, personalCodesOf } from './referees.js';

test('personalCodesOf keeps only well-formed codes, deduped, at most five', () => {
  assert.deepStrictEqual(personalCodesOf(['瑞爸', 'gZvyq8PkXB', 'gZvyq8PkXB', 'Shds4UZmmn', 'bad-code', '']), ['gZvyq8PkXB', 'Shds4UZmmn']);
  assert.strictEqual(personalCodesOf(['A2A2A2A2A2', 'B2B2B2B2B2', 'C2C2C2C2C2', 'D2D2D2D2D2', 'E2E2E2E2E2', 'F2F2F2F2F2']).length, 5);
});

test('mergePendingReferees adds account-only referees as pending and keeps history rows first-class', () => {
  const history = [{ name: '芳芳', joinedAt: 1758326400000, referredCount: 0 }];
  const account = [
    { name: '芳芳', createdAt: '2026-09-19T00:00:00Z', passedVerses: 3 },
    { name: '顏競廷', createdAt: '2026-09-23T06:45:10.513Z', passedVerses: 0 },
    { name: '', createdAt: '2026-09-23T00:00:00Z' },
  ];
  const merged = mergePendingReferees(history, account);
  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[0].name, '顏競廷', 'newest first');
  assert.deepStrictEqual(merged[0], { name: '顏競廷', joinedAt: Date.parse('2026-09-23T06:45:10.513Z'), referredCount: 0, pending: true, passedVerses: 0 });
  assert.strictEqual(merged[1].pending, undefined, 'a history row is never marked pending');
  assert.strictEqual(merged[1].passedVerses, 3);
  assert.strictEqual(history[0].passedVerses, undefined, 'input untouched');
  assert.deepStrictEqual(mergePendingReferees([], null), []);
});
