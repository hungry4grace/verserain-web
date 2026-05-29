/**
 * patch_fathers_love_niv.mjs
 * Patches the fathers-love-niv set in verses_niv.js:
 * converts Chinese abbreviated references → English → fetches NIV text
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NIV_BIBLE_ID = '78a9f6124f344018-01';
const NIV_API_KEY = 'EhwacxPvzpgkEorXeUvoR';

// Chinese abbreviated book name → English full name
const ZH_ABBR_TO_EN = {
  '約': 'John', '約翰': 'John',
  '耶': 'Jeremiah', '耶利米': 'Jeremiah',
  '羅': 'Romans', '羅馬': 'Romans',
  '約一': '1 John', '約翰一書': '1 John',
  '約二': '2 John', '約三': '3 John',
  '弗': 'Ephesians', '以弗所': 'Ephesians',
  '賽': 'Isaiah', '以賽亞': 'Isaiah',
  '書': 'Joshua', '約書亞': 'Joshua',
  '申': 'Deuteronomy', '申命記': 'Deuteronomy',
  '詩': 'Psalms', '詩篇': 'Psalms',
  '腓': 'Philippians', '腓立比': 'Philippians',
  '太': 'Matthew', '馬太': 'Matthew',
  '林後': '2 Corinthians', '哥林多後': '2 Corinthians',
  '林前': '1 Corinthians',
  '番': 'Zephaniah', '西番雅': 'Zephaniah',
  '民': 'Numbers', '民數記': 'Numbers',
  '出': 'Exodus', '出埃及': 'Exodus',
  '創': 'Genesis',
  '可': 'Mark', '馬可': 'Mark',
  '路': 'Luke', '路加': 'Luke',
  '徒': 'Acts',
  '加': 'Galatians', '加拉太': 'Galatians',
  '西': 'Colossians', '歌羅西': 'Colossians',
  '帖前': '1 Thessalonians', '帖後': '2 Thessalonians',
  '提前': '1 Timothy', '提後': '2 Timothy',
  '多': 'Titus', '門': 'Philemon',
  '來': 'Hebrews', '希伯來': 'Hebrews',
  '雅': 'James', '雅各': 'James',
  '彼前': '1 Peter', '彼後': '2 Peter',
  '猶': 'Jude',
  '啟': 'Revelation', '啟示錄': 'Revelation',
  '彼後': '2 Peter',
  '伯': 'Job',
  '箴': 'Proverbs',
  '傳': 'Ecclesiastes',
  '歌': 'Song of Solomon',
  '哀': 'Lamentations',
  '結': 'Ezekiel',
  '但': 'Daniel',
  '何': 'Hosea',
  '珥': 'Joel',
  '摩': 'Amos',
  '俄': 'Obadiah',
  '拿': 'Jonah',
  '彌': 'Micah',
  '鴻': 'Nahum',
  '哈': 'Habakkuk',
  '該': 'Haggai',
  '亞': 'Zechariah',
  '瑪': 'Malachi',
  '代上': '1 Chronicles', '代下': '2 Chronicles',
  '王上': '1 Kings', '王下': '2 Kings',
  '撒上': '1 Samuel', '撒下': '2 Samuel',
  '拉': 'Ezra', '尼': 'Nehemiah',
  '斯': 'Esther', '得': 'Ruth',
};

function zhRefToEn(zhRef) {
  const clean = String(zhRef).trim();
  // Match: "約 3:16", "約一 4:9", "林後 1:3", "腓 4:6-7"
  const m = clean.match(/^([^\d\s:]+)\s*(\d+)\s*[:：]\s*([\d\-]+)$/);
  if (!m) return null;
  const bookZh = m[1].trim();
  const chap = m[2];
  const verse = m[3];
  const bookEn = ZH_ABBR_TO_EN[bookZh];
  if (!bookEn) { console.warn(`  Unknown Chinese abbr: "${bookZh}"`); return null; }
  return `${bookEn} ${chap}:${verse}`;
}

const BOOK_OSIS = {
  'john': 'JHN', '1 john': '1JN', '2 john': '2JN', '3 john': '3JN',
  'jeremiah': 'JER', 'romans': 'ROM', 'ephesians': 'EPH', 'isaiah': 'ISA',
  'joshua': 'JOS', 'deuteronomy': 'DEU', 'psalms': 'PSA', 'psalm': 'PSA',
  'philippians': 'PHP', 'matthew': 'MAT', '2 corinthians': '2CO', '1 corinthians': '1CO',
  'zephaniah': 'ZEP', 'numbers': 'NUM', 'exodus': 'EXO', 'genesis': 'GEN',
  'mark': 'MRK', 'luke': 'LUK', 'acts': 'ACT', 'galatians': 'GAL',
  'colossians': 'COL', '1 thessalonians': '1TH', '2 thessalonians': '2TH',
  '1 timothy': '1TI', '2 timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM',
  'hebrews': 'HEB', 'james': 'JAS', '1 peter': '1PE', '2 peter': '2PE',
  'jude': 'JUD', 'revelation': 'REV', 'proverbs': 'PRO', 'job': 'JOB',
  'ecclesiastes': 'ECC', 'song of solomon': 'SNG', 'lamentations': 'LAM',
  'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS', 'joel': 'JOL',
  'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON', 'micah': 'MIC',
  'nahum': 'NAM', 'habakkuk': 'HAB', 'haggai': 'HAG', 'zechariah': 'ZEC',
  'malachi': 'MAL', '1 chronicles': '1CH', '2 chronicles': '2CH',
  '1 kings': '1KI', '2 kings': '2KI', '1 samuel': '1SA', '2 samuel': '2SA',
  'ezra': 'EZR', 'nehemiah': 'NEH', 'esther': 'EST', 'ruth': 'RUT',
};

function buildPassageId(enRef) {
  const clean = enRef.replace(/[–—]/g, '-').trim();
  const m = clean.match(/^([\w\s]+?)\s+(\d+)\s*:\s*([\d\-]+)$/i);
  if (!m) return null;
  const bookEn = m[1].toLowerCase().trim();
  const osis = BOOK_OSIS[bookEn];
  if (!osis) { console.warn(`Unknown book: "${m[1]}"`); return null; }
  const chap = m[2];
  const verse = m[3];
  if (verse.includes('-')) {
    const [s, e] = verse.split('-');
    return `${osis}.${chap}.${s}-${osis}.${chap}.${e}`;
  }
  return `${osis}.${chap}.${verse}`;
}

function stripHtml(html) {
  return String(html||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}

async function fetchNIV(enRef) {
  const pid = buildPassageId(enRef);
  if (!pid) return null;
  const url = `https://rest.api.bible/v1/bibles/${NIV_BIBLE_ID}/passages/${encodeURIComponent(pid)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false`;
  const res = await fetch(url, { headers: { 'api-key': NIV_API_KEY } });
  if (!res.ok) { console.warn(`  API ${res.status} for "${enRef}" (${pid})`); return null; }
  const data = await res.json();
  return stripHtml(data?.data?.content||'') || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Load the current verses_niv.js to get the fathers-love-niv set
const { VERSE_SETS_NIV } = await import('./verses_niv.js');
const { VERSE_SETS_KJV } = await import('./verses_kjv.js');

// Find fathers-love set in original KJV
const kjvSet = VERSE_SETS_KJV.find(s => s.id === 'fathers-love-en');
if (!kjvSet) { console.error('fathers-love-en not found'); process.exit(1); }

console.log(`Patching fathers-love-niv (${kjvSet.verses.length} verses)...`);

const newVerses = [];
for (const v of kjvSet.verses) {
  process.stdout.write(`  ${v.reference} → `);
  const enRef = zhRefToEn(v.reference);
  if (!enRef) { process.stdout.write('skip\n'); newVerses.push({ ...v, id: (v.id||'').replace(/-en/,'-niv').replace(/-kjv/,'-niv') }); continue; }
  process.stdout.write(`${enRef} ... `);
  const text = await fetchNIV(enRef);
  if (text) {
    process.stdout.write('✓\n');
    newVerses.push({ id: (v.id||'').replace(/-en/,'-niv').replace(/-kjv/,'-niv'), reference: enRef, title: v.title, text });
  } else {
    process.stdout.write('✗ (kept original)\n');
    newVerses.push({ ...v, id: (v.id||'').replace(/-en/,'-niv').replace(/-kjv/,'-niv') });
  }
  await sleep(120);
}

// Replace in VERSE_SETS_NIV
const patched = VERSE_SETS_NIV.map(s =>
  s.id === 'fathers-love-niv' ? { ...s, verses: newVerses } : s
);

// Write back
function jsStr(obj, indent=0) {
  const pad='  '.repeat(indent), p1='  '.repeat(indent+1);
  if (Array.isArray(obj)) {
    if(!obj.length) return '[]';
    return `[\n${obj.map(i=>`${p1}${jsStr(i,indent+1)}`).join(',\n')}\n${pad}]`;
  }
  if (typeof obj==='object'&&obj!==null) {
    const e=Object.entries(obj).filter(([,v])=>v!==undefined);
    if(!e.length) return '{}';
    return `{\n${e.map(([k,v])=>`${p1}${k}: ${jsStr(v,indent+1)}`).join(',\n')}\n${pad}}`;
  }
  if (typeof obj==='string') {
    if(obj.includes('`')||obj.length<80) return JSON.stringify(obj);
    return `\`${obj.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')}\``;
  }
  return JSON.stringify(obj);
}

writeFileSync(resolve(__dirname,'verses_niv.js'), `export const VERSE_SETS_NIV = ${jsStr(patched,0)};\n`, 'utf8');
console.log('✅ verses_niv.js patched with NIV text for fathers-love-niv');
