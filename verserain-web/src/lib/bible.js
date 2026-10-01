// Bible versions, verse fetching/caching and daily-verse helpers — moved out of App.jsx (UI/UX 第 4 階段).
import { BIBLE_BOOKS, getBookAbbr } from '../bibleDictionary.js';
import { asciifyDigits, normalizeVerseReferenceKey } from './verseRef.js';
import { getSpeechLangForVersion } from './speechLang.js';
import { stripBollsMarkup, stripLeadingVerseNumeral } from './bibleTextMarkup.js';

export const AUTO_PLAY_VERSE_PAUSE_MS = 2000;
export const AUTO_PLAY_REFERENCE_PAUSE_MS = 2000;
export const HIDDEN_PHRASE_MARK = '•';

export function maskPhraseForPreview(phrase = '') {
  return String(phrase).replace(/[^\s.,?!;:：﹕︰，。？！；：]/g, HIDDEN_PHRASE_MARK);
}

export function isEnglishBibleVersion(v) {
  return v === 'kjv' || v === 'esv' || v === 'niv';
}

// Delegates to src/lib/speechLang.js — the single source of truth shared with
// BlindModeGame's speech recognition, so the two maps can never drift.
export function getVoiceLangForVersion(v) {
  return getSpeechLangForVersion(v);
}

export const BIBLE_LANGUAGE_OPTIONS = [
  { value: 'cuv', label: '繁體中文' },
  { value: 'cuvs', label: '简体中文' },
  { value: 'tw', label: '台語（漢字本）' },
  { value: 'kjv', label: 'KJV - English' },
  { value: 'esv', label: 'ESV - English' },
  { value: 'niv', label: 'NIV - English' },
  { value: 'fa', label: 'فارسی' },
  { value: 'ar', label: 'العربية' },
  { value: 'he', label: 'עברית' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'ru', label: 'Русский' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'my', label: 'မြန်မာ' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'km', label: 'ភាសាខ្មែរ' }
];

export const PLAY_DURATION_OPTIONS = [
  { value: '5', minutes: 5 },
  { value: '10', minutes: 10 },
  { value: '20', minutes: 20 },
  { value: 'infinite', minutes: null }
];
export const DEFAULT_PLAY_DURATION_CHOICE = '10';
export const PLAY_FONT_OPTIONS = [
  { value: 'xlarge', label: '最大', enLabel: 'XL' },
  { value: 'large', label: '大', enLabel: 'Large' },
  { value: 'normal', label: '中', enLabel: 'Medium' },
  { value: 'small', label: '小', enLabel: 'Small' }
];
export const DEFAULT_PLAY_FONT_CHOICE = 'normal';
// 播放字體顏色 — a light background (white sand, bright sky) makes the default
// white verse text unreadable, so the listener can pick a dark ink instead.
// Applied as .rain-ink-<value> on the player shell (see index.css).
export const PLAY_INK_OPTIONS = [
  { value: 'white', label: '白', enLabel: 'White', swatch: '#ffffff' },
  { value: 'yellow', label: '黃', enLabel: 'Yellow', swatch: '#fde047' },
  { value: 'black', label: '黑', enLabel: 'Black', swatch: '#0f172a' },
  { value: 'blue', label: '藍', enLabel: 'Blue', swatch: '#1e3a8a' }
];
export const DEFAULT_PLAY_INK_CHOICE = 'white';
export function readPlayInkChoice() {
  try {
    const v = localStorage.getItem('verseRainPlayInk');
    return PLAY_INK_OPTIONS.some(o => o.value === v) ? v : DEFAULT_PLAY_INK_CHOICE;
  } catch {
    return DEFAULT_PLAY_INK_CHOICE;
  }
}

// --- Bible verse cross-language lookup utilities ---
export function getEnglishReferenceFromKey(normalizedKey) {
  if (!normalizedKey) return null;
  const [bookPart, chapterVerse] = normalizedKey.split('|');
  if (!chapterVerse) return null;
  const bookId = parseInt(bookPart, 10);
  if (Number.isNaN(bookId)) return null;
  const book = BIBLE_BOOKS.find(b => b.id === bookId);
  if (!book) return null;
  // chapterVerse may be "35:1-3" (verse) or just "35" (whole chapter)
  return `${book.names[2]} ${chapterVerse}`;
}

