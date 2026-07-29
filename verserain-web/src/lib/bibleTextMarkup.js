// bolls.life embeds translator markup inside the verse text. Stripping it
// wrongly is not cosmetic: an earlier version of this logic removed only the
// TAGS and left their contents, which is how src/verses_kjv.js came to ship
// verses reading "What man376 is he that feareth3373 the LORD3068" — the
// numbers are Strong's Concordance references that were never meant to be seen.
//
// Imported by both src/App.jsx (runtime secondary-language fetch) and
// scripts/build-inherit-land.mjs (data generation), so the two can't drift.

export function stripBollsMarkup(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    // Contents-and-all: <S>3068</S> is a reference number, not a word.
    .replace(/<S>\s*\d+\s*<\/S>/gi, '')
    .replace(/<sup>[\s\S]*?<\/sup>/gi, '')
    // Every other tag keeps its contents. <i> in CUV wraps words the
    // translators supplied; those are part of the verse and must stay.
    .replace(/<[^>]+>/g, '')
    // KJV carries translator notes appended AFTER the verse:
    //   "…shall inherit the earth. dwell: Heb. lodge in goodness"
    // Match on the marker rather than the colon, so real mid-verse colons
    // ("for our iniquities: the chastisement of our peace") survive.
    .replace(/\s+\S+:\s+(?:Heb\.|Gr\.|Chal\.|or,)[\s\S]*$/u, '')
    .replace(/\s+([,.;:?!])/g, '$1')
    // Runs of 2+ whitespace are STRUCTURE, not sloppy formatting. bolls' Hebrew
    // text (HAC) encodes the Masoretic caesura as a run of non-breaking spaces:
    //   "כז··סור מרע ועשה־טוב····ושכן לעולם"
    //   "ד שמע ישראל··יהוה אלהינו יהוה אחד"   ← the Shema, split where tradition does
    // Collapsing that to a single space — which this function used to do — threw
    // away the only clause division Hebrew ships with. Preserved here as a
    // double space: invisible in HTML (which collapses whitespace when
    // rendering) but detectable by the phrase splitter.
    .replace(/[\s ]{2,}/g, '  ')
    .replace(/[\s ]/g, ' ')
    .trim();
}
