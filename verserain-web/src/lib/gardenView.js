// Pure helpers for the garden view (no React): field math, search, list
// filtering/sorting, stage visuals and swipe detection. Kept out of the
// component so `node --test src/lib/gardenView.test.mjs` can exercise them.
//
// gardenData shape: { [verseRef]: { gridIndex, stage (1-10), fruits, setId },
//                     _activity: { 'YYYY-MM-DD': points } }

export const CELLS_PER_FIELD = 100;
export const FIELD_SIDE = 10;

// Where the up-to-nine apples sit on a fruited tree (percent of the sprite box).
export const APPLE_POSITIONS = [
  { top: '30%', left: '50%' },
  { top: '45%', left: '30%' },
  { top: '45%', left: '70%' },
  { top: '25%', left: '35%' },
  { top: '25%', left: '65%' },
  { top: '55%', left: '50%' },
  { top: '35%', left: '20%' },
  { top: '35%', left: '80%' },
  { top: '15%', left: '50%' },
];

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// A reference with no visible characters: empty, whitespace only, or just
// zero-width / bidi / BOM marks (pasted along with a custom verse's text).
// Such keys reach the garden from verse sets whose 出處 field was left blank.
export function isBlankRef(ref) {
  return !String(ref ?? '').replace(/[\s\u200b-\u200f\u2028-\u202f\u2060\ufeff]/gu, '');
}
const compact = (s) => norm(s).replace(/\s+/g, '');
// normalizeVerseReferenceKey returns "<bookId>|<chapter>[:<verses>]" when it
// recognised the book; anything else is the lowercased raw string.
const isRealKey = (k) => typeof k === 'string' && /^\d+\|/.test(k);

export function gardenEntries(gardenData) {
  const out = [];
  for (const [ref, d] of Object.entries(gardenData || {})) {
    if (ref === '_activity' || !d || typeof d !== 'object') continue;
    const gridIndex = Number(d.gridIndex);
    if (!Number.isFinite(gridIndex) || gridIndex < 0) continue;
    out.push({ ref, gridIndex, stage: Number(d.stage) || 0, fruits: Number(d.fruits) || 0, setId: d.setId || null });
  }
  out.sort((a, b) => a.gridIndex - b.gridIndex);
  return out;
}

export function fieldOfGridIndex(gridIndex) {
  return Math.floor(gridIndex / CELLS_PER_FIELD);
}

export function clampFieldIndex(i, fieldCount) {
  const max = Math.max(0, (fieldCount || 1) - 1);
  const v = Number.isFinite(i) ? Math.floor(i) : 0;
  return Math.min(max, Math.max(0, v));
}

export function buildFields(gardenData) {
  const entries = gardenEntries(gardenData);
  const gridMap = {};
  let maxGridIndex = -1;
  for (const e of entries) {
    gridMap[e.gridIndex] = e;
    if (e.gridIndex > maxGridIndex) maxGridIndex = e.gridIndex;
  }
  const fieldCount = Math.max(1, Math.ceil((maxGridIndex + 1) / CELLS_PER_FIELD));
  const perField = Array.from({ length: fieldCount }, (_, index) => ({ index, trees: 0, fullTrees: 0, fruits: 0 }));
  let fullTreeCount = 0;
  let fruitCount = 0;
  for (const e of entries) {
    const f = perField[fieldOfGridIndex(e.gridIndex)];
    f.trees += 1;
    f.fruits += e.fruits;
    fruitCount += e.fruits;
    if (e.stage >= 10) { f.fullTrees += 1; fullTreeCount += 1; }
  }
  return {
    entries,
    gridMap,
    fieldCount,
    latestFieldIndex: maxGridIndex < 0 ? 0 : fieldOfGridIndex(maxGridIndex),
    treeCount: entries.length,
    fullTreeCount,
    fruitCount,
    perField,
  };
}

// Locate a planted verse: exact reference → same normalized key (any language
// or script, e.g. 「诗 23:1」 finds 「詩篇 23:1」) → first substring hit in
// planting order. `opts.substring === false` disables the loose last step.
export function findGardenCell(entries, query, keyFn, opts = {}) {
  const q = norm(query);
  if (!q) return null;
  const list = entries || [];
  const exact = list.find((e) => norm(e.ref) === q);
  if (exact) return exact;
  if (keyFn) {
    const k = keyFn(query);
    if (isRealKey(k)) {
      const byKey = list.find((e) => keyFn(e.ref) === k);
      if (byKey) return byKey;
    }
  }
  if (opts.substring === false) return null;
  const c = compact(query);
  return list.find((e) => compact(e.ref).includes(c)) || null;
}

