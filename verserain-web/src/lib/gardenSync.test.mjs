// Tests the pure sync logic that App.jsx actually imports and runs.
import assert from 'node:assert';
import {
  mergeGardens, stampTodayLogin, classifyGardenResponse,
  decideGardenSync, buildFruitAuthorKeys, aggregateFruitResults,
  canonicalGardenKey, findGardenKey, dedupeGarden, repackGardenCells, tidyGarden,
} from './gardenSync.js';

const TODAY = '2026-06-16';
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}
const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

console.log('frontend garden-sync decisions:');

await test('NON-200 response => do NOT push to cloud (the回退 fix)', async () => {
  const local = { 'John 3:16': { stage: 2, fruits: 1 } };
  const cls = await classifyGardenResponse(resp(500, null));
  const d = decideGardenSync(cls, local, TODAY);
  assert.strictEqual(d.shouldPushToCloud, false, 'must not overwrite cloud on 500');
  assert.ok(d.garden['John 3:16'], 'local still shown');
});

await test('network error (unknown) => do NOT push to cloud', async () => {
  const local = { 'Ps 23:1': { stage: 5, fruits: 3 } };
  const d = decideGardenSync({ kind: 'unknown' }, local, TODAY);
  assert.strictEqual(d.shouldPushToCloud, false);
});

await test('200 with remote => merge and push', async () => {
  const local = { 'John 3:16': { stage: 2, fruits: 1 } };
  const remote = { gardenData: { 'John 3:16': { stage: 9, fruits: 4 }, 'Ps 23:1': { stage: 1, fruits: 0 } } };
  const cls = await classifyGardenResponse(resp(200, remote));
  const d = decideGardenSync(cls, local, TODAY);
  assert.strictEqual(d.shouldPushToCloud, true);
  assert.strictEqual(d.garden['John 3:16'].stage, 9, 'higher remote stage kept');
  assert.strictEqual(d.garden['John 3:16'].fruits, 4);
  assert.ok(d.garden['Ps 23:1'], 'remote-only verse preserved');
});

await test('404 (new player) => safe to push local up', async () => {
  const local = { 'John 3:16': { stage: 3, fruits: 2 } };
  const cls = await classifyGardenResponse(resp(404, null));
  const d = decideGardenSync(cls, local, TODAY);
  assert.strictEqual(d.shouldPushToCloud, true);
  assert.strictEqual(d.garden['John 3:16'].stage, 3);
});

await test('merge keeps higher local value when local is ahead', async () => {
  const m = mergeGardens({ 'A': { stage: 1, fruits: 1 } }, { 'A': { stage: 4, fruits: 0 } });
  assert.strictEqual(m['A'].stage, 4);
  assert.strictEqual(m['A'].fruits, 1);
});

await test('activity days are unioned across remote+local', async () => {
  const m = mergeGardens({ _activity: { '2026-06-15': 1000 } }, { _activity: { '2026-06-14': 100 } });
  assert.strictEqual(m._activity['2026-06-15'], 1000);
  assert.strictEqual(m._activity['2026-06-14'], 100);
});

await test('stampTodayLogin sets today >=100 without lowering existing', async () => {
  assert.strictEqual(stampTodayLogin({}, TODAY)._activity[TODAY], 100);
  assert.strictEqual(stampTodayLogin({ _activity: { [TODAY]: 1000 } }, TODAY)._activity[TODAY], 1000);
});

console.log('\nfruit aggregation (果子两端一致):');

await test('author keys dedupe playerName/code/prev', () => {
  const keys = buildFruitAuthorKeys('Nate', 'CodeX', ['CodeOld', 'CodeX', '']);
  assert.deepStrictEqual([...keys].sort(), ['CodeOld', 'CodeX', 'Nate'].sort());
});

await test('aggregate sums points across all keys incl. old code', () => {
  const results = [
    { points: 10, referralPoints: 0, creatorHistory: [{ timestamp: 2 }], referralHistory: [] },
    { points: 0, referralPoints: 5, creatorHistory: [], referralHistory: [{ timestamp: 1 }] },  // current code
    { points: 0, referralPoints: 7, creatorHistory: [], referralHistory: [{ timestamp: 3 }] },  // old code — must be counted
    null,
  ];
  const agg = aggregateFruitResults(results);
  assert.strictEqual(agg.creator, 10);
  assert.strictEqual(agg.referral, 12, 'old-code referral fruits must be included');
  assert.strictEqual(agg.total, 22);
  assert.deepStrictEqual(agg.refHist.map(h => h.timestamp), [3, 1], 'sorted desc');
});

