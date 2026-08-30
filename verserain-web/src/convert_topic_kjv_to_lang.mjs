/**
 * convert_topic_kjv_to_lang.mjs  <pt|fr|ru>
 *
 * Fetches all "Topic:" KJV published sets from PartyKit, converts each verse to
 * the target language via bolls.life, and republishes the converted set to
 * PartyKit. Mirrors convert_topic_kjv_to_id.mjs but parametrized for the three
 * languages added together (Portuguese / French / Russian).
 *
 *   node src/convert_topic_kjv_to_lang.mjs pt   # Almeida Revista e Corrigida 2009 (ARC09)
 *   node src/convert_topic_kjv_to_lang.mjs fr   # Louis Segond 1910 (FRLSG)
 *   node src/convert_topic_kjv_to_lang.mjs ru   # Russian Synodal (SYNOD)
 *   node src/convert_topic_kjv_to_lang.mjs hi   # Hindi (bolls slug — verify)
 *
 * Requires network access to bolls.life and the PartyKit host (won't run from a
 * sandbox with a restricted egress policy — run it from a normal machine).
 */

const PARTYKIT_URL = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets';
const ADMIN_EMAIL = 'hungry4grace@gmail.com';
const ADMIN_NAME = 'VerseRain';

// English book name / abbreviation → bolls.life book id (1-66).
const BOOK_ID = {
  'gen': 1, 'genesis': 1, 'exo': 2, 'exod': 2, 'exodus': 2, 'lev': 3, 'leviticus': 3,
  'num': 4, 'numbers': 4, 'deut': 5, 'deu': 5, 'deuteronomy': 5, 'josh': 6, 'jos': 6, 'joshua': 6,
  'judg': 7, 'judges': 7, 'ruth': 8,
  '1sam': 9, '1 sam': 9, '1samuel': 9, '1 samuel': 9, '2sam': 10, '2 sam': 10, '2samuel': 10, '2 samuel': 10,
  '1kgs': 11, '1 kgs': 11, '1kings': 11, '1 kings': 11, '2kgs': 12, '2 kgs': 12, '2kings': 12, '2 kings': 12,
  '1chr': 13, '1 chr': 13, '1chronicles': 13, '1 chronicles': 13, '2chr': 14, '2 chr': 14, '2chronicles': 14, '2 chronicles': 14,
  'ezra': 15, 'neh': 16, 'nehemiah': 16, 'esth': 17, 'esther': 17, 'job': 18,
  'ps': 19, 'psa': 19, 'psalm': 19, 'psalms': 19, 'prv': 20, 'prov': 20, 'proverbs': 20,
  'eccl': 21, 'ecclesiastes': 21, 'song': 22, 'sos': 22, 'isa': 23, 'isaiah': 23,
  'jer': 24, 'jeremiah': 24, 'lam': 25, 'lamentations': 25, 'ezek': 26, 'ezekiel': 26,
  'dan': 27, 'daniel': 27, 'hos': 28, 'hosea': 28, 'joel': 29, 'amos': 30, 'obad': 31, 'obadiah': 31,
  'jonah': 32, 'jon': 32, 'mic': 33, 'micah': 33, 'nah': 34, 'nahum': 34, 'hab': 35, 'habakkuk': 35,
  'zeph': 36, 'zephaniah': 36, 'hag': 37, 'haggai': 37, 'zech': 38, 'zechariah': 38, 'mal': 39, 'malachi': 39,
  'matt': 40, 'matthew': 40, 'mark': 41, 'mk': 41, 'luke': 42, 'lk': 42, 'john': 43, 'jn': 43,
  'acts': 44, 'rom': 45, 'romans': 45,
  '1cor': 46, '1 cor': 46, '1corinthians': 46, '1 corinthians': 46, '2cor': 47, '2 cor': 47, '2corinthians': 47, '2 corinthians': 47,
  'gal': 48, 'galatians': 48, 'eph': 49, 'ephesians': 49, 'phil': 50, 'philippians': 50, 'col': 51, 'colossians': 51,
  '1thess': 52, '1 thess': 52, '1thessalonians': 52, '1 thessalonians': 52, '2thess': 53, '2 thess': 53, '2thessalonians': 53, '2 thessalonians': 53,
  '1tim': 54, '1 tim': 54, '1timothy': 54, '1 timothy': 54, '2tim': 55, '2 tim': 55, '2timothy': 55, '2 timothy': 55,
  'titus': 56, 'phlm': 57, 'philemon': 57, 'heb': 58, 'hebrews': 58, 'jas': 59, 'james': 59,
  '1pet': 60, '1 pet': 60, '1peter': 60, '1 peter': 60, '2pet': 61, '2 pet': 61, '2peter': 61, '2 peter': 61,
  '1john': 62, '1 john': 62, '2john': 63, '2 john': 63, '3john': 64, '3 john': 64, 'jude': 65,
  'rev': 66, 'revelation': 66,
};