export function fieldOfRef(entries, ref, keyFn) {
  const e = findGardenCell(entries, ref, keyFn, { substring: false });
  return e ? fieldOfGridIndex(e.gridIndex) : -1;
}

// filter: 'all' | 'growing' (stage < 10) | 'full' (stage >= 10) | 'fruited' (fruits > 0)
export function filterGardenEntries(entries, { query = '', filter = 'all', keyFn } = {}) {
  let list = entries || [];
  if (filter === 'growing') list = list.filter((e) => e.stage < 10);
  else if (filter === 'full') list = list.filter((e) => e.stage >= 10);
  else if (filter === 'fruited') list = list.filter((e) => e.fruits > 0);
  const c = compact(query);
  if (!c) return list;
  let key = null;
  if (keyFn) {
    const k = keyFn(query);
    if (isRealKey(k)) key = k;
  }
  return list.filter((e) => {
    if (compact(e.ref).includes(c)) return true;
    if (key) {
      const ek = keyFn(e.ref);
      if (ek === key) return true;
      // chapter-only query ("約 3" → "43|3") matches every verse of that chapter
      if (!key.includes(':') && typeof ek === 'string' && ek.startsWith(key + ':')) return true;
    }
    return false;
  });
}

export function parseRefKey(key) {
  const m = /^(\d+)\|(\d+)(?::(\d+))?/.exec(String(key || ''));
  if (!m) return null;
  return { book: Number(m[1]), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : 0 };
}

// sort: 'planted' (gridIndex) | 'ref' (book, chapter, verse) | 'stage' (stage, fruits desc)
export function sortGardenEntries(entries, sort = 'planted', keyFn) {
  const list = [...(entries || [])];
  if (sort === 'stage') {
    list.sort((a, b) => (b.stage - a.stage) || (b.fruits - a.fruits) || (a.gridIndex - b.gridIndex));
  } else if (sort === 'ref') {
    const parsed = new Map();
    const p = (e) => {
      if (!parsed.has(e)) parsed.set(e, keyFn ? parseRefKey(keyFn(e.ref)) : null);
      return parsed.get(e);
    };
    list.sort((a, b) => {
      const pa = p(a);
      const pb = p(b);
      if (pa && pb) return (pa.book - pb.book) || (pa.chapter - pb.chapter) || (pa.verse - pb.verse) || (a.gridIndex - b.gridIndex);
      if (pa) return -1;
      if (pb) return 1;
      return a.ref.localeCompare(b.ref) || (a.gridIndex - b.gridIndex);
    });
  } else {
    list.sort((a, b) => a.gridIndex - b.gridIndex);
  }
  return list;
}

// [zh, en] pair for t(); thresholds match the original garden.
export function stageLabelPair(stage) {
  if (stage <= 1) return ['嫩芽', 'Seedling'];
  if (stage <= 3) return ['幼苗', 'Sprout'];
  if (stage <= 5) return ['小樹', 'Sapling'];
  if (stage <= 8) return ['成長中', 'Growing'];
  if (stage === 9) return ['快完成了', 'Almost there'];
  return ['大樹', 'Full Tree'];
}

export function stageBg(stage) {
  if (stage <= 0) return '#e8f5e9';
  if (stage <= 3) return '#c8e6c9';
  if (stage <= 6) return '#a5d6a7';
  if (stage <= 9) return '#81c784';
  return '#66bb6a';
}

export function timeOfDayTheme(hour) {
  const isNight = hour >= 19 || hour < 5;
  let envBg = 'linear-gradient(to bottom, #bae6fd, #e0f2fe)'; // day
  if (isNight) envBg = 'linear-gradient(to bottom, #0f172a, #1e1b4b)';
  else if (hour >= 17) envBg = 'linear-gradient(to bottom, #fca5a5, #fef08a)'; // sunset
  else if (hour >= 5 && hour < 8) envBg = 'linear-gradient(to bottom, #fce7f3, #fef08a)'; // sunrise
  return { envBg, fieldBg: isNight ? 'rgba(30, 41, 59, 0.4)' : 'rgba(34, 197, 94, 0.3)', isNight };
}

// Horizontal swipe classifier. dx < 0 (finger moved left) → 'left' = next field.
export function swipeDirection(dx, dy, { minDx = 50, maxDy = 80, ratio = 1.5 } = {}) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < minDx || ay > maxDy || ax < ay * ratio) return null;
  return dx < 0 ? 'left' : 'right';
}