console.log('\nduplicate trees (同一節經文、不同拼法):');

// Stand-in for App's verseRefKey: "<bookId>|<c:v>" for spellings it knows.
const BOOKS = { 'isaiah': 23, '以賽亞書': 23, '賽': 23, '馬太福音': 40, '마태복음': 40, 'matthew': 40 };
const keyFn = (ref) => {
  const m = /^(\S+)\s+(\d+):(\d+)(?:[-–](\d+))?\s*$/.exec(String(ref).replace(/\s+/g, ' ').trim());
  const id = m && (BOOKS[m[1]] ?? BOOKS[m[1].toLowerCase()]);
  return id ? `${id}|${m[2]}:${m[3]}${m[4] ? '-' + m[4] : ''}` : String(ref).toLowerCase();
};

await test('canonical key: language/script/dash/space variants collapse; blank has none', () => {
  assert.strictEqual(canonicalGardenKey('Isaiah 55:10–11', keyFn), '23|55:10-11');
  assert.strictEqual(canonicalGardenKey('Isaiah 55:10-11 ', keyFn), '23|55:10-11');
  assert.strictEqual(canonicalGardenKey('馬太福音 9:13', keyFn), canonicalGardenKey('마태복음 9:13', keyFn));
  assert.strictEqual(canonicalGardenKey('FakeVerse 0', keyFn), canonicalGardenKey('fakeverse  0', keyFn), 'unknown books fold spacing/case');
  assert.notStrictEqual(canonicalGardenKey('FakeVerse 0', keyFn), canonicalGardenKey('FakeVerse 1', keyFn));
  assert.strictEqual(canonicalGardenKey('   ', keyFn), null);
});

await test('dedupeGarden keeps the earliest cell, takes max stage/fruits, drops the rest', () => {
  const gd = {
    'Isaiah 55:10–11': { gridIndex: 12, stage: 4, fruits: 0, setId: null },
    'Isaiah 55:10-11': { gridIndex: 3, stage: 10, fruits: 2, setId: 'daily' },
    '마태복음 9:13': { gridIndex: 20, stage: 2, fruits: 0 },
    '馬太福音 9:13': { gridIndex: 21, stage: 9, fruits: 1 },
    '賽 55:10-11': { gridIndex: 30, stage: 1, fruits: 0 },
    ' ': { gridIndex: 5, stage: 1, fruits: 0 },
    '\u200b': { gridIndex: 6, stage: 1, fruits: 0 },
    _activity: { '2026-09-20': 500 },
  };
  const { garden, mergedInto, merged } = dedupeGarden(gd, keyFn);
  assert.strictEqual(merged, 3);
  assert.deepStrictEqual(mergedInto, { 'Isaiah 55:10–11': 'Isaiah 55:10-11', '賽 55:10-11': 'Isaiah 55:10-11', '馬太福音 9:13': '마태복음 9:13' });
  assert.deepStrictEqual(garden['Isaiah 55:10-11'], { gridIndex: 3, stage: 10, fruits: 2, setId: 'daily' });
  assert.deepStrictEqual(garden['마태복음 9:13'], { gridIndex: 20, stage: 9, fruits: 1 }, 'kept cell, higher stage/fruits from the duplicate');
  assert.strictEqual(garden['Isaiah 55:10–11'], undefined);
  assert.strictEqual(garden['賽 55:10-11'], undefined);
  assert.ok(garden[' '] && garden['\u200b'], 'blank refs are never merged with each other');
  assert.deepStrictEqual(garden._activity, { '2026-09-20': 500 });
  assert.strictEqual(gd['Isaiah 55:10–11'].stage, 4, 'input untouched');
});

await test('dedupeGarden is idempotent and re-applies cleanly over a cloud copy that still has the duplicate', () => {
  const once = dedupeGarden({
    'A 1:1': { gridIndex: 0, stage: 3, fruits: 1 },
    'a 1:1': { gridIndex: 9, stage: 5, fruits: 2 },
  }, keyFn);
  const again = dedupeGarden(once.garden, keyFn);
  assert.strictEqual(again.merged, 0);
  // server still holds the dropped key → mergeGardens brings it back → dedupe folds it again without inflating
  const remote = { 'A 1:1': { gridIndex: 0, stage: 5, fruits: 2 }, 'a 1:1': { gridIndex: 9, stage: 5, fruits: 2 } };
  const third = dedupeGarden(mergeGardens(remote, once.garden), keyFn);
  assert.deepStrictEqual(third.garden['A 1:1'], { gridIndex: 0, stage: 5, fruits: 2 });
  assert.strictEqual(third.garden['a 1:1'], undefined);
});

