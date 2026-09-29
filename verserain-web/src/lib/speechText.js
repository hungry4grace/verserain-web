// Text fix-ups applied to Chinese text right before it goes to the browser's
// speech engine. The engine (Apple / Google TTS) picks heteronym readings on
// its own and we can't pass phonetics through the Web Speech API, so the only
// lever is swapping a character for an unambiguous homophone in the SPOKEN
// string. The displayed text is never touched.
//
// 地: in Bible Chinese 地 is almost always the noun (dì — 地上, 地土, 全地, 天地),
// but engines see 「承受地土為業」 and read 地 as the adverbial particle "de"
// (like 慢慢地). We replace noun-地 with 第, which every engine reads dì. The
// adverbial 地 is left alone so it still reads "de": it follows reduplication
// (平平安安地去, 白白地得來, 切切地尋求, 大大地驚惶) or 然/切.
//
// Tests: node --test src/lib/speechText.test.mjs

const NOUN_NEXT = new Set('上土極裡下面基獄步方震底位界主產業名中間球帶區點契圖質表層勢段形域殼洞穴皮');
const ADVERB_PREV = /[然切]$/;

function isReduplicated(before) {
  // AA地 (慢慢地), AABB地 (平平安安地), ABAB地 (認真認真地)
  const n = before.length;
  if (n >= 2 && before[n - 1] === before[n - 2]) return true;
  if (n >= 4 && before[n - 1] === before[n - 3] && before[n - 2] === before[n - 4]) return true;
  return false;
}

export function fixChineseHeteronymsForSpeech(text) {
  const s = String(text || '');
  if (!s.includes('地')) return s;
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== '地') continue;
    const next = chars[i + 1] || '';
    if (NOUN_NEXT.has(next)) { chars[i] = '第'; continue; }
    const before = chars.slice(Math.max(0, i - 4), i).join('');
    if (isReduplicated(before) || ADVERB_PREV.test(before)) continue; // adverbial 地 — let the engine say "de"
    chars[i] = '第';
  }
  return chars.join('');
}

// Entry point for every utterance: only Chinese gets the substitutions.
export function toSpeechText(text, lang) {
  const l = String(lang || '');
  if (!l.startsWith('zh')) return String(text || '');
  return fixChineseHeteronymsForSpeech(text);
}
