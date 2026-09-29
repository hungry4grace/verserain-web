// Verse lookup, topic titles and reference formatting — moved out of App.jsx (UI/UX 第 4 階段).
import { BIBLE_BOOKS, getBookFullName } from '../bibleDictionary.js';
import { ENGLISH_BOOK_LOCALIZATION_MAP, verseRefKey } from './verseRef.js';
import { fetchEditorVerseText, isEnglishBibleVersion, parseScriptureKey } from './bible.js';

export const findVerseByRef = (allVerses, ref) => {
  let target = allVerses.find(v => v.reference === ref);
  if (!target && ref) {
    const refTrim = ref.replace(/\s+/g, '');
    target = allVerses.find(v => v.reference.replace(/\s+/g, '') === refTrim);

    if (!target && refTrim.includes(':')) {
      const match = refTrim.match(/^(.*?)(\d+:\d+(-\d+)?)$/);
      if (match) {
        const bookStr = match[1];
        const cvStr = match[2];
        const bookObj = BIBLE_BOOKS.find(b =>
          b.names.includes(bookStr) || b.ja === bookStr || b.ko === bookStr || (b.names[3] === bookStr)
        );
        target = allVerses.find(v => {
          const vTrim = v.reference.replace(/\s+/g, '');
          if (!vTrim.endsWith(cvStr)) return false;
          const vBookStr = vTrim.replace(cvStr, '');
          if (bookObj) {
            return bookObj.names.includes(vBookStr) || bookObj.ja === vBookStr || bookObj.ko === vBookStr || (bookObj.names[3] === vBookStr);
          }
          return vTrim[0] === bookStr[0];
        });
      }
    }

    // Script/language-agnostic fallback: compare normalized "<bookId>|<c:v>"
    // keys. The lookup above only knows BIBLE_BOOKS.names/ja/ko, so a
    // reference planted from 简体 (「诗 111:10」) never matched the 繁體 verse
    // (「詩 111:10」) — nor any other language's spelling of the same book.
    if (!target) {
      const wantKey = verseRefKey(ref);
      if (wantKey && /^\d+\|/.test(wantKey)) {
        target = allVerses.find(v => verseRefKey(v.reference) === wantKey);
      }
    }
  }
  return target;
};