await test('findGardenKey: exact key, then same verse under another spelling, else null', () => {
  const gd = { 'Isaiah 55:10-11': { gridIndex: 3, stage: 1 }, '마태복음 9:13': { gridIndex: 20, stage: 2 }, _activity: {} };
  assert.strictEqual(findGardenKey(gd, 'Isaiah 55:10-11', keyFn), 'Isaiah 55:10-11');
  assert.strictEqual(findGardenKey(gd, '以賽亞書 55:10–11', keyFn), 'Isaiah 55:10-11');
  assert.strictEqual(findGardenKey(gd, '馬太福音 9:13', keyFn), '마태복음 9:13');
  assert.strictEqual(findGardenKey(gd, 'Matthew 9:14', keyFn), null);
  assert.strictEqual(findGardenKey(gd, '_activity', keyFn), null, 'never resolves to the activity map');
  assert.strictEqual(findGardenKey(gd, '  ', keyFn), null);
});

console.log('\none tree per cell (格子編號重複):');

await test('repackGardenCells: the strongest tree keeps the cell, the rest move to the lowest free cells', () => {
  const gd = {
    'A 1:1': { gridIndex: 0, stage: 3, fruits: 0 },
    'B 1:1': { gridIndex: 0, stage: 10, fruits: 2 },
    'C 1:1': { gridIndex: 0, stage: 3, fruits: 1 },
    'D 1:1': { gridIndex: 2, stage: 1, fruits: 0 },
    'E 1:1': { gridIndex: 2, stage: 1, fruits: 0 },
    'F 1:1': { stage: 5, fruits: 0 },            // legacy: no cell at all → was invisible
    _activity: { '2026-09-20': 100 },
  };
  const { garden, moved } = repackGardenCells(gd);
  assert.strictEqual(moved, 4);
  assert.strictEqual(garden['B 1:1'].gridIndex, 0, 'highest stage keeps cell 0');
  assert.strictEqual(garden['D 1:1'].gridIndex, 2, 'tie → key order keeps the cell');
  // movers (A, C from cell 0; E from cell 2) in (old cell, key) order take 1, 3, 4; the cell-less F goes last
  assert.strictEqual(garden['A 1:1'].gridIndex, 1);
  assert.strictEqual(garden['C 1:1'].gridIndex, 3);
  assert.strictEqual(garden['E 1:1'].gridIndex, 4);
  assert.strictEqual(garden['F 1:1'].gridIndex, 5);
  assert.deepStrictEqual(garden['B 1:1'], { gridIndex: 0, stage: 10, fruits: 2 }, 'progress untouched');
  assert.deepStrictEqual(garden._activity, { '2026-09-20': 100 });
  assert.strictEqual(gd['A 1:1'].gridIndex, 0, 'input untouched');
  assert.strictEqual(repackGardenCells(garden).moved, 0, 'idempotent');
  assert.strictEqual(repackGardenCells({ 'A 1:1': { gridIndex: 7, stage: 1 } }).moved, 0, 'nothing to do');
});

await test('tidyGarden: dedupe first (frees cells), then repack; same result from any device', () => {
  const gd = {
    'Isaiah 55:10-11': { gridIndex: 0, stage: 2, fruits: 0 },
    'Isaiah 55:10–11': { gridIndex: 1, stage: 9, fruits: 1 },   // duplicate → folded into cell 0, cell 1 freed
    'Matthew 9:13': { gridIndex: 0, stage: 4, fruits: 0 },      // collides with cell 0 → moves to the freed cell 1
    '마태복음 9:13': { gridIndex: 0, stage: 1, fruits: 0 },       // duplicate of Matthew → folded
  };
  const a = tidyGarden(gd, keyFn);
  assert.strictEqual(a.merged, 2);
  assert.strictEqual(a.moved, 1);
  assert.deepStrictEqual(a.mergedInto, { 'Isaiah 55:10–11': 'Isaiah 55:10-11', '마태복음 9:13': 'Matthew 9:13' });
  assert.deepStrictEqual(a.garden, {
    'Isaiah 55:10-11': { gridIndex: 0, stage: 9, fruits: 1 },
    'Matthew 9:13': { gridIndex: 1, stage: 4, fruits: 0 },
  });
  const b = tidyGarden(mergeGardens(gd, a.garden), keyFn); // stale cloud copy merged back in
  const { _activity, ...bTrees } = b.garden; // mergeGardens always adds the activity map
  assert.deepStrictEqual(bTrees, a.garden, 'stable layout after a re-merge');
});

console.log(`\n${passed} assertions passed.`);
