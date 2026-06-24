/**
 * convert_topic_kjv_to_ms.mjs
 * Fetches all "Topic:" KJV published sets from PartyKit,
 * converts each verse to Malay (using Indonesian TB as fallback — no Malay API) via bolls.life,
 * then publishes the Malay version back to PartyKit.
 *
 * Run: node src/convert_topic_kjv_to_ms.mjs
 */

const PARTYKIT_URL = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets';
const BOLLS_SLUG = 'TB';
const ADMIN_EMAIL = 'hungry4grace@gmail.com';
const ADMIN_NAME = 'VerseRain';

// English book name → bolls.life book id (1-66, same numbering Christian Bible uses).
const BOOK_ID = {
  'gen': 1, 'genesis': 1,
  'exo': 2, 'exod': 2, 'exodus': 2,
  'lev': 3, 'leviticus': 3,
  'num': 4, 'numbers': 4,
  'deut': 5, 'deu': 5, 'deuteronomy': 5,
  'josh': 6, 'jos': 6, 'joshua': 6,
  'judg': 7, 'judges': 7,
  'ruth': 8,
  '1sam': 9, '1 sam': 9, '1samuel': 9, '1 samuel': 9,
  '2sam': 10, '2 sam': 10, '2samuel': 10, '2 samuel': 10,
  '1kgs': 11, '1 kgs': 11, '1kings': 11, '1 kings': 11,
  '2kgs': 12, '2 kgs': 12, '2kings': 12, '2 kings': 12,
  '1chr': 13, '1 chr': 13, '1chronicles': 13, '1 chronicles': 13,
  '2chr': 14, '2 chr': 14, '2chronicles': 14, '2 chronicles': 14,
  'ezra': 15, 'neh': 16, 'nehemiah': 16, 'esth': 17, 'esther': 17,
  'job': 18,
  'ps': 19, 'psa': 19, 'psalm': 19, 'psalms': 19,
  'prv': 20, 'prov': 20, 'proverbs': 20,
  'eccl': 21, 'ecclesiastes': 21,
  'song': 22, 'sos': 22,
  'isa': 23, 'isaiah': 23,
  'jer': 24, 'jeremiah': 24,
  'lam': 25, 'lamentations': 25,
  'ezek': 26, 'ezekiel': 26,
  'dan': 27, 'daniel': 27,
  'hos': 28, 'hosea': 28,
  'joel': 29, 'amos': 30, 'obad': 31, 'obadiah': 31,
  'jonah': 32, 'jon': 32, 'mic': 33, 'micah': 33,
  'nah': 34, 'nahum': 34, 'hab': 35, 'habakkuk': 35,
  'zeph': 36, 'zephaniah': 36, 'hag': 37, 'haggai': 37,
  'zech': 38, 'zechariah': 38, 'mal': 39, 'malachi': 39,
  'matt': 40, 'matthew': 40, 'mark': 41, 'mk': 41,
  'luke': 42, 'lk': 42, 'john': 43, 'jn': 43,
  'acts': 44, 'rom': 45, 'romans': 45,
  '1cor': 46, '1 cor': 46, '1corinthians': 46, '1 corinthians': 46,
  '2cor': 47, '2 cor': 47, '2corinthians': 47, '2 corinthians': 47,
  'gal': 48, 'galatians': 48, 'eph': 49, 'ephesians': 49,
  'phil': 50, 'philippians': 50, 'col': 51, 'colossians': 51,
  '1thess': 52, '1 thess': 52, '1thessalonians': 52, '1 thessalonians': 52,
  '2thess': 53, '2 thess': 53, '2thessalonians': 53, '2 thessalonians': 53,
  '1tim': 54, '1 tim': 54, '1timothy': 54, '1 timothy': 54,
  '2tim': 55, '2 tim': 55, '2timothy': 55, '2 timothy': 55,
  'titus': 56, 'phlm': 57, 'philemon': 57,
  'heb': 58, 'hebrews': 58, 'jas': 59, 'james': 59,
  '1pet': 60, '1 pet': 60, '1peter': 60, '1 peter': 60,
  '2pet': 61, '2 pet': 61, '2peter': 61, '2 peter': 61,
  '1john': 62, '1 john': 62, '2john': 63, '2 john': 63,
  '3john': 64, '3 john': 64, 'jude': 65,
  'rev': 66, 'revelation': 66
};

