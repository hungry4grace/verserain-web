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

test('dropForeignCodes keeps my names, my linked codes and unmapped codes, drops codes owned by someone else', () => {
  const mapping = { jBx9CwYnk7: '瑞爸', Shds4UZmmn: '黃國瑞 David', gZvyq8PkXB: '瑞爸' };
  // David's device still remembers 瑞爸's old device code.
  assert.deepStrictEqual(
    dropForeignCodes(['黃國瑞 David', 'Shds4UZmmn', 'jBx9CwYnk7', 'ZZZZZZZZZZ'], { mapping, linked: [] }),
    ['黃國瑞 David', 'Shds4UZmmn', 'ZZZZZZZZZZ'],
  );
  // 瑞爸 keeps it: mapped to his own name.
  assert.deepStrictEqual(dropForeignCodes(['瑞爸', 'gZvyq8PkXB', 'jBx9CwYnk7'], { mapping }), ['瑞爸', 'gZvyq8PkXB', 'jBx9CwYnk7']);
  // A code explicitly linked to the account always stays, even if the mapping says otherwise.
  assert.deepStrictEqual(dropForeignCodes(['黃國瑞 David', 'jBx9CwYnk7'], { mapping, linked: ['jBx9CwYnk7'] }), ['黃國瑞 David', 'jBx9CwYnk7']);
  // Linked old name makes that name's codes mine too.
  assert.deepStrictEqual(dropForeignCodes(['新名字', 'gZvyq8PkXB'], { mapping, linked: ['瑞爸'] }), ['新名字', 'gZvyq8PkXB']);
  assert.deepStrictEqual(dropForeignCodes([], {}), []);
});