// Bundled verse-set languages the garden searches when a planted reference
// isn't in the viewer's own sets — the planter may have been on any language.
// Callers try the viewer's current version first.
export const GARDEN_LOOKUP_LANGS = ['cuv', 'cuvs', 'tw', 'kjv', 'esv', 'niv', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my', 'ar', 'vi', 'id', 'ms', 'pt', 'fr', 'ru', 'hi', 'km'];

// Last resort for a garden cell whose reference is in no bundled set (e.g. a
// verse the planter added to a custom set): fetch the text live in the
// viewer's own version and return a minimal verse object the popup and the
// challenge (startGame only needs reference + text) can use. Null on miss.
export async function fetchGardenVerseOnline(ref, targetVersion) {
  const key = verseRefKey(ref);
  const m = /^(\d+)\|(\d+(?::[\d,-]+)?)$/.exec(key || '');
  if (!m) return null;
  const bookInfo = BIBLE_BOOKS.find(b => b.id === parseInt(m[1], 10));
  if (!bookInfo) return null;
  const sanitized = m[2];
  try {
    const text = await fetchEditorVerseText({ bookInfo, sanitized, version: targetVersion });
    if (!text) return null;
    const bookName = getBookFullName(bookInfo, targetVersion) || bookInfo.names[0];
    return { reference: `${bookName} ${sanitized}`, text, fetchedOnline: true };
  } catch {
    return null;
  }
}

// Title-sort key: strip leading punctuation/quotes/brackets so
// 「敬拜」/《青少年》/(力量) sort by their first real character instead of
// clumping under the punctuation marks.
export function titleSortKey(s) {
  return String(s || '').replace(/^[^\p{L}\p{N}]+/u, '');
}

export const topicStrokeCollator = (() => {
  try {
    return new Intl.Collator(['zh-Hant-u-co-stroke', 'zh-u-co-stroke'], {
      usage: 'sort',
      sensitivity: 'base',
      numeric: true
    });
  } catch {
    return new Intl.Collator('zh-Hant', { usage: 'sort', sensitivity: 'base', numeric: true });
  }
})();

export const TOPIC_PREFIX_REGEX = /^(主題|主题|Topic|Tema|Thema|Thème|Konu|موضوع|נושא|テーマ|주제|ခေါင်းစဉ်|Chủ đề|Тема|विषय|Topik)\s*[：:]\s*/i;

export const stripTopicPrefixLabel = (title = '') => String(title).replace(TOPIC_PREFIX_REGEX, '');

export const TOPIC_TITLE_PREFIX_BY_LANG = {
  cuv: '主題',
  cuvs: '主题',
  tw: '主題',
  kjv: 'Topic',
  esv: 'Topic',
  niv: 'Topic',
  fa: 'موضوع',
  ar: 'موضوع',
  he: 'נושא',
  ja: 'テーマ',
  ko: '주제',
  es: 'Tema',
  tr: 'Konu',
  de: 'Thema',
  pt: 'Tema',
  fr: 'Thème',
  ru: 'Тема',
  hi: 'विषय',
  my: 'ခေါင်းစဉ်',
  vi: 'Chủ đề',
  id: 'Topik',
  ms: 'Topik'
};

export const OFFICIAL_TOPIC_TITLE_TRANSLATIONS = {
  covenant: {
    cuv: '盟約', cuvs: '盟约', tw: '盟約', kjv: 'Covenant', esv: 'Covenant', niv: 'Covenant',
    fa: 'میثاق', ar: 'العهد', he: 'ברית', ja: '契約', ko: '언약',
    es: 'Pacto', tr: 'Antlaşma', de: 'Bund', pt: 'Aliança', fr: 'Alliance', ru: 'Завет',
    hi: 'वाचा', my: 'ပဋိညာဉ်', vi: 'Giao ước', id: 'Perjanjian', ms: 'Perjanjian'
  },
  heal: {
    cuv: '醫治', cuvs: '医治', tw: '醫治', kjv: 'Healing', esv: 'Healing', niv: 'Healing',
    fa: 'شفا', ar: 'الشفاء', he: 'ריפוי', ja: '癒やし', ko: '치유',
    es: 'Sanidad', tr: 'Şifa', de: 'Heilung', pt: 'Cura', fr: 'Guérison', ru: 'Исцеление',
    hi: 'चंगाई', my: 'ကုစားခြင်း', vi: 'Chữa lành', id: 'Penyembuhan', ms: 'Penyembuhan'
  },
  mercy: {
    cuv: '憐憫', cuvs: '怜悯', tw: '憐憫', kjv: 'Mercy', esv: 'Mercy', niv: 'Mercy',
    fa: 'رحمت', ar: 'الرحمة', he: 'רחמים', ja: 'あわれみ', ko: '자비',
    es: 'Misericordia', tr: 'Merhamet', de: 'Barmherzigkeit', pt: 'Misericórdia', fr: 'Miséricorde', ru: 'Милость',
    hi: 'दया', my: 'ကရုဏာ', vi: 'Lòng thương xót', id: 'Belas kasihan', ms: 'Belas kasihan'
  },
  pentecost: {
    cuv: '五旬節', cuvs: '五旬节', tw: '五旬節', kjv: 'Pentecost', esv: 'Pentecost', niv: 'Pentecost',
    fa: 'پنطیکاست', ar: 'الخمسين', he: 'חג השבועות', ja: 'ペンテコステ', ko: '오순절',
    es: 'Pentecostés', tr: 'Pentikost', de: 'Pfingsten', pt: 'Pentecostes', fr: 'Pentecôte', ru: 'Пятидесятница',
    hi: 'पिन्तेकुस्त', my: 'ပင်တေကုတ္တေပွဲ', vi: 'Lễ Ngũ Tuần', id: 'Pentakosta', ms: 'Pentakosta'
  },
  praise: {
    cuv: '讚美', cuvs: '赞美', tw: '讚美', kjv: 'Praise', esv: 'Praise', niv: 'Praise',
    fa: 'ستایش', ar: 'التسبيح', he: 'שבח', ja: '賛美', ko: '찬양',
    es: 'Alabanza', tr: 'Övgü', de: 'Lobpreis', pt: 'Louvor', fr: 'Louange', ru: 'Хвала',
    hi: 'स्तुति', my: 'ချီးမွမ်းခြင်း', vi: 'Ca ngợi', id: 'Pujian', ms: 'Pujian'
  },
  wordOfGod: {
    cuv: '神的話', cuvs: '神的话', tw: '神的話', kjv: "God's word", esv: "God's word", niv: "God's word",
    fa: 'کلام خدا', ar: 'كلمة الله', he: 'דבר אלוהים', ja: '神の言葉', ko: '하나님의 말씀',
    es: 'Palabra de Dios', tr: "Tanrı'nın sözü", de: 'Gottes Wort', pt: 'Palavra de Deus', fr: 'Parole de Dieu', ru: 'Слово Божье',
    hi: 'परमेश्वर का वचन', my: 'ဘုရားသခင်၏ စကားတော်', vi: 'Lời Chúa', id: 'Firman Tuhan', ms: 'Firman Tuhan'
  },
  prayer: {
    cuv: '禱告', cuvs: '祷告', tw: '禱告', kjv: 'Prayer', esv: 'Prayer', niv: 'Prayer',
    fa: 'دعا', ar: 'الصلاة', he: 'תפילה', ja: '祈り', ko: '기도',
    es: 'Oración', tr: 'Dua', de: 'Gebet', pt: 'Oração', fr: 'Prière', ru: 'Молитва',
    hi: 'प्रार्थना', my: 'ဆုတောင်းခြင်း', vi: 'Cầu nguyện', id: 'Doa', ms: 'Doa'
  },
  scriptureRain: {
    cuv: '經文雨', cuvs: '经文雨', tw: '經文雨', kjv: 'Scripture Rain', esv: 'Scripture Rain', niv: 'Scripture Rain',
    fa: 'باران کتاب مقدس', ar: 'مطر الكتاب المقدس', he: 'גשם הכתובים', ja: '聖句の雨', ko: '말씀 비',
    es: 'Lluvia de Escrituras', tr: 'Kutsal Yazı Yağmuru', de: 'Schriftregen', pt: 'Chuva da Palavra', fr: 'Pluie de la Parole', ru: 'Дождь Писания',
    hi: 'वचन वर्षा', my: 'ကျမ်းချက်မိုး', vi: 'Mưa Kinh Thánh', id: 'Hujan Firman', ms: 'Hujan Firman'
  },
  mutualizedEconomics: {
    cuv: '互惠經濟', cuvs: '互惠经济', tw: '互惠經濟', kjv: 'Mutualized Economics', esv: 'Mutualized Economics', niv: 'Mutualized Economics',
    fa: 'اقتصاد متقابل', ar: 'الاقتصاد التشاركي', he: 'כלכלה הדדית', ja: '相互経済', ko: '상호 경제',
    es: 'Economía mutua', tr: 'Karşılıklı ekonomi', de: 'Gegenseitige Wirtschaft', pt: 'Economia mutualizada', fr: 'Économie mutualisée', ru: 'Взаимная экономика',
    hi: 'पारस्परिक अर्थव्यवस्था', my: 'အပြန်အလှန် စီးပွားရေး', vi: 'Kinh tế tương hỗ', id: 'Ekonomi Saling Menguntungkan', ms: 'Ekonomi Bersama'
  },
  powerOfWords: {
    cuv: '話語的權能', cuvs: '话语的权能', tw: '話語的權能', kjv: 'Power of Words', esv: 'Power of Words', niv: 'Power of Words',
    fa: 'قدرت کلمات', ar: 'قوة الكلمات', he: 'כוח המילים', ja: '言葉の力', ko: '말의 능력',
    es: 'Poder de las palabras', tr: 'Sözlerin gücü', de: 'Kraft der Worte', pt: 'Poder das palavras', fr: 'Puissance des paroles', ru: 'Сила слов',
    hi: 'वचनों की सामर्थ्य', my: 'စကားလုံးများ၏ တန်ခိုး', vi: 'Quyền năng của lời nói', id: 'Kuasa perkataan', ms: 'Kuasa kata-kata'
  }
};

export function inferOfficialTopicKey(set = {}) {
  const id = String(set.id || '').toLowerCase();
  const title = String(set.title || '').toLowerCase();
  if (id.includes('word-of-god') || title.includes("god's word")) return 'wordOfGod';
  if (id.includes('mutualized-economics')) return 'mutualizedEconomics';
  if (id.includes('power-of-words')) return 'powerOfWords';
  if (id.includes('rain-verses') || title.includes('scripture rain')) return 'scriptureRain';
  if (id.includes('topic-prayer') || title.includes('prayer')) return 'prayer';
  if (id.includes('pentecost') || title.includes('pentecost')) return 'pentecost';
  if (id.includes('covenant') || title.includes('covenant')) return 'covenant';
  if (id.includes('healing') || /\bheal\b/.test(title) || title.includes('healing')) return 'heal';
  if (id.includes('mercy') || title.includes('mercy')) return 'mercy';
  if (id.includes('praise') || title.includes('praise')) return 'praise';
  return null;
}

export function localizeOfficialTopicSetTitle(set, lang) {
  const topicKey = inferOfficialTopicKey(set);
  if (!topicKey) return set;
  const term = OFFICIAL_TOPIC_TITLE_TRANSLATIONS[topicKey]?.[lang] || OFFICIAL_TOPIC_TITLE_TRANSLATIONS[topicKey]?.en || set.title;
  const prefix = TOPIC_TITLE_PREFIX_BY_LANG[lang] || 'Topic';
  const suffix = /-esv(?:-|$)/i.test(String(set.id || '')) && !['kjv', 'esv', 'niv'].includes(lang) ? ' (ESV)' : '';
  return { ...set, title: `${prefix}: ${term}${suffix}` };
}

export const extractVerseSetTopic = (title = '') => {
  const plainTitle = String(title).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const match = plainTitle.match(/(?:主題|主题|Topic|Tema|Thema|Thème|Konu|موضوع|נושא|テーマ|주제|ခေါင်းစဉ်|Chủ đề|Тема|विषय|Topik)\s*[：:]\s*([^，,。；;、/／|｜\s]+)/i);
  return match?.[1]?.trim() || '';
};

export const getFirstTopicChar = (topic = '') => Array.from(topic.trim())[0] || '';
export const CHINESE_BOOK_MAP = {
  '創': '創世記', '出': '出埃及記', '利': '利未記', '民': '民數記', '申': '申命記',
  '書': '約書亞記', '士': '士師記', '得': '路得記', '撒上': '撒母耳記上', '撒下': '撒母耳記下',
  '王上': '列王紀上', '王下': '列王紀下', '代上': '歷代志上', '代下': '歷代志下',
  '拉': '以斯拉記', '尼': '尼希米記', '斯': '以斯帖記', '伯': '約伯記', '詩': '詩篇',
  '箴': '箴言', '傳': '傳道書', '歌': '雅歌', '賽': '以賽亞書', '耶': '耶利米書',
  '哀': '耶利米哀歌', '結': '以西結書', '但': '但以理書', '何': '何西阿書', '珥': '約珥書',
  '摩': '阿摩司書', '俄': '俄巴底亞書', '拿': '約拿書', '彌': '彌迦書', '鴻': '那鴻書',
  '哈': '哈巴谷書', '番': '西番雅書', '該': '哈該書', '亞': '撒迦利亞書', '瑪': '瑪拉基書',
  '太': '馬太福音', '可': '馬可福音', '路': '路加福音', '約': '約翰福音', '徒': '使徒行傳',
  '羅': '羅馬書', '林前': '哥林多前書', '林後': '哥林多後書', '加': '加拉太書', '弗': '以弗所書',
  '腓': '腓立比書', '西': '歌羅西書', '帖前': '帖撒羅尼迦前書', '帖後': '帖撒羅尼迦後書',
  '提前': '提摩太前書', '提後': '提摩太後書', '多': '提多書', '門': '腓利門書', '來': '希伯來書',
  '雅': '雅各書', '彼前': '彼得前書', '彼後': '彼得後書', '約一': '約翰一書', '約二': '約翰二書',
  '約三': '約翰三書', '猶': '猶大書', '啟': '啟示錄'
};

export function formatVerseReferenceForDisplay(ref, version) {
  // Chinese: expand abbreviation to full book name
  if (version === 'cuv' || version === 'zh' || version === 'cuvs') {
    const match = ref.match(/(.+?)\s*(\d+)(?:\s*:\s*([\d,\s\-–]+))?/);
    if (!match) return ref;
    const book = match[1].trim();
    const chapter = match[2];
    const verses = match[3];
    let fullBookName = CHINESE_BOOK_MAP[book];
    // Fallback: English abbreviation → look up via BIBLE_BOOKS
    if (!fullBookName) {
      const lowerBook = book.toLowerCase().replace(/\./g, '');
      const found = BIBLE_BOOKS.find(b =>
        (b.names || []).some(n => n.toLowerCase().replace(/\./g, '').replace(/\s+/g, '') === lowerBook)
      );
      if (found) {
        fullBookName = version === 'cuvs' ? (found.cn?.[0] || found.names[0]) : found.names[0];
      }
    }
    if (!fullBookName) fullBookName = book;
    const chapterSuffix = fullBookName === '詩篇' || fullBookName === '诗篇' ? '篇' : '章';
    if (verses) return `${fullBookName} ${chapter}:${verses}`;
    return `${fullBookName} ${chapter}${chapterSuffix}`;
  }

  // For localized non-English versions: translate English book abbreviation
  const LOCALIZED_LANGS = ['vi','ko','ja','es','de','tr','fa','ar','he','my'];
  if (LOCALIZED_LANGS.includes(version)) {
    // Parse: optional leading digit(s) (1/2/3) immediately attached or space-separated from book
    // Handles: "Eph 3:19", "1Thessalonians 4:16", "2 Cor 4:17", "Ps 23:1-6"
    const m = ref.match(/^(\d+\s*)([A-Za-z]+)\s+(.+)$/) || ref.match(/^([A-Za-z]+)\s+(.+)$/);
    if (m) {
      let key, chapterVerse;
      if (m.length === 4) {
        // Numbered book: m[1]=number, m[2]=bookName, m[3]=chapterVerse
        key = m[1].trim() + m[2].toLowerCase().replace(/\./g, '');
        chapterVerse = m[3].trim();
      } else {
        // Non-numbered book: m[1]=bookName, m[2]=chapterVerse
        key = m[1].toLowerCase().replace(/\./g, '');
        chapterVerse = m[2].trim();
      }
      const localizedBook = ENGLISH_BOOK_LOCALIZATION_MAP[key]?.[version];
      if (localizedBook) return `${localizedBook} ${chapterVerse}`;
    }
  }

  // The reference can arrive in any language (the secondary line's cached
  // lookup passes the primary Chinese "羅 16:20" through), so English — and any
  // other version still showing a Chinese book name — gets its book rebuilt
  // from BIBLE_BOOKS instead of echoing the input back.
  const isEnglish = version === 'esv' || version === 'kjv' || version === 'niv';
  if (isEnglish || /[一-鿿]/.test(ref || '')) {
    const parsed = parseScriptureKey(ref);
    const bookInfo = parsed && BIBLE_BOOKS.find(b => b.id === parsed.bookId);
    const name = bookInfo && getBookFullName(bookInfo, version);
    if (name && (isEnglish || !/[一-鿿]/.test(name) || version === 'ja')) {
      const cv = parsed.verses ? `${parsed.chapter}:${parsed.verses}` : `${parsed.chapter}`;
      return `${name} ${cv}`;
    }
  }

  return ref;
}

// 1 → 一, 23 → 二十三, 119 → 一百一十九 … (for spoken references).
export function toChineseNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (num === 0) return '零';
  if (num < 10) return digits[num];
  if (num < 20) return `十${digits[num % 10]}`;
  if (num < 100) {
    const ones = num % 10;
    return `${digits[Math.floor(num / 10)]}十${ones ? digits[ones] : ''}`;
  }
  const hundreds = Math.floor(num / 100);
  const rest = num % 100;
  return `${digits[hundreds]}百${rest ? (rest < 10 ? '零' : '') + toChineseNumber(rest) : ''}`;
}