// Indonesian book name for display reference
const ID_NAMES = {
  1: 'Kejadian', 2: 'Keluaran', 3: 'Imamat', 4: 'Bilangan', 5: 'Ulangan',
  6: 'Yosua', 7: 'Hakim-hakim', 8: 'Rut', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Raja-raja', 12: '2 Raja-raja', 13: '1 Tawarikh', 14: '2 Tawarikh',
  15: 'Ezra', 16: 'Nehemia', 17: 'Ester', 18: 'Ayub', 19: 'Mazmur',
  20: 'Amsal', 21: 'Pengkhotbah', 22: 'Kidung Agung', 23: 'Yesaya',
  24: 'Yeremia', 25: 'Ratapan', 26: 'Yehezkiel', 27: 'Daniel', 28: 'Hosea',
  29: 'Yoel', 30: 'Amos', 31: 'Obaja', 32: 'Yunus', 33: 'Mikha',
  34: 'Nahum', 35: 'Habakuk', 36: 'Zefanya', 37: 'Hagai', 38: 'Zakharia',
  39: 'Maleakhi', 40: 'Matius', 41: 'Markus', 42: 'Lukas', 43: 'Yohanes',
  44: 'Kisah Para Rasul', 45: 'Roma', 46: '1 Korintus', 47: '2 Korintus',
  48: 'Galatia', 49: 'Efesus', 50: 'Filipi', 51: 'Kolose',
  52: '1 Tesalonika', 53: '2 Tesalonika', 54: '1 Timotius', 55: '2 Timotius',
  56: 'Titus', 57: 'Filemon', 58: 'Ibrani', 59: 'Yakobus',
  60: '1 Petrus', 61: '2 Petrus', 62: '1 Yohanes', 63: '2 Yohanes',
  64: '3 Yohanes', 65: 'Yudas', 66: 'Wahyu'
};

function parseRef(ref) {
  const clean = String(ref || '').replace(/[–—]/g, '-').trim();
  // Chapter only: "Proverbs 1"
  const chap = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)$/);
  if (chap) {
    const num = chap[1] ? chap[1].trim() : '';
    const bookRaw = (num + chap[2]).toLowerCase().replace(/\s+/g, ' ').trim();
    const id = BOOK_ID[bookRaw] || BOOK_ID[bookRaw.replace(/\s/g, '')] || null;
    if (id) return { id, chapter: parseInt(chap[3], 10), verses: null };
  }
  // Verse: "Lev 25:10, 23" or "John 3:16-17"
  const m = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)\s*:\s*([\d,\s\-]+)$/);
  if (!m) return null;
  const num = m[1] ? m[1].trim() : '';
  const bookRaw = (num + m[2]).toLowerCase().replace(/\s+/g, ' ').trim();
  const id = BOOK_ID[bookRaw] || BOOK_ID[bookRaw.replace(/\s/g, '')] || null;
  if (!id) return null;
  const chapter = parseInt(m[3], 10);
  const rawVerse = m[4].trim();
  const verses = rawVerse.includes(',')
    ? (() => {
        // "10, 23" → range 10-23
        const parts = rawVerse.split(',').map(v => v.trim()).filter(Boolean).map(Number).filter(n => !Number.isNaN(n));
        if (!parts.length) return null;
        return { start: parts[0], end: parts[parts.length - 1] };
      })()
    : rawVerse.includes('-')
      ? (() => {
          const [s, e] = rawVerse.split('-').map(Number);
          return Number.isNaN(s) || Number.isNaN(e) ? null : { start: s, end: e };
        })()
      : (() => {
          const v = parseInt(rawVerse, 10);
          return Number.isNaN(v) ? null : { start: v, end: v };
        })();
  if (!verses) return null;
  return { id, chapter, verses };
}

