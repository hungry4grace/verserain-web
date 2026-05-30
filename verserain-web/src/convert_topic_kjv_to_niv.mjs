/**
 * convert_topic_kjv_to_niv.mjs
 * Fetches all "Topic:" KJV published sets from PartyKit,
 * converts each verse to NIV text via API.Bible,
 * then publishes the NIV version back to PartyKit.
 *
 * Run: node src/convert_topic_kjv_to_niv.mjs
 */

const PARTYKIT_URL = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets';
const NIV_BIBLE_ID = '78a9f6124f344018-01';
const NIV_API_KEY = 'EhwacxPvzpgkEorXeUvoR';
const ADMIN_EMAIL = 'hungry4grace@gmail.com';
const ADMIN_NAME = 'VerseRain';

const BOOK_OSIS = {
  'gen': 'GEN', 'genesis': 'GEN',
  'exo': 'EXO', 'exod': 'EXO', 'exodus': 'EXO',
  'lev': 'LEV', 'leviticus': 'LEV',
  'num': 'NUM', 'numbers': 'NUM',
  'deut': 'DEU', 'deu': 'DEU', 'deuteronomy': 'DEU',
  'josh': 'JOS', 'jos': 'JOS', 'joshua': 'JOS',
  'judg': 'JDG', 'judges': 'JDG',
  'ruth': 'RUT', 'ru': 'RUT',
  '1sam': '1SA', '1 sam': '1SA', '1samuel': '1SA',
  '2sam': '2SA', '2 sam': '2SA', '2samuel': '2SA',
  '1kgs': '1KI', '1 kgs': '1KI', '1kings': '1KI', '1 kings': '1KI',
  '2kgs': '2KI', '2 kgs': '2KI', '2kings': '2KI', '2 kings': '2KI',
  '1chr': '1CH', '1 chr': '1CH', '1chronicles': '1CH', '1 chronicles': '1CH',
  '2chr': '2CH', '2 chr': '2CH', '2chronicles': '2CH', '2 chronicles': '2CH',
  'ezra': 'EZR', 'ezr': 'EZR',
  'neh': 'NEH', 'nehemiah': 'NEH',
  'esth': 'EST', 'est': 'EST', 'esther': 'EST',
  'job': 'JOB', 'jb': 'JOB',
  'ps': 'PSA', 'psa': 'PSA', 'psalm': 'PSA', 'psalms': 'PSA',
  'prv': 'PRO', 'prov': 'PRO', 'proverbs': 'PRO',
  'eccl': 'ECC', 'ecc': 'ECC', 'ecclesiastes': 'ECC',
  'song': 'SNG', 'sng': 'SNG', 'sos': 'SNG',
  'isa': 'ISA', 'isaiah': 'ISA',
  'jer': 'JER', 'jeremiah': 'JER',
  'lam': 'LAM', 'lamentations': 'LAM',
  'ezek': 'EZK', 'ezk': 'EZK', 'ezekiel': 'EZK',
  'dan': 'DAN', 'daniel': 'DAN',
  'hos': 'HOS', 'hosea': 'HOS',
  'joel': 'JOL', 'jol': 'JOL',
  'amos': 'AMO', 'am': 'AMO',
  'obad': 'OBA', 'oba': 'OBA', 'obadiah': 'OBA',
  'jonah': 'JON', 'jon': 'JON',
  'mic': 'MIC', 'micah': 'MIC',
  'nah': 'NAM', 'nahum': 'NAM',
  'hab': 'HAB', 'habakkuk': 'HAB',
  'zeph': 'ZEP', 'zep': 'ZEP', 'zephaniah': 'ZEP',
  'hag': 'HAG', 'haggai': 'HAG',
  'zech': 'ZEC', 'zec': 'ZEC', 'zechariah': 'ZEC',
  'mal': 'MAL', 'malachi': 'MAL',
  'matt': 'MAT', 'mat': 'MAT', 'matthew': 'MAT',
  'mark': 'MRK', 'mrk': 'MRK', 'mk': 'MRK',
  'luke': 'LUK', 'luk': 'LUK', 'lk': 'LUK',
  'john': 'JHN', 'jhn': 'JHN', 'jn': 'JHN', 'joh': 'JHN',
  'acts': 'ACT', 'act': 'ACT',
  'rom': 'ROM', 'romans': 'ROM',
  '1cor': '1CO', '1 cor': '1CO', '1corinthians': '1CO', '1 corinthians': '1CO',
  '2cor': '2CO', '2 cor': '2CO', '2corinthians': '2CO', '2 corinthians': '2CO',
  'gal': 'GAL', 'galatians': 'GAL',
  'eph': 'EPH', 'ephesians': 'EPH',
  'phil': 'PHP', 'php': 'PHP', 'philippians': 'PHP',
  'col': 'COL', 'colossians': 'COL',
  '1thess': '1TH', '1 thess': '1TH', '1thessalonians': '1TH',
  '2thess': '2TH', '2 thess': '2TH', '2thessalonians': '2TH',
  '1tim': '1TI', '1 tim': '1TI', '1timothy': '1TI',
  '2tim': '2TI', '2 tim': '2TI', '2timothy': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'phlm': 'PHM', 'philem': 'PHM', 'philemon': 'PHM',
  'heb': 'HEB', 'hebrews': 'HEB',
  'jas': 'JAS', 'james': 'JAS',
  '1pet': '1PE', '1 pet': '1PE', '1peter': '1PE',
  '2pet': '2PE', '2 pet': '2PE', '2peter': '2PE',
  '1john': '1JN', '1 john': '1JN', '1jn': '1JN',
  '2john': '2JN', '2 john': '2JN', '2jn': '2JN',
  '3john': '3JN', '3 john': '3JN', '3jn': '3JN',
  'jude': 'JUD',
  'rev': 'REV', 'revelation': 'REV',
};

