
// Fetch Gospel of John core verses and Matthew important verses in EN (KJV), JA, KO
// and output JS-ready data

const JOHN_REFS = [
  { ref: "John 1:1", cn: "約翰福音 1:1" },
  { ref: "John 1:12", cn: "約翰福音 1:12" },
  { ref: "John 1:14", cn: "約翰福音 1:14" },
  { ref: "John 3:16", cn: "約翰福音 3:16" },
  { ref: "John 4:24", cn: "約翰福音 4:24" },
  { ref: "John 8:12", cn: "約翰福音 8:12" },
  { ref: "John 8:31-32", cn: "約翰福音 8:31-32" },
  { ref: "John 10:10", cn: "約翰福音 10:10" },
  { ref: "John 10:11", cn: "約翰福音 10:11" },
  { ref: "John 11:25-26", cn: "約翰福音 11:25-26" },
  { ref: "John 14:1", cn: "約翰福音 14:1" },
  { ref: "John 14:6", cn: "約翰福音 14:6" },
  { ref: "John 14:21", cn: "約翰福音 14:21" },
  { ref: "John 15:5", cn: "約翰福音 15:5" },
  { ref: "John 15:7", cn: "約翰福音 15:7" },
  { ref: "John 16:33", cn: "約翰福音 16:33" },
];