function stripBollsMarkup(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTBVerse(reference) {
  const parsed = parseRef(reference);
  if (!parsed) { console.warn(`  ⚠ Cannot parse: "${reference}"`); return null; }
  const { id, chapter, verses } = parsed;
  try {
    if (!verses) {
      // Whole chapter
      const res = await fetch(`https://bolls.life/get-text/${BOLLS_SLUG}/${id}/${chapter}/`);
      if (!res.ok) return null;
      const arr = await res.json();
      if (!Array.isArray(arr) || !arr.length) return null;
      return arr.map(v => stripBollsMarkup(v.text)).filter(Boolean).join(' ') || null;
    }
    // Verse range — fetch each verse, cap at 12 to avoid runaway
    const list = [];
    const cap = Math.min(verses.end, verses.start + 11);
    for (let v = verses.start; v <= cap; v++) list.push(v);
    const texts = await Promise.all(list.map(v =>
      fetch(`https://bolls.life/get-verse/${BOLLS_SLUG}/${id}/${chapter}/${v}/`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.text ? stripBollsMarkup(d.text) || null : null)
        .catch(() => null)
    ));
    const combined = texts.filter(Boolean).join(' ').trim();
    return combined || null;
  } catch (e) {
    console.warn(`  ✗ Fetch error for "${reference}": ${e.message}`);
    return null;
  }
}

function buildIndonesianRef(originalRef) {
  const parsed = parseRef(originalRef);
  if (!parsed) return originalRef;
  const { id, chapter, verses } = parsed;
  const book = ID_NAMES[id];
  if (!book) return originalRef;
  if (!verses) return `${book} ${chapter}`;
  if (verses.start === verses.end) return `${book} ${chapter}:${verses.start}`;
  return `${book} ${chapter}:${verses.start}-${verses.end}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Fetching published sets from PartyKit...');
const res = await fetch(PARTYKIT_URL);
const allSets = await res.json();

const kjvTopics = allSets.filter(s => s.title?.match(/^Topic:/i) && s.language === 'kjv');
console.log(`Found ${kjvTopics.length} KJV Topic: sets to convert to Malay\n`);

for (const set of kjvTopics) {
  const newId = set.id.replace(/-kjv$/, '-ms');
  console.log(`\n[${newId}] "${set.title}" — ${set.verses.length} verses`);

  const alreadyExists = allSets.find(s => s.id === newId);
  if (alreadyExists) console.log(`  ⚠ Malay version already exists, overwriting...`);

  const newVerses = [];
  for (const v of set.verses) {
    process.stdout.write(`  ${v.reference} ... `);
    const text = await fetchTBVerse(v.reference);
    const idRef = buildIndonesianRef(v.reference);
    if (text) {
      process.stdout.write('✓\n');
      newVerses.push({
        id: (v.id || '').replace(/-kjv$/g, '-ms').replace(/-kjv-/g, '-ms-'),
        reference: idRef,
        title: v.title,
        text,
      });
    } else {
      process.stdout.write('✗ (kept original ref)\n');
      newVerses.push({
        ...v,
        id: (v.id || '').replace(/-kjv$/g, '-ms').replace(/-kjv-/g, '-ms-'),
      });
    }
    await sleep(120);
  }

  const idSet = {
    id: newId,
    title: set.title,
    description: set.description || '',
    language: 'ms',
    isPublished: true,
    authorName: set.authorName || 'VerseRain',
    lastEditorName: ADMIN_NAME,
    lastEditedAt: new Date().toISOString(),
    verses: newVerses,
  };

  process.stdout.write(`  Publishing to PartyKit... `);
  const pubRes = await fetch(PARTYKIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...idSet, adminEmail: ADMIN_EMAIL, adminName: ADMIN_NAME }),
  });
  if (pubRes.ok) {
    process.stdout.write(`✅ Published!\n`);
  } else {
    const err = await pubRes.text();
    process.stdout.write(`❌ Failed: ${err.slice(0, 100)}\n`);
  }
}

console.log('\n✅ All Topic: Malay sets converted and published.');
