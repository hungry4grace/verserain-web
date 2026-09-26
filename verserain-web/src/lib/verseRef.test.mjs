// Tests the shared Bible-reference normalization used by both the frontend
// (garden lookups, verse-set icons) and the backend (contest completion/score).
import assert from 'node:assert';
import { verseRefKey } from './verseRef.js';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

console.log('verseRefKey — cross-language/spelling normalization:');

await test('Revelation: "啓" (U+5553) variant spelling matches the canonical "啟" (U+555F)', () => {
  // 「啓」is a common variant codepoint for 「啟」— visually near-identical, same
  // word, but a different character, so a naive lookup misses it. Regression
  // for a user who typed 「啓示錄 13:8」/「啓 13:8」and got "could not match".
  assert.strictEqual(verseRefKey('啓示錄 13:8'), verseRefKey('啟示錄 13:8'));
  assert.strictEqual(verseRefKey('啓 13:8'), verseRefKey('啟 13:8'));
  assert.strictEqual(verseRefKey('啓示錄 13:8'), '66|13:8');
});

await test('Revelation: traditional/simplified/English all agree', () => {
  const k = verseRefKey('Revelation 13:8');
  assert.strictEqual(verseRefKey('啟示錄 13:8'), k);
  assert.strictEqual(verseRefKey('启示录 13:8'), k);
  assert.strictEqual(verseRefKey('Rev 13:8'), k);
});

console.log(`\n${passed} assertions passed.`);