const MATTHEW_REFS = [
  { ref: "Matthew 1:23", cn: "馬太福音1:23" },
  { ref: "Matthew 2:17-18", cn: "馬太福音2:17-18" },
  { ref: "Matthew 3:1-2", cn: "馬太福音3:1-2" },
  { ref: "Matthew 3:3-4", cn: "馬太福音3:3-4" },
  { ref: "Matthew 3:7-8", cn: "馬太福音3:7-8" },
  { ref: "Matthew 3:10", cn: "馬太福音3:10" },
  { ref: "Matthew 3:11", cn: "馬太福音3:11" },
  { ref: "Matthew 3:12", cn: "馬太福音3:12" },
  { ref: "Matthew 3:16-17", cn: "馬太福音3:16-17" },
  { ref: "Matthew 4:1-2", cn: "馬太福音4:1-2" },
  { ref: "Matthew 4:4", cn: "馬太福音4:4" },
  { ref: "Matthew 5:3-10", cn: "馬太福音5:3-10" },
  { ref: "Matthew 5:13", cn: "馬太福音5:13" },
  { ref: "Matthew 5:14-16", cn: "馬太福音5:14-16" },
  { ref: "Matthew 5:17-18", cn: "馬太福音3:17-18" }, // note: original CN ref says 3:17-18 but it's 5:17-18 content
  { ref: "Matthew 5:22", cn: "馬太福音5:22" },
  { ref: "Matthew 5:29", cn: "馬太福音5:29" },
  { ref: "Matthew 5:34-36", cn: "馬太福音5:34-36" },
  { ref: "Matthew 5:41-42", cn: "馬太福音5:41-42" },
  { ref: "Matthew 5:44", cn: "馬太福音5:44" },
  { ref: "Matthew 6:3-4", cn: "馬太福音6:3-4" },
  { ref: "Matthew 6:6", cn: "馬太福音6:6" },
  { ref: "Matthew 6:9-13", cn: "馬太福音6:9-13" },
  { ref: "Matthew 6:22-23", cn: "馬太福音6:22-23" },
  { ref: "Matthew 6:24", cn: "馬太福音6:24" },
  { ref: "Matthew 6:26-27", cn: "馬太福音6:26-27" },
  { ref: "Matthew 6:33-34", cn: "馬太福音6:33-34" },
  { ref: "Matthew 7:2", cn: "馬太福音7:2" },
  { ref: "Matthew 7:5", cn: "馬太福音7:5" },
  { ref: "Matthew 7:6", cn: "馬太福音7:6" },
  { ref: "Matthew 7:7-8", cn: "馬太福音7:7-8" },
  { ref: "Matthew 7:11-12", cn: "馬太福音7:11-12" },
  { ref: "Matthew 7:13-14", cn: "馬太福音7:13-14" },
  { ref: "Matthew 7:16-17", cn: "馬太福音7:16-17" },
  { ref: "Matthew 7:21", cn: "馬太福音7:21" },
  { ref: "Matthew 7:24-25", cn: "馬太福音7:24-25" },
  { ref: "Matthew 8:17", cn: "馬太福音8:17" },
  { ref: "Matthew 9:12", cn: "馬太福音9:12" },
  { ref: "Matthew 9:13", cn: "馬太福音9:13" },
  { ref: "Matthew 9:37-38", cn: "馬太福音9:37-38" },
  { ref: "Matthew 10:16", cn: "馬太福音10:16" },
  { ref: "Matthew 10:19-20", cn: "馬太福音10:19-20" },
  { ref: "Matthew 10:29-31", cn: "馬太福音10:29-31" },
  { ref: "Matthew 10:34", cn: "馬太福音10:34" },
  { ref: "Matthew 11:5-6", cn: "馬太福音11:5-6" },
  { ref: "Matthew 11:12-13", cn: "馬太福音11:12-13" },
  { ref: "Matthew 11:17", cn: "馬太福音11:17" },
  { ref: "Matthew 11:25", cn: "馬太福音11:25" },
  { ref: "Matthew 11:27", cn: "馬太福音11:27" },
  { ref: "Matthew 11:28", cn: "馬太福音11:28" },
  { ref: "Matthew 11:29-30", cn: "馬太福音11:29-30" },
  { ref: "Matthew 12:18", cn: "馬太福音12:18" },
  { ref: "Matthew 12:20-21", cn: "馬太福音12:20-21" },
  { ref: "Matthew 12:25", cn: "馬太福音12:25" },
  { ref: "Matthew 12:30", cn: "馬太福音12:30" },
  { ref: "Matthew 12:32", cn: "馬太福音12:32" },
  { ref: "Matthew 12:36", cn: "馬太福音12:36" },
  { ref: "Matthew 12:50", cn: "馬太福音12:50" },
  { ref: "Matthew 13:44", cn: "馬太福音13:44" },
  { ref: "Matthew 13:57", cn: "馬太福音13:57" },
  { ref: "Matthew 15:8-9", cn: "馬太福音15:8-9" },
  { ref: "Matthew 15:11", cn: "馬太福音15:11" },
  { ref: "Matthew 15:13-14", cn: "馬太福音15:13-14" },
  { ref: "Matthew 16:23", cn: "馬太福音16:23" },
  { ref: "Matthew 16:24", cn: "馬太福音16:24" },
  { ref: "Matthew 16:27", cn: "馬太福音16:27" },
  { ref: "Matthew 17:17", cn: "馬太福音17:17" },
  { ref: "Matthew 17:20", cn: "馬太福音17:20" },
  { ref: "Matthew 18:4", cn: "馬太福音18:4" },
  { ref: "Matthew 18:14", cn: "馬太福音18:14" },
  { ref: "Matthew 18:18", cn: "馬太福音18:18" },
  { ref: "Matthew 18:20", cn: "馬太福音18:20" },
  { ref: "Matthew 19:21", cn: "馬太福音19:21" },
  { ref: "Matthew 19:24", cn: "馬太福音19:24" },
  { ref: "Matthew 19:26", cn: "馬太福音19:26" },
  { ref: "Matthew 20:23", cn: "馬太福音20:23" },
  { ref: "Matthew 20:26-27", cn: "馬太福音20:26-27" },
  { ref: "Matthew 20:28", cn: "馬太福音20:28" },
  { ref: "Matthew 21:22", cn: "馬太福音21:22" },
  { ref: "Matthew 21:42", cn: "馬太福音21:42" },
  { ref: "Matthew 21:44", cn: "馬太福音21:44" },
  { ref: "Matthew 22:14", cn: "馬太福音22:14" },
  { ref: "Matthew 22:30", cn: "馬太福音22:30" },
  { ref: "Matthew 22:37-40", cn: "馬太福音22:37-40" },
  { ref: "Matthew 23:12", cn: "馬太福音23:12" },
  { ref: "Matthew 23:35", cn: "馬太福音23:35" },
  { ref: "Matthew 24:7-8", cn: "馬太福音24:7-8" },
  { ref: "Matthew 24:13-14", cn: "馬太福音24:13-14" },
  { ref: "Matthew 24:36", cn: "馬太福音24:36" },
  { ref: "Matthew 26:39", cn: "馬太福音26:39" },
  { ref: "Matthew 26:41", cn: "馬太福音26:41" },
  { ref: "Matthew 26:42", cn: "馬太福音26:42" },
  { ref: "Matthew 28:19-20", cn: "馬太福音28:19-20" },
];

