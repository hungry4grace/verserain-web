import { test } from 'node:test';
import assert from 'node:assert';
import { mergePendingReferees, personalCodesOf, dropForeignCodes } from './referees.js';

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

test('dropForeignCodes: the mapping decides; a code owned by another name is dropped even if linked', () => {
  const mapping = { jBx9CwYnk7: '瑞爸', Shds4UZmmn: '黃國瑞 David', gZvyq8PkXB: '瑞爸' };
  // David's device still remembers 瑞爸's device code, and it even got auto-linked.
  assert.deepStrictEqual(
    dropForeignCodes(['黃國瑞 David', 'Shds4UZmmn', 'jBx9CwYnk7', 'ZZZZZZZZZZ'], { mapping, linked: ['jBx9CwYnk7'] }),
    ['黃國瑞 David', 'Shds4UZmmn', 'ZZZZZZZZZZ'],
  );
  // 瑞爸 keeps it: mapped to his own name.
  assert.deepStrictEqual(dropForeignCodes(['瑞爸', 'gZvyq8PkXB', 'jBx9CwYnk7'], { mapping }), ['瑞爸', 'gZvyq8PkXB', 'jBx9CwYnk7']);
  // A linked old NAME makes that name's codes mine.
  assert.deepStrictEqual(dropForeignCodes(['新名字', 'gZvyq8PkXB'], { mapping, linked: ['瑞爸'] }), ['新名字', 'gZvyq8PkXB']);
  // Unmapped codes are kept; names always kept.
  assert.deepStrictEqual(dropForeignCodes(['Amy', 'QQQQQQQQQQ'], { mapping }), ['Amy', 'QQQQQQQQQQ']);
  assert.deepStrictEqual(dropForeignCodes([], {}), []);
});
