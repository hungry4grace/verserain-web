// Pulls the Traditional-Chinese (CUV) verse sets out of the main verserain-web
// app and writes a single flat JSON file this standalone app can ship.
//
//   node scripts/sync-verses.mjs
//
// Re-run whenever the source verse files change. Keeps this app self-contained
// (no cross-folder imports at build/runtime) while staying in sync with the
// canonical content in ../verserain-web/src.
//
// The source files use extensionless relative imports (Vite-style), which Node
// ESM can't resolve directly — so we bundle the entry with esbuild first, then
// import the bundle.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from '../../verserain-web/node_modules/esbuild/lib/main.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../verserain-web/src');
const OUT = resolve(here, '../src/data/verses.json');
const TMP = resolve(here, '.verses-bundle.mjs');

// Bundle a tiny entry that re-exports the two verse modules we need.
const entry = resolve(here, '.verses-entry.mjs');
writeFileSync(
  entry,
  `export { VERSE_SETS } from ${JSON.stringify(resolve(SRC, 'verses.js'))};\n` +
    `export { VERSE_SETS_PROVERBS_ZH } from ${JSON.stringify(resolve(SRC, 'verses_proverbs.js'))};\n`,
  'utf8',
);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: TMP,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(TMP).href);

// Match the 'cuv' ordering used by verseLoader.js: Proverbs first, then the
// core topical / book sets (Psalms are already folded into VERSE_SETS).
const rawSets = [
  ...(mod.VERSE_SETS_PROVERBS_ZH || []),
  ...(mod.VERSE_SETS || []),
];

// Keep only what a blind-first listen/memorize app needs. Drop empty sets.
const sets = rawSets
  .filter((s) => Array.isArray(s?.verses) && s.verses.length)
  .map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description || '',
    verses: s.verses
      .filter((v) => v?.reference && v?.text)
      .map((v) => ({ id: v.id, reference: v.reference, text: String(v.text).trim() })),
  }))
  .filter((s) => s.verses.length);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ lang: 'zh-TW', sets }), 'utf8');

rmSync(entry, { force: true });
rmSync(TMP, { force: true });

const verseCount = sets.reduce((n, s) => n + s.verses.length, 0);
console.log(`✓ Wrote ${sets.length} sets / ${verseCount} verses → ${OUT}`);