function parseRef(ref) {
  const clean = String(ref || '').replace(/[–—]/g, '-').trim();
  // Whole chapter
  const chap = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)$/);
  if (chap) {
    const num = chap[1] ? chap[1].trim() : '';
    const bookRaw = (num + chap[2]).toLowerCase().replace(/\s+/g, ' ').trim();
    const book = BOOK_OSIS[bookRaw] || BOOK_OSIS[bookRaw.replace(/\s/g, '')] || null;
    if (book) return { book, chapter: chap[3], verse: null };
  }
  const m = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)\s*:\s*([\d,\s\-]+)$/);
  if (!m) return null;
  const num = m[1] ? m[1].trim() : '';
  const bookRaw = (num + m[2]).toLowerCase().replace(/\s+/g, ' ').trim();
  const book = BOOK_OSIS[bookRaw] || BOOK_OSIS[bookRaw.replace(/\s/g, '')] || null;
  if (!book) return null;
  const rawVerse = m[4].trim();
  const verse = rawVerse.includes(',')
    ? rawVerse.split(',').map(v => v.trim()).filter(Boolean).join('-').replace(/(\d+)-(\d+)-(\d+)/, (_, a, _b, c) => `${a}-${c}`)
    : rawVerse.replace(/\s/g, '');
  return { book, chapter: m[3], verse };
}

function buildPassageId(p) {
  if (!p.verse) return `${p.book}.${p.chapter}`;
  if (p.verse.includes('-')) {
    const [s, e] = p.verse.split('-');
    return `${p.book}.${p.chapter}.${s}-${p.book}.${p.chapter}.${e}`;
  }
  return `${p.book}.${p.chapter}.${p.verse}`;
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchNIV(reference) {
  const parsed = parseRef(reference);
  if (!parsed) { console.warn(`  ⚠ Cannot parse: "${reference}"`); return null; }
  const passageId = buildPassageId(parsed);
  const url = `https://rest.api.bible/v1/bibles/${NIV_BIBLE_ID}/passages/${encodeURIComponent(passageId)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false`;
  const res = await fetch(url, { headers: { 'api-key': NIV_API_KEY } });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  ✗ API ${res.status} for "${reference}" (${passageId}): ${err.slice(0, 100)}`);
    return null;
  }
  const data = await res.json();
  return stripHtml(data?.data?.content || '').replace(/\s+/g, ' ').trim() || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Fetching published sets from PartyKit...');
const res = await fetch(PARTYKIT_URL);
const allSets = await res.json();

const kjvTopics = allSets.filter(s => s.title?.match(/^Topic:/i) && s.language === 'kjv');
console.log(`Found ${kjvTopics.length} KJV Topic: sets to convert\n`);

for (const set of kjvTopics) {
  const newId = set.id.replace(/-kjv$/, '-niv');
  console.log(`\n[${newId}] "${set.title}" — ${set.verses.length} verses`);

  // Check if NIV version already exists
  const alreadyExists = allSets.find(s => s.id === newId);
  if (alreadyExists) {
    console.log(`  ⚠ NIV version already exists, overwriting...`);
  }

  const newVerses = [];
  for (const v of set.verses) {
    process.stdout.write(`  ${v.reference} ... `);
    const text = await fetchNIV(v.reference);
    if (text) {
      process.stdout.write('✓\n');
      newVerses.push({
        id: (v.id || '').replace(/-kjv$/g, '-niv').replace(/-kjv-/g, '-niv-'),
        reference: v.reference,
        title: v.title,
        text,
      });
    } else {
      process.stdout.write('✗ (kept KJV text)\n');
      newVerses.push({
        ...v,
        id: (v.id || '').replace(/-kjv$/g, '-niv').replace(/-kjv-/g, '-niv-'),
      });
    }
    await sleep(120);
  }

  const nivSet = {
    id: newId,
    title: set.title,
    description: set.description || '',
    language: 'niv',
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
    body: JSON.stringify({ ...nivSet, adminEmail: ADMIN_EMAIL, adminName: ADMIN_NAME }),
  });
  if (pubRes.ok) {
    process.stdout.write(`✅ Published!\n`);
  } else {
    const err = await pubRes.text();
    process.stdout.write(`❌ Failed: ${err.slice(0, 100)}\n`);
  }
}

console.log('\n✅ All Topic: NIV sets converted and published.');
