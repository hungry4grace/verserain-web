#!/usr/bin/env node
// Build src/verses_tw.js — 台語漢字本 (Taiwanese Hokkien, Han-character
// edition of the Barclay translation) mirrors of every topic set in
// src/verses.js, scraped from lingshyang.com/taiwan_Bible.
//
// Usage:  node scripts/build-verses-tw.mjs           (writes src/verses_tw.js)
//         node scripts/build-verses-tw.mjs --dry     (report only, no write)
//
// Pages are cached under .cache-taibible/ next to this script so re-runs
// don't refetch. Delete that directory to force a refresh.
//
// The site renders a handful of rare Taiwanese characters as <img> glyphs;
// GLYPH_MAP translates each image filename to its Unicode character
// (Taiwan MOE recommended forms). The script FAILS on an unmapped glyph so
// a new one can never silently corrupt text.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.resolve(HERE, '..', 'src');
const CACHE = path.join(HERE, '.cache-taibible');
const BASE = 'https://lingshyang.com/taiwan_Bible';
const DRY = process.argv.includes('--dry');

// ── Site book codes ────────────────────────────────────────────────────────
const BOOK_CODE = {
  '創世記': 'gen', '創世紀': 'gen', '出埃及記': 'exo', '利未記': 'lev', '民數記': 'num',
  '申命記': 'deu', '約書亞記': 'jos', '士師記': 'jug', '路得記': 'rut',
  '撒母耳記上': '1sa', '撒母耳記下': '2sa', '列王紀上': '1ki', '列王記上': '1ki',
  '列王紀下': '2ki', '列王記下': '2ki', '歷代志上': '1ch', '歷代志下': '2ch',
  '以斯拉記': 'ezr', '尼希米記': 'neh', '以斯帖記': 'est', '約伯記': 'job',
  '詩篇': 'psm', '箴言': 'pro', '傳道書': 'ecc', '雅歌': 'son',
  '以賽亞書': 'isa', '耶利米書': 'jer', '耶利米哀歌': 'lam', '以西結書': 'eze',
  '但以理書': 'dan', '何西阿書': 'hos', '約珥書': 'joe', '阿摩司書': 'amo',
  '俄巴底亞書': 'oba', '約拿書': 'jon', '彌迦書': 'mic', '那鴻書': 'nah',
  '哈巴谷書': 'hab', '西番雅書': 'zep', '哈該書': 'hag', '撒迦利亞書': 'zec',
  '撒迦利亞': 'zec', '瑪拉基書': 'mal',
  '馬太福音': 'mat', '馬可福音': 'mak', '路加福音': 'luk', '約翰福音': 'jhn',
  '使徒行傳': 'act', '羅馬書': 'rom', '哥林多前書': '1co', '歌林多前書': '1co',
  '哥林多後書': '2co', '歌林多後書': '2co', '加拉太書': 'gal', '以弗所書': 'eph',
  '腓立比書': 'phl', '腓利比書': 'phl', '歌羅西書': 'col',
  '帖撒羅尼迦前書': '1ts', '帖撒羅尼迦後書': '2ts',
  '提摩太前書': '1ti', '提摩太後書': '2ti', '提多書': 'tit', '腓利門書': 'mon',
  '希伯來書': 'heb', '雅各書': 'jas', '彼得前書': '1pe', '彼得後書': '2pe',
  '約翰一書': '1jn', '約翰二書': '2jn', '約翰三書': '3jn', '猶大書': 'jud',
  '啟示錄': 'rev',
  // Short forms used by some sets in verses.js
  '約': 'jhn', '耶': 'jer', '羅': 'rom', '約一': '1jn', '弗': 'eph', '賽': 'isa',
  '書': 'jos', '申': 'deu', '詩': 'psm', '腓': 'phl', '太': 'mat', '林後': '2co',
  '出': 'exo', '番': 'zep', '民': 'num', '創': 'gen', '利': 'lev', '箴': 'pro',
  '路': 'luk', '可': 'mak', '徒': 'act', '來': 'heb', '彼前': '1pe', '彼後': '2pe',
};

