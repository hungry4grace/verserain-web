// Pure, testable garden-sync logic shared by App.jsx.
//
// SAFETY INVARIANT: never overwrite the cloud copy with a local-only snapshot.
// If we cannot positively confirm what the cloud currently holds, a local-only
// fallback is used WITHOUT writing back to the server. This is what prevents the
// "回到上周 / 昨天的更新没了" data-loss class of bug.

// Field-level merge: keep the higher stage/fruits per verse, and union the
// _activity map keeping the max activity value per day. Monotonic — never drops.
export function mergeGardens(remoteGd, localGd) {
  remoteGd = remoteGd || {};
  localGd = localGd || {};
  const merged = { ...remoteGd };
  Object.entries(localGd).forEach(([ref, localEntry]) => {
    if (ref === '_activity') return; // handled separately below
    if (!localEntry || typeof localEntry !== 'object') return;
    if (!merged[ref]) {
      merged[ref] = localEntry;
    } else {
      merged[ref] = {
        ...merged[ref],
        stage: Math.max(merged[ref].stage || 0, localEntry.stage || 0),
        fruits: Math.max(merged[ref].fruits || 0, localEntry.fruits || 0),
      };
    }
  });
  const remoteAct = (remoteGd && remoteGd._activity) || {};
  const localAct = (localGd && localGd._activity) || {};
  const mergedAct = { ...remoteAct };
  Object.entries(localAct).forEach(([day, val]) => {
    mergedAct[day] = Math.max(mergedAct[day] || 0, val || 0);
  });
  merged._activity = mergedAct;
  return merged;
}

// ── Duplicate trees ─────────────────────────────────────────────────────────
// The same verse can be planted more than once when it was played from sets
// that spell the reference differently (「Isaiah 55:10–11」 vs 「Isaiah 55:10-11」,
// 「馬太福音 9:13」 vs 「마태복음 9:13」, trailing spaces, 简/繁). These helpers
// fold such entries into one tree. `keyFn` is App's verseRefKey: it returns
// "<bookId>|<c:v>" for any spelling it recognises, so the identity is
// language- and script-agnostic; unrecognised spellings fall back to the raw
// text with whitespace and dash variants folded.

const isRealKey = (k) => typeof k === 'string' && /^\d+\|/.test(k);
const looseKey = (ref) => String(ref || '').replace(/[–—]/g, '-').replace(/\s+/g, '').toLowerCase();
const hasVisibleText = (ref) => !!String(ref ?? '').replace(/[\s\u200b-\u200f\u2028-\u202f\u2060\ufeff]/gu, '');

// Identity of a planted reference, or null for a blank one (blank refs came
// from custom verses without 出處 and may each be a different verse — never
// merged).
export function canonicalGardenKey(ref, keyFn) {
  if (!hasVisibleText(ref)) return null;
  const k = keyFn ? keyFn(ref) : '';
  return isRealKey(k) ? k : 'raw:' + looseKey(ref);
}

// The key already in the garden that `ref` belongs to (exact key first, then
// the same canonical identity), or null when it is a new verse. updateGarden
// uses this so a verse played under another spelling grows the existing tree
// instead of planting a second one.
export function findGardenKey(gd, ref, keyFn) {
  if (!gd || typeof gd !== 'object' || typeof ref !== 'string') return null;
  if (ref === '_activity') return null;
  const own = Object.prototype.hasOwnProperty.call(gd, ref) && gd[ref] && typeof gd[ref] === 'object';
  if (own) return ref;
  const want = canonicalGardenKey(ref, keyFn);
  if (!want) return null;
  for (const [k, v] of Object.entries(gd)) {
    if (k === '_activity' || !v || typeof v !== 'object') continue;
    if (canonicalGardenKey(k, keyFn) === want) return k;
  }
  return null;
}