// Bible version codes for bolls.life API
const VERSIONS = {
  en: "KJV",
  ja: "JPNICT",
  ko: "KRV",
};

// Book IDs for bolls.life API
const BOOK_IDS = {
  Matthew: 40,
  John: 43,
};

// Parse "Matthew 5:3-10" -> { book: 40, chapter: 5, startVerse: 3, endVerse: 10 }
function parseRef(ref) {
  const match = ref.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const bookName = match[1];
  const chapter = parseInt(match[2]);
  const startVerse = parseInt(match[3]);
  const endVerse = match[4] ? parseInt(match[4]) : startVerse;
  return { bookId: BOOK_IDS[bookName], chapter, startVerse, endVerse };
}

function cleanText(text, version) {
  // Strip Strong's numbers (e.g. <S>1722</S>)
  let clean = text.replace(/<S>\d+<\/S>/gi, '');
  // Strip HTML tags (footnotes, etc.)
  clean = clean.replace(/<[^>]+>/g, '');
  // Strip superscript footnote markers
  clean = clean.replace(/\s+/g, ' ').trim();
  // Clean up punctuation spacing
  clean = clean.replace(/\s+([.,;:!?])/g, '$1');
  return clean;
}

async function fetchVerseText(version, bookId, chapter, startVerse, endVerse) {
  const url = `https://bolls.life/get-text/${version}/${bookId}/${chapter}/`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.error(`Empty response for ${version} ${bookId}:${chapter}`);
      return '';
    }
    const verses = data.filter(
      (v) => v.verse >= startVerse && v.verse <= endVerse
    );
    // For Japanese, join without space (CJK characters)
    const joiner = (version === 'JPNICT') ? '' : ' ';
    return verses.map((v) => cleanText(v.text, version)).join(joiner);
  } catch (e) {
    console.error(`Error fetching ${version} ${bookId}:${chapter}:${startVerse}-${endVerse}:`, e.message);
    return "";
  }
}

// Japanese reference format
const JA_BOOK = { John: "ヨハネの福音書", Matthew: "マタイの福音書" };
const KO_BOOK = { John: "요한복음", Matthew: "마태복음" };

function makeJaRef(enRef) {
  const m = enRef.match(/^(\w+)\s+(.+)$/);
  return `${JA_BOOK[m[1]]} ${m[2]}`;
}
function makeKoRef(enRef) {
  const m = enRef.match(/^(\w+)\s+(.+)$/);
  return `${KO_BOOK[m[1]]} ${m[2]}`;
}

async function processSet(name, refs, lang, version, makeLocalRef) {
  const results = [];
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    const parsed = parseRef(r.ref);
    if (!parsed) {
      console.error(`Cannot parse: ${r.ref}`);
      results.push({ ref: r.ref, text: "" });
      continue;
    }
    const text = await fetchVerseText(
      version,
      parsed.bookId,
      parsed.chapter,
      parsed.startVerse,
      parsed.endVerse
    );
    const localRef = makeLocalRef ? makeLocalRef(r.ref) : r.ref;
    results.push({ ref: localRef, text });
    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}