// Per-language config: bolls slug + native book names (id 1-66) for the display reference.
const LANGS = {
  pt: {
    slug: 'ARC09',
    names: {
      1:'Gênesis',2:'Êxodo',3:'Levítico',4:'Números',5:'Deuteronômio',6:'Josué',7:'Juízes',8:'Rute',9:'1 Samuel',10:'2 Samuel',
      11:'1 Reis',12:'2 Reis',13:'1 Crônicas',14:'2 Crônicas',15:'Esdras',16:'Neemias',17:'Ester',18:'Jó',19:'Salmos',20:'Provérbios',
      21:'Eclesiastes',22:'Cânticos',23:'Isaías',24:'Jeremias',25:'Lamentações',26:'Ezequiel',27:'Daniel',28:'Oseias',29:'Joel',30:'Amós',
      31:'Obadias',32:'Jonas',33:'Miqueias',34:'Naum',35:'Habacuque',36:'Sofonias',37:'Ageu',38:'Zacarias',39:'Malaquias',40:'Mateus',
      41:'Marcos',42:'Lucas',43:'João',44:'Atos',45:'Romanos',46:'1 Coríntios',47:'2 Coríntios',48:'Gálatas',49:'Efésios',50:'Filipenses',
      51:'Colossenses',52:'1 Tessalonicenses',53:'2 Tessalonicenses',54:'1 Timóteo',55:'2 Timóteo',56:'Tito',57:'Filemom',58:'Hebreus',59:'Tiago',60:'1 Pedro',
      61:'2 Pedro',62:'1 João',63:'2 João',64:'3 João',65:'Judas',66:'Apocalipse',
    },
  },
  fr: {
    slug: 'FRLSG',
    names: {
      1:'Genèse',2:'Exode',3:'Lévitique',4:'Nombres',5:'Deutéronome',6:'Josué',7:'Juges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
      11:'1 Rois',12:'2 Rois',13:'1 Chroniques',14:'2 Chroniques',15:'Esdras',16:'Néhémie',17:'Esther',18:'Job',19:'Psaumes',20:'Proverbes',
      21:'Ecclésiaste',22:'Cantique des cantiques',23:'Ésaïe',24:'Jérémie',25:'Lamentations',26:'Ézéchiel',27:'Daniel',28:'Osée',29:'Joël',30:'Amos',
      31:'Abdias',32:'Jonas',33:'Michée',34:'Nahum',35:'Habacuc',36:'Sophonie',37:'Aggée',38:'Zacharie',39:'Malachie',40:'Matthieu',
      41:'Marc',42:'Luc',43:'Jean',44:'Actes',45:'Romains',46:'1 Corinthiens',47:'2 Corinthiens',48:'Galates',49:'Éphésiens',50:'Philippiens',
      51:'Colossiens',52:'1 Thessaloniciens',53:'2 Thessaloniciens',54:'1 Timothée',55:'2 Timothée',56:'Tite',57:'Philémon',58:'Hébreux',59:'Jacques',60:'1 Pierre',
      61:'2 Pierre',62:'1 Jean',63:'2 Jean',64:'3 Jean',65:'Jude',66:'Apocalypse',
    },
  },
  ru: {
    slug: 'SYNOD',
    names: {
      1:'Бытие',2:'Исход',3:'Левит',4:'Числа',5:'Второзаконие',6:'Иисус Навин',7:'Судьи',8:'Руфь',9:'1 Царств',10:'2 Царств',
      11:'3 Царств',12:'4 Царств',13:'1 Паралипоменон',14:'2 Паралипоменон',15:'Ездра',16:'Неемия',17:'Есфирь',18:'Иов',19:'Псалтирь',20:'Притчи',
      21:'Екклесиаст',22:'Песнь Песней',23:'Исаия',24:'Иеремия',25:'Плач Иеремии',26:'Иезекииль',27:'Даниил',28:'Осия',29:'Иоиль',30:'Амос',
      31:'Авдий',32:'Иона',33:'Михей',34:'Наум',35:'Аввакум',36:'Софония',37:'Аггей',38:'Захария',39:'Малахия',40:'Матфея',
      41:'Марка',42:'Луки',43:'Иоанна',44:'Деяния',45:'Римлянам',46:'1 Коринфянам',47:'2 Коринфянам',48:'Галатам',49:'Ефесянам',50:'Филиппийцам',
      51:'Колоссянам',52:'1 Фессалоникийцам',53:'2 Фессалоникийцам',54:'1 Тимофею',55:'2 Тимофею',56:'Титу',57:'Филимону',58:'Евреям',59:'Иакова',60:'1 Петра',
      61:'2 Петра',62:'1 Иоанна',63:'2 Иоанна',64:'3 Иоанна',65:'Иуды',66:'Откровение',
    },
  },
  hi: {
    slug: 'HNV',
    names: {
      1:'उत्पत्ति',2:'निर्गमन',3:'लैव्यव्यवस्था',4:'गिनती',5:'व्यवस्थाविवरण',6:'यहोशू',7:'न्यायियों',8:'रूत',9:'1 शमूएल',10:'2 शमूएल',
      11:'1 राजा',12:'2 राजा',13:'1 इतिहास',14:'2 इतिहास',15:'एज्रा',16:'नहेम्याह',17:'एस्तेर',18:'अय्यूब',19:'भजन संहिता',20:'नीतिवचन',
      21:'सभोपदेशक',22:'श्रेष्ठगीत',23:'यशायाह',24:'यिर्मयाह',25:'विलापगीत',26:'यहेजकेल',27:'दानिय्येल',28:'होशे',29:'योएल',30:'आमोस',
      31:'ओबद्याह',32:'योना',33:'मीका',34:'नहूम',35:'हबक्कूक',36:'सपन्याह',37:'हाग्गै',38:'जकर्याह',39:'मलाकी',40:'मत्ती',
      41:'मरकुस',42:'लूका',43:'यूहन्ना',44:'प्रेरितों के काम',45:'रोमियों',46:'1 कुरिन्थियों',47:'2 कुरिन्थियों',48:'गलातियों',49:'इफिसियों',50:'फिलिप्पियों',
      51:'कुलुस्सियों',52:'1 थिस्सलुनीकियों',53:'2 थिस्सलुनीकियों',54:'1 तीमुथियुस',55:'2 तीमुथियुस',56:'तीतुस',57:'फिलेमोन',58:'इब्रानियों',59:'याकूब',60:'1 पतरस',
      61:'2 पतरस',62:'1 यूहन्ना',63:'2 यूहन्ना',64:'3 यूहन्ना',65:'यहूदा',66:'प्रकाशितवाक्य',
    },
  },
};