// Fold duplicate trees into one. The earliest planted (lowest gridIndex) key
// is kept in its cell; stage and fruits take the higher value (max, not sum,
// so re-applying over a cloud copy that still holds the duplicate cannot
// inflate anything); the dropped cells become empty ground.
// Returns { garden, mergedInto: { droppedRef: keptRef }, merged: count }.
export function dedupeGarden(gd, keyFn) {
  const out = { ...(gd || {}) };
  const groups = new Map();
  for (const [k, v] of Object.entries(gd || {})) {
    if (k === '_activity' || !v || typeof v !== 'object') continue;
    const c = canonicalGardenKey(k, keyFn);
    if (!c) continue;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(k);
  }
  const mergedInto = {};
  const gi = (k) => { const n = Number(out[k].gridIndex); return Number.isFinite(n) ? n : Infinity; };
  for (const keys of groups.values()) {
    if (keys.length < 2) continue;
    keys.sort((a, b) => (gi(a) - gi(b)) || a.localeCompare(b));
    const kept = keys[0];
    let entry = { ...out[kept] };
    for (const dropped of keys.slice(1)) {
      const e = out[dropped];
      entry = {
        ...entry,
        stage: Math.max(entry.stage || 0, e.stage || 0),
        fruits: Math.max(entry.fruits || 0, e.fruits || 0),
        ...(!entry.setId && e.setId ? { setId: e.setId } : {}),
      };
      delete out[dropped];
      mergedInto[dropped] = kept;
    }
    out[kept] = entry;
  }
  return { garden: out, mergedInto, merged: Object.keys(mergedInto).length };
}

// Every tree gets its own cell. Older data (and merges of gardens planted on
// several devices, each numbering from 0) can hold many trees on the same
// gridIndex — the field draws one per cell, so the rest were invisible — or
// none at all. The tree with the most progress keeps its cell; the others
// move, in a deterministic order, to the lowest free cells so every device
// computes the same layout. Returns { garden, moved: count }.
export function repackGardenCells(gd) {
  const out = { ...(gd || {}) };
  const entries = [];
  for (const [k, v] of Object.entries(out)) {
    if (k === '_activity' || !v || typeof v !== 'object') continue;
    const gi = Number(v.gridIndex);
    entries.push({ k, v, gi: Number.isFinite(gi) && gi >= 0 ? Math.floor(gi) : -1 });
  }
  const byCell = new Map();
  for (const e of entries) {
    if (e.gi < 0) continue;
    if (!byCell.has(e.gi)) byCell.set(e.gi, []);
    byCell.get(e.gi).push(e);
  }
  const rank = (a, b) => ((b.v.stage || 0) - (a.v.stage || 0)) || ((b.v.fruits || 0) - (a.v.fruits || 0)) || a.k.localeCompare(b.k);
  const used = new Set();
  const movers = [];
  for (const [gi, list] of byCell) {
    list.sort(rank);
    used.add(gi);
    for (const e of list.slice(1)) movers.push(e);
  }
  for (const e of entries) if (e.gi < 0) movers.push(e);
  if (!movers.length) return { garden: out, moved: 0 };
  const ord = (e) => (e.gi < 0 ? Infinity : e.gi); // cell-less entries go last
  movers.sort((a, b) => (ord(a) - ord(b)) || a.k.localeCompare(b.k));
  let next = 0;
  for (const e of movers) {
    while (used.has(next)) next++;
    used.add(next);
    out[e.k] = { ...e.v, gridIndex: next };
  }
  return { garden: out, moved: movers.length };
}

// Test-fixture trees ("FakeVerse 0" … "FakeVerse 153") were once injected
// into a few gardens by a dev script to stress the grid. They are not verses:
// their text never resolves and they count as plants on the map. Both the
// client and the PartyKit server drop them on every read/write so a stale
// device copy can never plant them again.
const TEST_FIXTURE_REF_RE = /^FakeVerse \d+$/;
export function isTestFixtureRef(ref) {
  return typeof ref === 'string' && TEST_FIXTURE_REF_RE.test(ref);
}

// Returns { garden, dropped: [refs] } with every fixture tree removed.
export function dropTestFixtures(gd) {
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(gd || {})) {
    if (isTestFixtureRef(k)) { dropped.push(k); continue; }
    out[k] = v;
  }
  return { garden: out, dropped };
}