async function main() {
  console.log("Fetching John core verses...");

  // KJV
  console.log('Fetching KJV...');
  const johnKJV = await processSet("john", JOHN_REFS, "en", "KJV", null);
  const matthewKJV = await processSet("matthew", MATTHEW_REFS, "en", "KJV", null);

  console.log("Fetching Japanese verses...");
  const johnJA = []; //await processSet("john", JOHN_REFS, "ja", "JPNICT", makeJaRef);
  const matthewJA = []; //await processSet("matthew", MATTHEW_REFS, "ja", "JPNICT", makeJaRef);

  console.log("Fetching Korean verses...");
  const johnKO = []; //await processSet("john", JOHN_REFS, "ko", "KRV", makeKoRef);
  const matthewKO = []; //await processSet("matthew", MATTHEW_REFS, "ko", "KRV", makeKoRef);

  // Generate output
  function genVerses(data, idPrefix, titleStr) {
    return data
      .map(
        (v, i) =>
          `      { id: "${idPrefix}-${i + 1}", reference: ${JSON.stringify(v.ref)}, title: ${JSON.stringify(titleStr)}, text: ${JSON.stringify(v.text)} }`
      )
      .join(",\n");
  }

  // KJV output
  const kjvOutput = `
  // === Gospel of John Core Verses (KJV) ===
  {
    id: "gospel-of-john-kjv",
    title: "Gospel of John (Core Verses)",
    description: "Selected core declarations, promises, and truths from the Gospel of John.",
    verses: [
${genVerses(johnKJV, "john-core-kjv", "Gospel of John Core Verses")}
    ]
  },
  // === Matthew Important Verses (KJV) ===
  {
    id: "matthew-important-kjv",
    title: "Matthew (Important Verses)",
    description: "Key verses from the Gospel of Matthew for study and memorization.",
    verses: [
${genVerses(matthewKJV, "matthew-important-kjv", "Matthew Important Verses")}
    ]
  },`;

  // JA output
  const jaOutput = `
  // === ヨハネの福音書 核心聖句 ===
  {
    id: "gospel-of-john-ja",
    title: "ヨハネの福音書 核心聖句",
    description: "ヨハネの福音書から選ばれた重要な宣言、約束、真理。",
    language: "ja",
    verses: [
${genVerses(johnJA, "john-core-ja", "ヨハネの福音書 核心聖句")}
    ]
  },
  // === マタイの福音書 重要聖句 ===
  {
    id: "matthew-important-ja",
    title: "マタイの福音書 重要聖句",
    description: "マタイの福音書の重要な経文テストと黙想集。",
    language: "ja",
    verses: [
${genVerses(matthewJA, "matthew-important-ja", "マタイの福音書 重要聖句")}
    ]
  },`;

  // KO output
  const koOutput = `
  // === 요한복음 핵심 구절 ===
  {
    id: "gospel-of-john-ko",
    title: "요한복음 핵심 구절",
    description: "요한복음에서 엄선한 핵심 선언, 약속, 진리.",
    language: "ko",
    verses: [
${genVerses(johnKO, "john-core-ko", "요한복음 핵심 구절")}
    ]
  },
  // === 마태복음 중요 구절 ===
  {
    id: "matthew-important-ko",
    title: "마태복음 중요 구절",
    description: "마태복음의 중요한 구절 시험과 묵상 모음.",
    language: "ko",
    verses: [
${genVerses(matthewKO, "matthew-important-ko", "마태복음 중요 구절")}
    ]
  },`;

  // Write to files
  const fs = await import("fs");

  fs.writeFileSync(
    "/Users/davidhwang/venv/VerseScramble/verserain-web/src/_generated_kjv.txt",
    kjvOutput
  );
  fs.writeFileSync(
    "/Users/davidhwang/venv/VerseScramble/verserain-web/src/_generated_ja.txt",
    jaOutput
  );
  fs.writeFileSync(
    "/Users/davidhwang/venv/VerseScramble/verserain-web/src/_generated_ko.txt",
    koOutput
  );

  console.log("Done! Generated files:");
  console.log("  _generated_kjv.txt");
  console.log("  _generated_ja.txt");
  console.log("  _generated_ko.txt");
}

main().catch(console.error);
