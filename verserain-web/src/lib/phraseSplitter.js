// Pure, testable phrase splitting shared by the rain player and challenge mode.
//
// A verse becomes one falling block per phrase, so how the text is cut decides
// whether the game is readable. Three scripts need three different rules, and
// getting any of them wrong is very visible:
//
//   Latin/Hebrew/Arabic — words are space-delimited, so ONLY punctuation may
//     split. Splitting on spaces would produce one block per word.
//
//   Chinese / Japanese  — no spaces inside words, so a space IS a clause
//     boundary (CUV uses it that way) and counts alongside punctuation.
//     Japanese leans on 、(U+3001) and often has no 。at all — omitting it
//     collapsed a whole chapter into a single block.
//
//   Korean — the hard case. Bible Korean (개역/개역개정) carries almost no
//     punctuation (잠언 1: 1351 chars, 354 words, 3 commas, 0 periods) yet puts
//     a space between every word. Punctuation-only leaves one giant block;
//     space-splitting yields 354 one-word blocks. Korean marks clause
//     boundaries with VERB ENDINGS (어미) instead, so that is what we split on.

// Quote/bracket characters are stripped from phrase edges rather than split on,
// so an opening 「 doesn't produce an empty leading block.
const EDGE_TRIM = /^[「」『』《》〈〉“”"‘’'（）()【】\[\]\s]+|[「」『』《》〈〉“”"‘’'（）()【】\[\]\s]+$/gu;

export function cleanPhraseBlock(phrase = '') {
  return String(phrase || '').trim().replace(EDGE_TRIM, '').trim();
}

// Keeps blocks that contain an actual letter/number/ideograph — filters out
// stray punctuation-only fragments left behind by a split.
export function hasReadablePhraseContent(phrase = '') {
  return /[\p{L}\p{N}㐀-鿿]/u.test(String(phrase || ''));
}

// Deliberately excludes the straight apostrophe and double quote: splitting on
// those would cut English "LORD's" into "LORD" + "s" and break contractions.
// CJK quotation marks are safe to split on — they never appear in Latin text.
const PUNCT_CORE = ',，、。；؛၊။،;:：﹕︰\\.\\?!！？؟';
const PUNCT_CJK_QUOTES = '「」『』《》〈〉';

const isCjkNoSpaceScript = (s) => /[぀-ヿ㐀-鿿]/u.test(s);
export const isKoreanText = (s) => /[가-힯]/u.test(String(s || ''));

// ─── Korean ───────────────────────────────────────────────────────────────
// Suffix patterns, not an enumerated vocabulary: the ending is a productive
// morpheme, so a regex generalises far better. Measured over all 30 Korean
// Proverbs chapters, patterns raised boundary density 11.2% → 18.1% and cut
// length-valve fallbacks from 34% → 14% versus a hand-listed word set.
const KOREAN_CLAUSE_ENDINGS = [
  /(느니라|니라|리라|로다|도다|지라)$/,             // sentence-final
  /(으며|하며|이며|되며|지며|며)$/,                  // "and" connective
  /(거늘|어늘)$/,                                    // contrastive
  /(이요|으요|요)$/,                                 // enumerating
  /(으니|이니|하니|되니|니)$/,                       // causal
  /(말라|하라|으라|아라|어라)$/,                     // imperative
  /(이라|하여|되어|하고|되고|이고|고)$/,             // misc connective
  /(면|자|사|나)$/,                                  // conditional / propositive
];
const TRAILING_PUNCT = /[,，、。；;:：\.\?!！？]+$/u;

const endsKoreanClause = (word) => KOREAN_CLAUSE_ENDINGS.some((re) => re.test(word));

// minChars stops short fragments (지혜롭게,) becoming their own block — they get
// absorbed into the next one. maxChars is a safety valve for the ~14% of runs
// that reach no ending at all; without it a clause-free stretch stays unsplit.
export function splitKoreanClauses(text, { minChars = 8, maxChars = 30 } = {}) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const out = [];
  let buffer = [];

  const flush = () => {
    if (!buffer.length) return;
    const phrase = cleanPhraseBlock(buffer.join(' ').replace(TRAILING_PUNCT, ''));
    if (phrase && hasReadablePhraseContent(phrase)) out.push(phrase);
    buffer = [];
  };

  for (const word of words) {
    buffer.push(word);
    const length = buffer.join(' ').length;
    const bare = word.replace(TRAILING_PUNCT, '');
    // A comma is a real boundary too, on the rare occasions Korean text has one.
    const isBoundary = endsKoreanClause(bare) || TRAILING_PUNCT.test(word);
    if (isBoundary && length >= minChars) flush();
    else if (length >= maxChars) flush();
  }
  flush();
  return out;
}

// ─── Entry point ──────────────────────────────────────────────────────────
// Script is detected from the text, not from a version code. That matters for
// the bilingual secondary line, which renders text whose version the caller
// doesn't always know, and it means one call site can't drift from another by
// passing the wrong label.
export function splitVersePhrases(text) {
  const source = String(text || '');
  if (!source.trim()) return [];

  if (isKoreanText(source)) return splitKoreanClauses(source);

  const cjk = isCjkNoSpaceScript(source);
  const charClass = `[${PUNCT_CORE}${cjk ? PUNCT_CJK_QUOTES : ''}]`;
  const regex = new RegExp(`\\.{2,}|${charClass}${cjk ? '|\\s+' : ''}`);

  return source
    .split(regex)
    .map(cleanPhraseBlock)
    .filter((phrase) => phrase && hasReadablePhraseContent(phrase));
}