// 「3:16」→「第三章16節」,「4:1-3」→「第四章1到3節」 — makes chapter:verse
// patterns inside free text (set descriptions) read naturally in Chinese TTS.
export function humanizeChineseReferencesForSpeech(text) {
  return String(text || '').replace(
    /(\d+)\s*[:：]\s*(\d+)(?:\s*[-–—~]\s*(\d+))?/g,
    (m, ch, v1, v2) => (v2
      ? `第${toChineseNumber(ch)}章${v1}到${v2}節`
      : `第${toChineseNumber(ch)}章${v1}節`)
  );
}

export function formatVerseReferenceForSpeech(ref, version) {
  const match = ref.match(/(.+?)\s*(\d+)(?:\s*:\s*([\d,\s\-–]+))?/);
  if (!match) return ref;
  const book = match[1].trim();
  const chapter = match[2];
  const verses = match[3];

  if (isEnglishBibleVersion(version)) {
    if (!verses) return `${book} chapter ${chapter}`;
    const versesStr = verses.replace(/-/g, ' to ').replace(/–/g, ' to ').trim();
    const isPlural = versesStr.includes('to') || versesStr.includes(',');
    return `${book} chapter ${chapter}, verse${isPlural ? 's' : ''} ${versesStr}`;
  } else if (version === 'ko') {
    if (!verses) return `${book} ${chapter}장`;
    const versesStr = verses.replace(/-/g, '에서 ').replace(/–/g, '에서 ').trim();
    return `${book} ${chapter}장 ${versesStr}절`;
  } else if (version === 'ja') {
    if (!verses) return `${book} 第${chapter}章`;
    const versesStr = verses.replace(/-/g, 'から ').replace(/–/g, 'から ').trim();
    return `${book} 第${chapter}章 ${versesStr}節`;
  } else if (version === 'fa') {
    if (!verses) return `${book} فصل ${chapter}`;
    const versesStr = verses.replace(/-/g, ' تا ').replace(/–/g, ' تا ').trim();
    return `${book} فصل ${chapter} آیه ${versesStr}`;
  } else if (version === 'ar') {
    // Arabic Bible reference convention: "<book> الإصحاح <chap> الآية <verse>".
    // Without this branch Arabic falls through to the Chinese formatter and
    // gets back a mixed Arabic/Chinese string ("تكوين第一章..."), which iOS
    // TTS announces by saying "Arabic" as the language-switch label every
    // time it crosses script boundaries.
    if (!verses) return `${book} الإصحاح ${chapter}`;
    const versesStr = verses.replace(/-/g, ' إلى ').replace(/–/g, ' إلى ').trim();
    const isPlural = versesStr.includes(' إلى ') || versesStr.includes(',');
    return `${book} الإصحاح ${chapter} ${isPlural ? 'الآيات' : 'الآية'} ${versesStr}`;
  } else if (version === 'he') {
    if (!verses) return `${book} פרק ${chapter}`;
    const versesStr = verses.replace(/-/g, ' עד ').replace(/–/g, ' עד ').trim();
    return `${book} פרק ${chapter} פסוק ${versesStr}`;
  } else {
    // Chinese (cuv, default)
    let fullBookName = CHINESE_BOOK_MAP[book];
    if (!fullBookName) {
      const lowerBook = book.toLowerCase().replace(/\./g, '');
      const found = BIBLE_BOOKS.find(b =>
        (b.names || []).some(n => n.toLowerCase().replace(/\./g, '').replace(/\s+/g, '') === lowerBook)
      );
      if (found) fullBookName = found.names[0];
    }
    if (!fullBookName) fullBookName = book;
    const chapterSuffix = fullBookName === '詩篇' || fullBookName === '诗篇' ? '篇' : '章';

    if (!verses) {
      return `${fullBookName}第${toChineseNumber(chapter)}${chapterSuffix}`;
    }

    const versesStr = verses
      .replace(/\s+/g, '')
      .replace(/-/g, '至')
      .replace(/–/g, '至')
      .replace(/,/g, '、')
      .replace(/\d+/g, (num) => toChineseNumber(num))
      .trim();
    return `${fullBookName}第${toChineseNumber(chapter)}${chapterSuffix}第${versesStr}節`;
  }
}

export const parseVerseRef = (v) => {
  if (v.book && v.verseInput) {
    const fixedVerseInput = String(v.verseInput).replace(/^\s*alm\s+/i, '').trim();
    if (fixedVerseInput !== v.verseInput) {
      return { ...v, verseInput: fixedVerseInput };
    }
    return v;
  }
  if (!v.reference) return v;
  // Resolve book + chapter:verse via the app's full reference normalizer. It
  // knows EVERY language's book names — including full names the abbrev table
  // lacks (German "Sprüche"/"1. Mose"/"Matthäus", etc.) — and splits on the real
  // chapter boundary. A naive startsWith over abbreviations mis-parsed those:
  // abbrev "Spr" sliced "Sprüche 10:11" into the garbage "üche 10:11", and full
  // names with no matching abbrev fell back to raw text ("missed book").
  const parsed = parseScriptureKey(v.reference);
  if (parsed && parsed.bookId) {
    return {
      ...v,
      book: parsed.bookId,
      verseInput: parsed.verses ? `${parsed.chapter}:${parsed.verses}` : `${parsed.chapter}`,
    };
  }
  return v;
};