// Bumped to v2 when the fetch pipeline started stripping Hebrew verse numerals
// and Strong's numbers. Entries written by the old pipeline are already-broken
// text ("א  משלי שלמה", "feareth3373") and would be served forever, so a fix to
// the fetcher alone never reaches anyone who had used the feature before. The
// version lives in the key, so old data is orphaned rather than migrated.
export const BIBLE_CACHE_KEY = 'verserain_bible_cache_v2';
export const LEGACY_BIBLE_CACHE_KEYS = ['verserain_bible_cache'];

export function getCachedBibleVerse(version, normalizedKey) {
  try {
    const raw = localStorage.getItem(BIBLE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const cached = cache[`${version}|${normalizedKey}`];
    if (!cached) return null;
    // Older cache entries may include bolls.life markup (<i>, <na>, etc.).
    // Strip on read so already-cached verses render cleanly without forcing
    // a re-fetch.
    return cached.includes('<') ? cached.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : cached;
  } catch { return null; }
}

export function setCachedBibleVerse(version, normalizedKey, text) {
  try {
    const raw = localStorage.getItem(BIBLE_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[`${version}|${normalizedKey}`] = text;
    localStorage.setItem(BIBLE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded or parse error — ignore */ }
}

// Reclaim the space the orphaned cache is holding — it can run to megabytes,
// and localStorage is already tight enough that custom-set writes catch quota
// errors elsewhere in this file.
export function dropLegacyBibleCaches() {
  for (const key of LEGACY_BIBLE_CACHE_KEYS) {
    try { localStorage.removeItem(key); } catch { /* nothing we can do */ }
  }
}

export async function fetchBibleVerseFromAPI(englishRef, targetVersion) {
  if (!englishRef) return null;
  try {
    if (targetVersion === 'esv') {
      const res = await fetch(`/api/esv-passage?q=${encodeURIComponent(englishRef)}`);
      if (res.ok) { const d = await res.json(); return d.text || null; }
    }
    if (targetVersion === 'kjv') {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(englishRef)}?translation=kjv`);
      if (res.ok) { const d = await res.json(); return d.text?.replace(/\n/g, ' ').trim() || null; }
    }
    if (targetVersion === 'niv') {
      const res = await fetch(`/api/niv-passage?reference=${encodeURIComponent(englishRef)}`);
      if (res.ok) { const d = await res.json(); return d.text || null; }
    }
  } catch { /* network error — ignore */ }
  return null;
}

// bolls.life free Bible API — covers CUV/CUVS/KO/JA/DE/ES/FA/HE/VI
export const BOLLS_TRANSLATIONS = {
  cuv:  'CUNP',   // Traditional Chinese (新標點和合本)
  cuvs: 'CUNPS',  // Simplified Chinese (新标点和合本)
  ko:   'KRV',    // Korean Revised Version (개역개정)
  ja:   'NJB',    // Japanese New Interconfessional Bible (新共同訳)
  de:   'SCH',    // German Schlachter 1951
  es:   'RV1960', // Spanish Reina-Valera 1960
  fa:   'POV',    // Persian Old Version
  ar:   'SVD',    // Arabic Smith and Van Dyke 1865 (most widely-used)
  vi:   'VI1934', // Vietnamese 1934
  id:   'TB',     // Indonesian Terjemahan Baru (most widely-used)
  ms:   'TB',     // Malay OT fallback → Indonesian TB. NT uses real Malay via
                  // fetchMalayNTVerse (helloao zlm_ksz); see fetchVerseFromBolls.
  pt:   'ARC09',  // Portuguese Almeida Revista e Corrigida 2009 (bolls slug)
  fr:   'FRLSG',  // French Louis Segond 1910 (bolls slug)
  ru:   'SYNOD',  // Russian Synodal (bolls slug)
  hi:   'HIOV',   // Hindi Old Version (BSI re-edited; bolls slug)
  // he: OT → HAC, NT → DHNT  (handled below)
  // tr, my: not available on bolls.life
};

export function getBollsSlug(targetVersion, bookId) {
  if (targetVersion === 'he') return bookId <= 39 ? 'HAC' : 'DHNT';
  return BOLLS_TRANSLATIONS[targetVersion] || null;
}

// getbible.net fallback for languages bolls.life doesn't carry — currently
// Turkish (Kutsal Kitap) and Myanmar/Burmese (Judson 1835). Same shape as
// fetchVerseFromBolls: normalizedKey "<bookId>|<chap>" or "<bookId>|<chap>:<verses>"
// → joined verse text string. CORS-open and rate-friendly (whole-chapter
// fetch, then filter).
export const GETBIBLE_TRANSLATIONS = {
  tr: 'turkish', // Kutsal Kitap
  my: 'judson',  // Judson 1835 Burmese Bible
};

export async function fetchVerseFromGetBible(normalizedKey, targetVersion) {
  const slug = GETBIBLE_TRANSLATIONS[targetVersion];
  if (!slug) return null;
  const [bookPart, chapterVerse] = (normalizedKey || '').split('|');
  if (!chapterVerse) return null;
  const bookId = parseInt(bookPart, 10);
  if (Number.isNaN(bookId)) return null;

  const colonIdx = chapterVerse.indexOf(':');
  const chapter = colonIdx < 0
    ? parseInt(chapterVerse, 10)
    : parseInt(chapterVerse.slice(0, colonIdx), 10);
  if (Number.isNaN(chapter)) return null;

  try {
    const res = await fetch(`https://api.getbible.net/v2/${slug}/${bookId}/${chapter}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const verses = data?.verses;
    if (!Array.isArray(verses) || !verses.length) return null;

    // Chapter-only — concat all verses with Arabic semicolon so splitVersePhrases
    // can break on verse boundaries (matches fetchVerseFromBolls behaviour).
    if (colonIdx < 0) {
      return verses.map(v => stripBollsMarkup(v.text || ''))
        .filter(Boolean).join('؛ ') || null;
    }

    // Verse-range — filter to requested numbers (cap at 9 in line with bolls path).
    const range = chapterVerse.slice(colonIdx + 1);
    let wanted = new Set();
    if (range.includes('-')) {
      const [s, e] = range.split('-').map(Number);
      if (!Number.isNaN(s) && !Number.isNaN(e)) {
        for (let v = s; v <= Math.min(e, s + 8); v++) wanted.add(v);
      }
    } else {
      const v = parseInt(range, 10);
      if (!Number.isNaN(v)) wanted.add(v);
    }
    if (!wanted.size) return null;
    return verses
      .filter(v => wanted.has(Number(v.verse)))
      .map(v => stripBollsMarkup(v.text || ''))
      .filter(Boolean).join(' ').trim() || null;
  } catch { return null; }
}

// Modern standard Malay (Bahasa Melayu) — helloao "zlm_ksz" (Kitab Suci Zabur
// dan Injil), NEW TESTAMENT ONLY. No free API carries a full Malay OT, so OT
// books fall back to Indonesian TB (getBollsSlug('ms') === 'TB'). Keyless and
// CORS-open (access-control-allow-origin: *), so fetched straight from client.
export const HELLOAO_MALAY_NT_USFM = {
  40: 'MAT', 41: 'MRK', 42: 'LUK', 43: 'JHN', 44: 'ACT', 45: 'ROM', 46: '1CO',
  47: '2CO', 48: 'GAL', 49: 'EPH', 50: 'PHP', 51: 'COL', 52: '1TH', 53: '2TH',
  54: '1TI', 55: '2TI', 56: 'TIT', 57: 'PHM', 58: 'HEB', 59: 'JAS', 60: '1PE',
  61: '2PE', 62: '1JN', 63: '2JN', 64: '3JN', 65: 'JUD', 66: 'REV',
};
export async function fetchMalayNTVerse(normalizedKey) {
  const [bookPart, chapterVerse] = String(normalizedKey || '').split('|');
  if (!chapterVerse) return '';
  const usfm = HELLOAO_MALAY_NT_USFM[parseInt(bookPart, 10)];
  if (!usfm) return ''; // OT (or unknown) → caller falls back to Indonesian TB
  const colonIdx = chapterVerse.indexOf(':');
  const chapter = parseInt(colonIdx < 0 ? chapterVerse : chapterVerse.slice(0, colonIdx), 10);
  if (Number.isNaN(chapter)) return '';
  let vStart = null, vEnd = null;
  if (colonIdx >= 0) {
    const range = chapterVerse.slice(colonIdx + 1);
    if (range.includes('-')) {
      const [s, e] = range.split('-').map(Number);
      if (!Number.isNaN(s)) { vStart = s; vEnd = Number.isNaN(e) ? s : Math.min(e, s + 8); }
    } else { const v = parseInt(range, 10); if (!Number.isNaN(v)) { vStart = v; vEnd = v; } }
  }
  try {
    const res = await fetch(`https://bible.helloao.org/api/zlm_ksz/${usfm}/${chapter}.json`);
    if (!res.ok) return '';
    const data = await res.json();
    const content = data?.chapter?.content || [];
    const parts = [];
    for (const c of content) {
      if (c?.type !== 'verse') continue;
      if (vStart == null || (c.number >= vStart && c.number <= vEnd)) {
        // content items are phrase/line segments (incl. poetry) — space-join, not
        // concat, else adjacent lines merge ("pada-Kukerana"); collapse doubles.
        const txt = (c.content || []).map(x => typeof x === 'string' ? x : (x?.text || '')).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (txt) parts.push(txt);
      }
    }
    // chapter-only → verse-boundary separator (matches bolls); range/single → space
    return parts.join(vStart == null ? '؛ ' : ' ').trim();
  } catch { return ''; }
}

export async function fetchVerseFromBolls(normalizedKey, targetVersion) {
  // Malay: prefer the real Bahasa Melayu NT; OT falls through to Indonesian TB below.
  if (targetVersion === 'ms') {
    const malay = await fetchMalayNTVerse(normalizedKey);
    if (malay) return malay;
  }
  const [bookPart, chapterVerse] = (normalizedKey || '').split('|');
  if (!chapterVerse) return null;
  const bookId = parseInt(bookPart, 10);
  if (Number.isNaN(bookId)) return null;
  const slug = getBollsSlug(targetVersion, bookId);
  if (!slug) return null;

  const colonIdx = chapterVerse.indexOf(':');

  // Chapter-only reference (no colon, e.g. "91") — fetch whole chapter
  if (colonIdx < 0) {
    const chapter = parseInt(chapterVerse, 10);
    if (Number.isNaN(chapter)) return null;
    try {
      const res = await fetch(`https://bolls.life/get-text/${slug}/${bookId}/${chapter}/`);
      if (!res.ok) return null;
      const verses = await res.json();
      if (!Array.isArray(verses) || !verses.length) return null;
      // Join with Arabic semicolon so splitVersePhrases() can split on verse boundaries
      return verses
        .map(v => stripLeadingVerseNumeral(stripBollsMarkup(v.text), v.verse))
        .filter(Boolean)
        .join('؛ ') || null;
    } catch { return null; }
  }

  const chapter = parseInt(chapterVerse.slice(0, colonIdx), 10);
  const verseRange = chapterVerse.slice(colonIdx + 1);
  if (Number.isNaN(chapter) || !verseRange) return null;

  // Build list of verse numbers (handle ranges like "14-15")
  const verseNums = [];
  if (verseRange.includes('-')) {
    const [startV, endV] = verseRange.split('-').map(Number);
    if (!Number.isNaN(startV) && !Number.isNaN(endV)) {
      for (let v = startV; v <= Math.min(endV, startV + 8); v++) verseNums.push(v);
    }
  } else {
    const v = parseInt(verseRange, 10);
    if (!Number.isNaN(v)) verseNums.push(v);
  }
  if (!verseNums.length) return null;

  try {
    const texts = await Promise.all(
      verseNums.map(v =>
        fetch(`https://bolls.life/get-verse/${slug}/${bookId}/${chapter}/${v}/`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.text ? stripLeadingVerseNumeral(stripBollsMarkup(d.text), v) || null : null)
          .catch(() => null)
      )
    );
    const combined = texts.filter(Boolean).join(' ').trim();
    return combined || null;
  } catch {
    return null;
  }
}

// Language-aware verse-text fetch for the custom-set editor (single-row
// auto-fetch + bulk import). English translations (ESV / NIV / KJV) each hit
// their own API; every other language goes to bolls.life with the CORRECT
// per-language slug via getBollsSlug (Spanish → RV1960, Korean → KRV, …),
// then getbible.net for the two languages bolls lacks (Turkish, Burmese).
// Returns '' on miss. Previously both call sites hard-coded the Chinese CUV
// slug, so a Spanish/Korean/etc. set silently imported Chinese verse text.
// 台語漢字本 — no public Bible API exists, so the PartyKit backend proxies
// (and caches) chapters from lingshyang.com. Same key shape as
// fetchVerseFromBolls: "<bookId>|<chap>" or "<bookId>|<chap>:<verses>".
export async function fetchVerseFromTaibible(normalizedKey) {
  const [bookPart, chapterVerse] = (normalizedKey || '').split('|');
  if (!chapterVerse) return null;
  const bookId = parseInt(bookPart, 10);
  if (Number.isNaN(bookId)) return null;
  const colonIdx = chapterVerse.indexOf(':');
  const chapter = parseInt(colonIdx >= 0 ? chapterVerse.slice(0, colonIdx) : chapterVerse, 10);
  if (Number.isNaN(chapter)) return null;
  try {
    const res = await fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/taibible?book=${bookId}&chapter=${chapter}`);
    if (!res.ok) return null;
    const data = await res.json();
    const chap = data?.verses || {};
    let nums;
    if (colonIdx >= 0) {
      nums = [];
      for (const part of chapterVerse.slice(colonIdx + 1).split(',')) {
        const r = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        if (r) { for (let i = +r[1]; i <= +r[2]; i++) nums.push(i); }
        else if (part.trim()) nums.push(parseInt(part, 10));
      }
    } else {
      nums = Object.keys(chap).map(Number).sort((a, b) => a - b);
    }
    const parts = nums.map(n => chap[n]).filter(Boolean);
    return parts.length ? parts.join('') : null;
  } catch {
    return null;
  }
}

// Normalise the separators people (and our own data) actually use in a
// chapter:verse input, so one spelling reaches the range parser:
//   6:9–13 en-dash · 6:9—13 em-dash · 6:9～13 fullwidth tilde · 6：9-13
//
// The en-dash is the one that bit: the range regex below only accepts an ASCII
// '-', so "太 6:9–13" matched just ":9" and quietly fetched a SINGLE verse
// instead of the range. The app's own verse files ship references in exactly
// that form ("Isaiah 58:6–12"), and the sibling local-DB lookup in the editor
// already normalised these — only the path feeding the API call didn't.
export function normalizeVerseInput(value) {
  return String(value || '').replace(/[～~–—]/g, '-').replace(/[：]/g, ':').trim();
}

export async function fetchEditorVerseText({ bookInfo, sanitized, version }) {
  const chapMatch = String(sanitized).match(/^(\d+)/);
  if (!chapMatch) return '';
  const chapter = parseInt(chapMatch[1], 10);
  const verseMatch = String(sanitized).match(/:(\d+)(?:-(\d+))?/);

  if (isEnglishBibleVersion(version)) {
    const bookAbbr = getBookAbbr(bookInfo, version);
    const englishRef = `${bookInfo.names?.[2] || bookInfo.names?.[0] || bookAbbr} ${sanitized}`;
    const fetched = await fetchBibleVerseFromAPI(englishRef, version);
    return fetched ? String(fetched).replace(/\s+/g, ' ').trim() : '';
  }

  // Build the "<bookId>|<chapter>[:<verses>]" key fetchVerseFromBolls expects.
  let versePart = String(chapter);
  if (verseMatch) {
    versePart = verseMatch[2]
      ? `${chapter}:${verseMatch[1]}-${verseMatch[2]}`
      : `${chapter}:${verseMatch[1]}`;
  }
  const key = `${bookInfo.id}|${versePart}`;
  let combined = version === 'tw'
    ? await fetchVerseFromTaibible(key)
    : (await fetchVerseFromBolls(key, version) || await fetchVerseFromGetBible(key, version));
  if (!combined) return '';
  // CJK verses read without inter-character spaces.
  if (version === 'cuv' || version === 'cuvs' || version === 'tw') combined = combined.replace(/\s+/g, '');
  return combined.replace(/\s+/g, ' ').trim();
}

// Check that a piece of text is likely written in the expected script for the given version.
// Used to reject local verse-set matches that accidentally contain the wrong language (e.g. KJV
// text stored inside a Hebrew-labelled set).
export function isTextLikelyForVersion(text, version) {
  if (!text) return false;
  const s = String(text);
  switch (String(version || '').toLowerCase()) {
    case 'he':
      // Must contain Hebrew letters
      return /[א-תיִ-פֿ]/.test(s);
    case 'fa':
      // Must contain Arabic/Persian letters
      return /[؀-ۿ]/.test(s);
    case 'ja':
      // Must contain kana or CJK
      return /[぀-ヿ一-鿿]/.test(s);
    case 'ko':
      // Must contain Hangul
      return /[가-힯ᄀ-ᇿ]/.test(s);
    case 'my':
      // Must contain Myanmar script
      return /[က-႟]/.test(s);
    case 'hi':
      // Must contain Devanagari
      return /[ऀ-ॿ]/.test(s);
    case 'cuv':
    case 'cuvs':
    case 'zh':
      // Must contain CJK
      return /[一-鿿]/.test(s);
    default:
      // Latin-script languages (en, de, es, tr, vi, kjv, esv) — accept anything
      return true;
  }
}

export function getSecondaryPhrasesForIndex(primaryIndex, primaryLength, secondaryPhrases) {
  if (!secondaryPhrases?.length) return '';
  if (primaryLength <= 1) return secondaryPhrases.join(' ');

  const secondaryLength = secondaryPhrases.length;
  if (primaryLength === secondaryLength) return secondaryPhrases[primaryIndex] || '';

  if (secondaryLength < primaryLength) {
    // 英文片語較少：把每個英文片語投射到最近的中文位置（1對1，不重複）
    // 沒配對到的中文顯示空白
    if (secondaryLength === 1) {
      return primaryIndex === 0 ? secondaryPhrases[0] : '';
    }
    const collected = [];
    for (let j = 0; j < secondaryLength; j++) {
      const target = Math.round(j * (primaryLength - 1) / (secondaryLength - 1));
      if (target === primaryIndex) collected.push(secondaryPhrases[j]);
    }
    return collected.join(' ');
  } else {
    // 英文片語較多：把連續英文片語集中到對應的中文位置
    const start = Math.floor(primaryIndex * secondaryLength / primaryLength);
    const end = primaryIndex === primaryLength - 1
      ? secondaryLength
      : Math.max(start + 1, Math.floor((primaryIndex + 1) * secondaryLength / primaryLength));
    return secondaryPhrases.slice(start, end).join(' ');
  }
}

// Parse a reference-shaped string ("詩篇 150", "詩 150", "Psalms 150:6") into a
// comparable { bookId, chapter, verses } via normalizeVerseReferenceKey, which
// already unifies book abbreviations across every language in BIBLE_BOOKS.
// Returns null when the string doesn't resolve to a real book + chapter.
export function parseScriptureKey(ref) {
  const key = normalizeVerseReferenceKey(ref);
  const m = /^(\d+)\|(\d+)(?::([\d,\-\s]+))?$/.exec(key);
  if (!m) return null;
  return { bookId: parseInt(m[1], 10), chapter: parseInt(m[2], 10), verses: m[3] ? m[3].trim() : null };
}

// Parse a chapter range out of a verse-set title ("詩篇 107-150",
// "Psalms 107-150 (KJV)") into { bookId, start, end }, resolving the book from
// the text before the range by reusing parseScriptureKey. Returns null when the
// title has no chapter range or the leading text isn't a recognizable book.
export function parseSetChapterRange(title) {
  if (!title) return null;
  const norm = asciifyDigits(String(title)).replace(/[–—]/g, '-');
  const m = norm.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  if (!(start >= 1 && end >= start)) return null;
  const before = norm.slice(0, m.index).trim();
  if (!before) return null;
  const candidates = [before, before.split(/\s+/)[0]];
  for (const c of candidates) {
    if (!c) continue;
    const k = parseScriptureKey(`${c} ${start}`);
    if (k && k.chapter === start) return { bookId: k.bookId, start, end };
  }
  return null;
}

export function findMatchingVerse(primaryVerse, primaryVerses = [], secondaryVerses = [], options = {}) {
  if (!primaryVerse || !secondaryVerses?.length) return null;
  const { allowIndexFallback = true } = options;
  const primaryIndex = primaryVerses.findIndex(v =>
    (primaryVerse.id && v.id === primaryVerse.id) ||
    (v.reference === primaryVerse.reference && v.text === primaryVerse.text)
  );
  const primaryKey = normalizeVerseReferenceKey(primaryVerse.reference);
  return (
    secondaryVerses.find(v => primaryVerse.id && v.id === primaryVerse.id) ||
    secondaryVerses.find(v => normalizeVerseReferenceKey(v.reference) === primaryKey) ||
    (allowIndexFallback && primaryIndex >= 0 ? secondaryVerses[primaryIndex] : null) ||
    null
  );
}

export function normalizeVerseSetIdentity(value = '') {
  return String(value || '')
    .replace(/\s*\((KJV|ESV|NIV)\)\s*/gi, '')
    .replace(/-(cuv|cuvs|kjv|esv|niv|ja|ko|fa|he|es|tr|de|my|vi|id|ms|tw|pt|fr|ru|hi|km)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function areLikelyParallelVerseSets(primarySet, secondarySet) {
  if (!primarySet || !secondarySet) return false;
  const primaryLength = primarySet.verses?.length || 0;
  const secondaryLength = secondarySet.verses?.length || 0;
  if (!primaryLength || primaryLength !== secondaryLength) return false;

  const primaryId = normalizeVerseSetIdentity(primarySet.id);
  const secondaryId = normalizeVerseSetIdentity(secondarySet.id);
  if (primaryId && secondaryId && primaryId === secondaryId) return true;
  if (secondarySet.sourceSetId && normalizeVerseSetIdentity(secondarySet.sourceSetId) === primaryId) return true;

  const primaryTitle = normalizeVerseSetIdentity(primarySet.title);
  const secondaryTitle = normalizeVerseSetIdentity(secondarySet.title);
  if (primaryTitle && secondaryTitle && primaryTitle === secondaryTitle) return true;

  const primaryRefs = new Set((primarySet.verses || []).map(v => normalizeVerseReferenceKey(v.reference)).filter(Boolean));
  const matchCount = (secondarySet.verses || []).reduce((sum, verse) => {
    const key = normalizeVerseReferenceKey(verse.reference);
    return sum + (key && primaryRefs.has(key) ? 1 : 0);
  }, 0);
  return matchCount >= Math.max(2, Math.ceil(primaryLength * 0.35));
}

export function getDailyVerseIndex(length, date = new Date()) {
  if (!length) return 0;
  const target = new Date(date);
  const start = new Date(target.getFullYear(), 0, 0);
  const day = Math.floor((target - start) / 86400000);
  return (target.getFullYear() * 37 + day) % length;
}

export function getDailyVerseRemoteVersion(version) {
  if (version === 'kjv' || version === 'esv' || version === 'niv' || version === 'cuv' || version === 'cuvs') return version;
  return null;
}

export function formatLocalDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function getDailyVerseFallbackImageUrl(verse, dateLabel, version, seed) {
  const hue = seed % 360;
  const accent = (hue + 38) % 360;
  const deep = (hue + 210) % 360;
  const glow = (hue + 68) % 360;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 58%, 28%)"/>
      <stop offset="0.45" stop-color="hsl(${accent}, 72%, 52%)"/>
      <stop offset="1" stop-color="hsl(${deep}, 62%, 16%)"/>
    </linearGradient>
    <radialGradient id="sun" cx="68%" cy="22%" r="42%">
      <stop offset="0" stop-color="hsl(${glow}, 100%, 82%)" stop-opacity="0.95"/>
      <stop offset="0.36" stop-color="hsl(${glow}, 94%, 62%)" stop-opacity="0.46"/>
      <stop offset="1" stop-color="hsl(${deep}, 64%, 14%)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="river" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="hsl(${accent}, 86%, 78%)" stop-opacity="0.72"/>
      <stop offset="0.55" stop-color="hsl(${hue}, 78%, 50%)" stop-opacity="0.46"/>
      <stop offset="1" stop-color="hsl(${deep}, 78%, 18%)" stop-opacity="0.94"/>
    </linearGradient>
    <filter id="soften">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect width="1600" height="900" fill="url(#sun)"/>
  <path d="M0 520 C190 360 280 315 430 438 C560 545 615 315 780 420 C930 515 1015 270 1210 372 C1360 450 1465 362 1600 300 L1600 900 L0 900 Z" fill="hsl(${deep}, 54%, 19%)" opacity="0.72"/>
  <path d="M0 610 C210 468 330 490 490 585 C640 675 800 492 950 565 C1120 648 1290 504 1600 560 L1600 900 L0 900 Z" fill="hsl(${hue}, 54%, 20%)" opacity="0.68"/>
  <path d="M660 900 C720 760 760 630 835 552 C910 630 938 760 1030 900 Z" fill="url(#river)" opacity="0.9"/>
  <path d="M680 900 C748 785 785 660 838 586 C890 674 940 800 1004 900 Z" fill="white" opacity="0.18" filter="url(#soften)"/>
  <path d="M1070 160 L1600 42 L1600 172 L1110 240 Z" fill="white" opacity="0.13" filter="url(#soften)"/>
  <path d="M960 230 L1600 185 L1600 330 L1000 300 Z" fill="white" opacity="0.1" filter="url(#soften)"/>
  <circle cx="1120" cy="188" r="118" fill="hsl(${glow}, 100%, 74%)" opacity="0.22" filter="url(#soften)"/>
  <g opacity="0.2" fill="none" stroke="white" stroke-width="2">
    <path d="M160 690 C360 640 480 660 650 610"/>
    <path d="M900 520 C1050 470 1220 500 1420 430"/>
    <path d="M80 210 C230 185 360 205 500 170"/>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export function getDailyVerseBackgroundDay(dateLabel) {
  const parsed = new Date(`${dateLabel || ''}T00:00:00`);
  const day = Number.isNaN(parsed.getTime()) ? new Date().getDate() : parsed.getDate();
  return Math.min(31, Math.max(1, day));
}

export function getDailyVerseImageUrls(verse, dateLabel, version) {
  const seedSource = `${dateLabel}-${version}-${verse?.reference || ''}`;
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
  const day = String(getDailyVerseBackgroundDay(dateLabel)).padStart(2, '0');

  return [
    `/dailyverse/day-${day}.svg`,
    getDailyVerseFallbackImageUrl(verse, dateLabel, version, seed)
  ];
}

export function getStableNumber(value) {
  let hash = 0;
  const source = String(value || '');
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return hash;
}

export function pickRandomVerse(verses = [], previousReference = '') {
  const candidates = Array.isArray(verses) ? verses.filter(Boolean) : [];
  if (candidates.length <= 1) return candidates[0] || null;
  const pool = candidates.filter(v => v.reference !== previousReference);
  return pool[Math.floor(Math.random() * pool.length)] || candidates[Math.floor(Math.random() * candidates.length)];
}