// ── Image-glyph → Unicode ─────────────────────────────────────────────────
// Each mapping was determined from in-context readings (the site glosses
// most of them with POJ romanization). Where the authentic rare character
// has poor font coverage, a common readable variant is used instead.
const GLYPH_MAP = {
  boe: '袂',    // bē — cannot
  in: '𪜶',     // in — they/their (MOE official)
  tiam: '踮',   // tiàm — at/stay
  tiau: '牢',   // tiâu — pen/stable; 徛袂牢
  gau: '賢',    // gâu — capable ("賢交戰")
  hiat: '㧒',   // hiat — throw ("㧒佇海中")
  ki: '基',     // 基路兵 (cherubim) first syllable
  lo: '路',     // 基路兵 second syllable
  ko: '哥',     // thái-ko 癩哥 — leprosy
  lut: '甪',    // lut — slip off ("對恩典的位甪落")
  moa: '幔',    // moa — cover/cloak
  nit: '躡',    // nih — blink ("目躡")
  nith: '躡',   // same glyph, alt filename
  oh: '僫',     // oh — difficult ("入上帝的國僫啊")
  poa: '盤',    // pôaⁿ — cross over ("盤過")
  sui: '遂',    // 半遂 — paralyzed
  teh: '啲',    // teh — progressive particle (site prints 啲 elsewhere)
  teng: '碇',   // tēng — hard ("碇石")
  thang: '迵',  // thàng — all the way through ("行未迵")
  thoa: '豸',   // thōa — 蟲豸 worm
  thun: '踐',   // thún — trample ("踐踏")
  ti: '蹬',     // 腳後蹬 — heel
  to: '杜',     // 杜蚓 — earthworm
  tok: '度',    // 測度 — to measure
  phoe: '頰',   // phóe — cheek ("嘴頰")
  chhih: '匆',  // chhih-chhih — bustling ("無閒匆匆", 詩39:6)
};