const lang = (process.argv[2] || '').toLowerCase();
const cfg = LANGS[lang];
if (!cfg) { console.error('Usage: node src/convert_topic_kjv_to_lang.mjs <pt|fr|ru>'); process.exit(1); }
const { slug: BOLLS_SLUG, names: NAMES } = cfg;

function parseRef(ref) {
  const clean = String(ref || '').replace(/[–—]/g, '-').trim();
  const chap = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)$/);
  if (chap) {
    const num = chap[1] ? chap[1].trim() : '';
    const bookRaw = (num + chap[2]).toLowerCase().replace(/\s+/g, ' ').trim();
    const id = BOOK_ID[bookRaw] || BOOK_ID[bookRaw.replace(/\s/g, '')] || null;
    if (id) return { id, chapter: parseInt(chap[3], 10), verses: null };
  }
  const m = clean.match(/^(\d\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)\s*:\s*([\d,\s\-]+)$/);
  if (!m) return null;
  const num = m[1] ? m[1].trim() : '';
  const bookRaw = (num + m[2]).toLowerCase().replace(/\s+/g, ' ').trim();
  const id = BOOK_ID[bookRaw] || BOOK_ID[bookRaw.replace(/\s/g, '')] || null;
  if (!id) return null;
  const chapter = parseInt(m[3], 10);
  const rawVerse = m[4].trim();
  const verses = rawVerse.includes(',')
    ? (() => { const p = rawVerse.split(',').map(v => v.trim()).filter(Boolean).map(Number).filter(n => !Number.isNaN(n)); return p.length ? { start: p[0], end: p[p.length - 1] } : null; })()
    : rawVerse.includes('-')
      ? (() => { const [s, e] = rawVerse.split('-').map(Number); return Number.isNaN(s) || Number.isNaN(e) ? null : { start: s, end: e }; })()
      : (() => { const v = parseInt(rawVerse, 10); return Number.isNaN(v) ? null : { start: v, end: v }; })();
  if (!verses) return null;
  return { id, chapter, verses };
}

