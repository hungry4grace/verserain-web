import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELLS_PER_FIELD, buildFields, clampFieldIndex, fieldOfRef, findGardenCell,
  filterGardenEntries, sortGardenEntries, parseRefKey, stageLabelPair, stageBg,
  timeOfDayTheme, swipeDirection,
} from './gardenView.js';

// Tiny stand-in for normalizeVerseReferenceKey: "<book>|<c>:<v>" for a few spellings.
const BOOKS = { '約': 43, '約翰福音': 43, '约': 43, 'john': 43, '詩': 19, '诗': 19, '詩篇': 19, '箴': 20 };
const keyFn = (ref) => {
  const m = /^(\S+)\s+(\d+)(?::(\d+))?/.exec(String(ref).trim());
  if (!m) return String(ref).toLowerCase();
  const id = BOOKS[m[1]] ?? BOOKS[m[1].toLowerCase()];
  return id ? `${id}|${m[2]}${m[3] ? ':' + m[3] : ''}` : String(ref).toLowerCase();
};

const garden = {
  '約 3:16': { gridIndex: 0, stage: 10, fruits: 3, setId: 'a' },
  '詩 23:1': { gridIndex: 1, stage: 4, fruits: 0 },
  '箴 3:5': { gridIndex: 105, stage: 10, fruits: 0 },
  '約 3:9': { gridIndex: 250, stage: 1, fruits: 0 },
  'Weird Ref': { gridIndex: 7, stage: 2, fruits: 0 },
  _activity: { '2026-09-20': 100 },
};

test('buildFields: empty garden still has one field', () => {
  const f = buildFields({});
  assert.equal(f.fieldCount, 1);
  assert.equal(f.latestFieldIndex, 0);
  assert.deepEqual(f.perField, [{ index: 0, trees: 0, fullTrees: 0, fruits: 0 }]);
  assert.equal(buildFields(null).treeCount, 0);
});

test('buildFields: fields grow with the highest gridIndex; per-field counts', () => {
  const f = buildFields(garden);
  assert.equal(f.fieldCount, 3);
  assert.equal(f.latestFieldIndex, 2);
  assert.equal(f.treeCount, 5);
  assert.equal(f.fullTreeCount, 2);
  assert.equal(f.fruitCount, 3);
  assert.deepEqual(f.perField.map((p) => [p.trees, p.fullTrees, p.fruits]), [[3, 1, 3], [1, 1, 0], [1, 0, 0]]);
  assert.equal(f.gridMap[105].ref, '箴 3:5');
  assert.equal(f.entries[0].gridIndex, 0, 'entries sorted by gridIndex');
});

test('clampFieldIndex', () => {
  assert.equal(clampFieldIndex(5, 3), 2);
  assert.equal(clampFieldIndex(-1, 3), 0);
  assert.equal(clampFieldIndex(NaN, 3), 0);
  assert.equal(clampFieldIndex(1, 0), 0);
});

test('findGardenCell: exact > key (cross-script) > substring, in planting order', () => {
  const { entries } = buildFields(garden);
  assert.equal(findGardenCell(entries, '詩 23:1', keyFn).gridIndex, 1);
  assert.equal(findGardenCell(entries, '诗 23:1', keyFn).gridIndex, 1, 'simplified spelling via keyFn');
  assert.equal(findGardenCell(entries, '約翰福音 3:9', keyFn).gridIndex, 250);
  assert.equal(findGardenCell(entries, '3:', keyFn).gridIndex, 0, 'substring: first by gridIndex');
  assert.equal(findGardenCell(entries, 'weird', keyFn).ref, 'Weird Ref');
  assert.equal(findGardenCell(entries, '', keyFn), null);
  assert.equal(findGardenCell(entries, 'nope', keyFn), null);
  assert.equal(findGardenCell(entries, '3:', keyFn, { substring: false }), null);
});

test('fieldOfRef', () => {
  const { entries } = buildFields(garden);
  assert.equal(fieldOfRef(entries, '箴 3:5', keyFn), 1);
  assert.equal(fieldOfRef(entries, '约 3:9', keyFn), 2);
  assert.equal(fieldOfRef(entries, 'missing', keyFn), -1);
});

test('filterGardenEntries: filters and query', () => {
  const { entries } = buildFields(garden);
  assert.equal(filterGardenEntries(entries, { filter: 'growing' }).length, 3);
  assert.equal(filterGardenEntries(entries, { filter: 'full' }).length, 2);
  assert.equal(filterGardenEntries(entries, { filter: 'fruited' }).length, 1);
  assert.deepEqual(filterGardenEntries(entries, { query: '約', keyFn }).map((e) => e.ref), ['約 3:16', '約 3:9']);
  assert.deepEqual(filterGardenEntries(entries, { query: '约 3', keyFn }).map((e) => e.ref), ['約 3:16', '約 3:9'], 'chapter-only key matches the chapter');
  assert.deepEqual(filterGardenEntries(entries, { query: 'john 3:16', keyFn }).map((e) => e.ref), ['約 3:16']);
  assert.deepEqual(filterGardenEntries(entries, { query: '約', filter: 'full', keyFn }).map((e) => e.ref), ['約 3:16']);
});

test('sortGardenEntries: planted / ref / stage', () => {
  const { entries } = buildFields(garden);
  assert.deepEqual(sortGardenEntries(entries, 'planted').map((e) => e.gridIndex), [0, 1, 7, 105, 250]);
  assert.deepEqual(sortGardenEntries(entries, 'ref', keyFn).map((e) => e.ref), ['詩 23:1', '箴 3:5', '約 3:9', '約 3:16', 'Weird Ref'], '3:9 before 3:16; unparsable last');
  assert.deepEqual(sortGardenEntries(entries, 'stage').map((e) => e.ref), ['約 3:16', '箴 3:5', '詩 23:1', 'Weird Ref', '約 3:9']);
});

test('parseRefKey', () => {
  assert.deepEqual(parseRefKey('43|3:16-17'), { book: 43, chapter: 3, verse: 16 });
  assert.deepEqual(parseRefKey('19|23'), { book: 19, chapter: 23, verse: 0 });
  assert.equal(parseRefKey('weird ref'), null);
});

test('stage visuals thresholds', () => {
  assert.deepEqual([1, 3, 5, 8, 9, 10].map((s) => stageLabelPair(s)[0]), ['嫩芽', '幼苗', '小樹', '成長中', '快完成了', '大樹']);
  assert.deepEqual([0, 3, 6, 9, 10].map(stageBg), ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a']);
  assert.equal(timeOfDayTheme(22).isNight, true);
  assert.equal(timeOfDayTheme(12).isNight, false);
  assert.match(timeOfDayTheme(18).envBg, /fca5a5/);
});

test('swipeDirection', () => {
  assert.equal(swipeDirection(-60, 10), 'left');
  assert.equal(swipeDirection(60, -10), 'right');
  assert.equal(swipeDirection(30, 0), null, 'too short');
  assert.equal(swipeDirection(60, 90), null, 'too vertical');
  assert.equal(swipeDirection(60, 50), null, 'not horizontal enough');
  assert.equal(CELLS_PER_FIELD, 100);
});