// ── Fetch with cache ───────────────────────────────────────────────────────
fs.mkdirSync(CACHE, { recursive: true });
async function fetchChapter(code, chapter) {
  const key = `${code}${chapter}.htm`;
  const cached = path.join(CACHE, key);
  if (fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8');
  const url = `${BASE}/${code}/${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  if (!/：|:/.test(html)) throw new Error(`Suspicious empty page: ${url}`);
  fs.writeFileSync(cached, html);
  await new Promise(r => setTimeout(r, 250)); // be polite to the host
  return html;
}

// ── Chapter HTML → { verseNum: text } ─────────────────────────────────────
const unknownGlyphs = new Set();
function parseChapter(html, chapter) {
  // Mark image glyphs as placeholders first (some sit INSIDE romanization
  // glosses that get stripped below — those never need a mapping).
  let s = html.replace(/<img\s[^>]*src="\.\.\/([a-z0-9]+)\.jpg"[^>]*\/?>/gi, (_, name) => `⟦${name}⟧`);
  const out = {};
  // <td> may carry attributes (highlighted "golden verses" get bgcolor).
  const re = new RegExp(`${chapter}:(\\d+)\\s*</font>\\s*<td[^>]*>([\\s\\S]*?)(?=<tr>|</table>|</TABLE>|$)`, 'g');
  let m;
  while ((m = re.exec(s)) !== null) {
    const v = parseInt(m[1], 10);
    let text = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, '')
      // Drop inline POJ pronunciation glosses like (tiâu) / （nih）— they
      // may themselves contain glyph placeholders for POJ letters.
      .replace(/[（(][^（()）]*[A-Za-zÀ-ɏ][^（()）]*[）)]/g, '')
      // Unterminated gloss (site markup glitch, e.g. "牨(káng…") — drop the
      // open paren + latin run.
      .replace(/[（(][A-Za-zÀ-ɏ·ⁿ\-\s]+/g, '')
      .replace(/⟦([a-z0-9]+)⟧/g, (_, name) => {
        if (GLYPH_MAP[name]) return GLYPH_MAP[name];
        unknownGlyphs.add(name);
        return `⟦${name}⟧`;
      })
      // A few pages type POJ words as plain text instead of glyph images.
      .replace(/bõe|boe/g, '袂')
      .replace(/teh/g, '啲')
      .replace(/in/g, '𪜶')
      .replace(/i(?=𪜶)/g, '')
      // Catch-all: any remaining stray latin run is markup debris.
      .replace(/[A-Za-zÀ-ɏõ]+/g, '')
      .trim();
    if (text) out[v] = text;
  }
  return out;
}

// ── Reference parsing ──────────────────────────────────────────────────────
// Handles: "約翰福音 3:16", "馬太福音28:19-20" (no space), "詩篇 1" (whole
// chapter), en/em dashes, comma lists "3:16,18".
function parseReference(refRaw) {
  const ref = String(refRaw).replace(/[–—]/g, '-').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFF10)).trim();
  const m = ref.match(/^(.+?)\s*(\d+)(?::([\d,\-\s]+))?\s*$/);
  if (!m) throw new Error(`Unparseable reference: "${refRaw}"`);
  const book = m[1].trim();
  const code = BOOK_CODE[book];
  if (!code) throw new Error(`Unknown book "${book}" in reference "${refRaw}"`);
  const chapter = parseInt(m[2], 10);
  let verses = null; // null → whole chapter
  if (m[3]) {
    verses = [];
    for (const part of m[3].split(',')) {
      const p = part.trim();
      if (!p) continue;
      const r = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (r) { for (let i = +r[1]; i <= +r[2]; i++) verses.push(i); }
      else verses.push(parseInt(p, 10));
    }
  }
  return { book, code, chapter, verses };
}

// ── Load VERSE_SETS from src (rewrite extensionless imports for Node) ─────
const tmpDir = fs.mkdtempSync(path.join(HERE, '.tmp-verses-'));
try {
  for (const f of ['verses.js', 'verses_psalms.js']) {
    let src = fs.readFileSync(path.join(SRC, f), 'utf8');
    src = src.replace(/from '\.\/verses_psalms'/g, "from './verses_psalms.js'");
    src = src.replace(/^import \{ VERSE_SETS_KJV \} from '\.\/verses_kjv';\s*$/m, 'const VERSE_SETS_KJV = [];');
    fs.writeFileSync(path.join(tmpDir, f), src);
  }
  const { VERSE_SETS } = await import(pathToFileURL(path.join(tmpDir, 'verses.js')).href);

  // ── Build ────────────────────────────────────────────────────────────────
  const chapterCache = new Map(); // "code|chapter" → {v: text}
  async function getChapter(code, chapter) {
    const key = `${code}|${chapter}`;
    if (!chapterCache.has(key)) {
      chapterCache.set(key, parseChapter(await fetchChapter(code, chapter), chapter));
    }
    return chapterCache.get(key);
  }

  const outSets = [];
  const misses = [];
  let done = 0, total = 0;
  for (const set of VERSE_SETS) total += (set.verses || []).length;

  for (const set of VERSE_SETS) {
    const twVerses = [];
    for (const v of set.verses || []) {
      done += 1;
      let parsed;
      try { parsed = parseReference(v.reference); }
      catch (e) { misses.push(`${set.id}: ${e.message}`); continue; }
      let text = '';
      try {
        const chap = await getChapter(parsed.code, parsed.chapter);
        const nums = parsed.verses || Object.keys(chap).map(Number).sort((a, b) => a - b);
        const parts = nums.map(n => chap[n]).filter(Boolean);
        if (!parts.length || (parsed.verses && parts.length < parsed.verses.length)) {
          misses.push(`${set.id}: ${v.reference} — got ${parts.length}/${nums.length} verses`);
        }
        text = parts.join('');
      } catch (e) {
        misses.push(`${set.id}: ${v.reference} — ${e.message}`);
      }
      if (!text) continue;
      twVerses.push({
        id: `${v.id || `${set.id}-${twVerses.length + 1}`}-tw`,
        reference: v.reference,
        title: v.title || set.title,
        text,
      });
      if (done % 25 === 0) console.error(`  …${done}/${total}`);
    }
    if (!twVerses.length) continue;
    outSets.push({
      id: `${set.id}-tw`,
      title: `${set.title}（台語）`,
      createdAt: set.createdAt || undefined,
      description: set.description ? `${set.description}（台語漢字本）` : '台語漢字本',
      language: 'tw',
      verses: twVerses,
    });
  }

  if (unknownGlyphs.size) {
    console.error(`\n❌ Unmapped image glyphs: ${[...unknownGlyphs].join(', ')}`);
    console.error('Add them to GLYPH_MAP in this script (check the image on the site) and re-run.');
    process.exit(1);
  }
  if (misses.length) {
    console.error(`\n⚠️  ${misses.length} reference(s) incomplete:`);
    for (const m of misses.slice(0, 40)) console.error('  ' + m);
  }

  const header = `// 台語漢字本聖經 (Taiwanese Hokkien, Han-character Barclay edition)\n` +
    `// Generated by scripts/build-verses-tw.mjs from lingshyang.com/taiwan_Bible.\n` +
    `// Do not hand-edit — re-run the generator instead.\n`;
  const body = `${header}export const VERSE_SETS_TW = ${JSON.stringify(outSets, null, 2)};\n`;
  if (DRY) {
    console.log(`DRY RUN: ${outSets.length} sets, ${outSets.reduce((a, s) => a + s.verses.length, 0)} verses, ${Math.round(body.length / 1024)}KB`);
  } else {
    fs.writeFileSync(path.join(SRC, 'verses_tw.js'), body);
    console.log(`Wrote src/verses_tw.js — ${outSets.length} sets, ${outSets.reduce((a, s) => a + s.verses.length, 0)} verses, ${Math.round(body.length / 1024)}KB`);
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