function stripBollsMarkup(text) {
  return String(text || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchVerse(reference) {
  const parsed = parseRef(reference);
  if (!parsed) { console.warn(`  ⚠ Cannot parse: "${reference}"`); return null; }
  const { id, chapter, verses } = parsed;
  try {
    if (!verses) {
      const res = await fetch(`https://bolls.life/get-text/${BOLLS_SLUG}/${id}/${chapter}/`);
      if (!res.ok) return null;
      const arr = await res.json();
      if (!Array.isArray(arr) || !arr.length) return null;
      return arr.map(v => stripBollsMarkup(v.text)).filter(Boolean).join(' ') || null;
    }
    const list = [];
    const cap = Math.min(verses.end, verses.start + 11);
    for (let v = verses.start; v <= cap; v++) list.push(v);
    const texts = await Promise.all(list.map(v =>
      fetch(`https://bolls.life/get-verse/${BOLLS_SLUG}/${id}/${chapter}/${v}/`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.text ? stripBollsMarkup(d.text) || null : null)
        .catch(() => null)
    ));
    return texts.filter(Boolean).join(' ').trim() || null;
  } catch (e) {
    console.warn(`  ✗ Fetch error for "${reference}": ${e.message}`);
    return null;
  }
}

function buildRef(originalRef) {
  const parsed = parseRef(originalRef);
  if (!parsed) return originalRef;
  const { id, chapter, verses } = parsed;
  const book = NAMES[id];
  if (!book) return originalRef;
  if (!verses) return `${book} ${chapter}`;
  if (verses.start === verses.end) return `${book} ${chapter}:${verses.start}`;
  return `${book} ${chapter}:${verses.start}-${verses.end}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const reId = (s) => String(s || '').replace(/-kjv$/g, `-${lang}`).replace(/-kjv-/g, `-${lang}-`);

console.log(`Fetching published sets from PartyKit...`);
const res = await fetch(PARTYKIT_URL);
const allSets = await res.json();
const kjvTopics = allSets.filter(s => s.title?.match(/^Topic:/i) && s.language === 'kjv');
console.log(`Found ${kjvTopics.length} KJV Topic: sets to convert to "${lang}" (${BOLLS_SLUG})\n`);

for (const set of kjvTopics) {
  const newId = set.id.replace(/-kjv$/, `-${lang}`);
  console.log(`\n[${newId}] "${set.title}" — ${set.verses.length} verses`);
  if (allSets.find(s => s.id === newId)) console.log(`  ⚠ ${lang} version already exists, overwriting...`);

  const newVerses = [];
  for (const v of set.verses) {
    process.stdout.write(`  ${v.reference} ... `);
    const text = await fetchVerse(v.reference);
    const ref = buildRef(v.reference);
    if (text) {
      process.stdout.write('✓\n');
      newVerses.push({ id: reId(v.id), reference: ref, title: v.title, text });
    } else {
      process.stdout.write('✗ (kept original ref)\n');
      newVerses.push({ ...v, id: reId(v.id) });
    }
    await sleep(120);
  }

  const outSet = {
    id: newId,
    title: set.title,
    description: set.description || '',
    language: lang,
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
    body: JSON.stringify({ ...outSet, adminEmail: ADMIN_EMAIL, adminName: ADMIN_NAME }),
  });
  process.stdout.write(pubRes.ok ? `✅ Published!\n` : `❌ Failed: ${(await pubRes.text()).slice(0, 100)}\n`);
}

console.log(`\n✅ All Topic: "${lang}" sets converted and published.`);