// Everything the garden does on the way in: drop test fixtures, fold
// duplicate trees, then give every tree its own cell. Idempotent.
export function tidyGarden(gd, keyFn) {
  const d = dedupeGarden(dropTestFixtures(gd).garden, keyFn);
  const r = repackGardenCells(d.garden);
  return { garden: r.garden, mergedInto: d.mergedInto, merged: d.merged, moved: r.moved };
}

// Stamp today's login activity (>= 100) without lowering an existing value.
export function stampTodayLogin(gd, todayStr) {
  const day = todayStr || new Date().toLocaleDateString('en-CA');
  const out = { ...(gd || {}) };
  out._activity = { ...(out._activity || {}) };
  if ((out._activity[day] || 0) < 100) out._activity[day] = 100;
  return out;
}

// Classify a fetch Response into one of three trust levels.
//   ok       -> 200, remote data is trustworthy (safe to merge + push)
//   empty    -> 404, brand-new player (safe to push local up)
//   unknown  -> any other status (DO NOT push local up — could clobber remote)
export async function classifyGardenResponse(r) {
  if (r && r.ok) {
    const data = await r.json().catch(() => null);
    const remoteGd = (data && data.gardenData && typeof data.gardenData === 'object') ? data.gardenData : {};
    return { kind: 'ok', remoteGd };
  }
  if (r && r.status === 404) return { kind: 'empty' };
  return { kind: 'unknown' };
}

// Given the classification + local garden, decide the next state.
// Returns { garden, shouldPushToCloud }.
//   - unknown  -> local-only, shouldPushToCloud = false  (the critical fix)
//   - ok/empty -> merged,     shouldPushToCloud = true
export function decideGardenSync(classification, localGd, todayStr) {
  if (!classification || classification.kind === 'unknown') {
    return { garden: stampTodayLogin(localGd, todayStr), shouldPushToCloud: false };
  }
  const remoteGd = classification.kind === 'ok' ? classification.remoteGd : {};
  let merged = mergeGardens(remoteGd, localGd);
  // Blank-reference trees (custom verses saved without 出處) are legacy: new
  // ones are no longer planted, so a blank key on this device can only be a
  // copy of what the cloud once held. When the cloud copy is confirmed and no
  // longer has it — an admin re-keyed it to the real reference — drop the
  // local one too; otherwise this device would show it forever.
  if (classification.kind === 'ok') merged = dropBlankKeysMissingFrom(merged, remoteGd);
  merged = stampTodayLogin(merged, todayStr);
  return { garden: merged, shouldPushToCloud: true };
}

export function dropBlankKeysMissingFrom(gd, authority) {
  const out = {};
  for (const [k, v] of Object.entries(gd || {})) {
    if (k !== '_activity' && !hasVisibleText(k) && !(authority && Object.prototype.hasOwnProperty.call(authority, k))) continue;
    out[k] = v;
  }
  return out;
}

// Build the deduped list of point-bucket keys to query for a logged-in user:
// playerName (authoring) + current personalCode (referrals) + any previous
// codes this device used before adopting the account's canonical code. Including
// old codes ensures historic referral fruits aren't lost after code unification.
export function buildFruitAuthorKeys(playerName, personalCode, prevCodes) {
  const list = [playerName, personalCode, ...(Array.isArray(prevCodes) ? prevCodes : [])];
  return Array.from(new Set(list.filter((k) => k && typeof k === 'string')));
}

// Sum points across the per-key API responses (dedup already handled by keys).
export function aggregateFruitResults(results) {
  let creator = 0, referral = 0, creatorHist = [], refHist = [];
  for (const d of results || []) {
    if (!d) continue;
    creator += (d.points || 0);
    referral += (d.referralPoints || 0);
    creatorHist = creatorHist.concat(d.creatorHistory || []);
    refHist = refHist.concat(d.referralHistory || []);
  }
  creatorHist.sort((a, b) => b.timestamp - a.timestamp);
  refHist.sort((a, b) => b.timestamp - a.timestamp);
  return { creator, referral, total: creator + referral, creatorHist, refHist };
}
