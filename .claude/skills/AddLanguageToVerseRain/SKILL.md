---
name: AddLanguageToVerseRain
description: Add a new UI/Bible language to VerseRain end-to-end — language picker entry, Bible book names, voice locale, secondary-language Bolls/getbible slug, UI translation dict, verse loader case, optional Topic-set conversion + PartyKit publish. Also use when adding new verse files in an existing language to make sure every reference normalizes for bilingual display.
---

# Adding a language to VerseRain

VerseRain renders a "primary" Bible version and an optional "secondary"
overlay underneath every phrase. The secondary text comes from one of three
sources, chosen by `secondaryVersion`:

1. **English** (`kjv` / `esv` / `niv`) — dedicated API path (`fetchBibleVerseFromAPI`).
2. **Most other languages** — `bolls.life` API via `BOLLS_TRANSLATIONS` slug.
3. **Turkish / Myanmar** — `getbible.net` (Kutsal Kitap / Judson 1835) via `GETBIBLE_TRANSLATIONS` slug.

For the secondary to ever display, the **primary reference must normalize**
to a numeric `<bookId>|<chap>:<verse>` key — that is what `findMatchingVerse`
and `fetchVerseFromBolls` / `fetchVerseFromGetBible` use to look up the
parallel verse. If the bookPart can't resolve to a numeric id, the bilingual
path silently fails (no error, just an invisible empty line under the
primary).

The whole normalize pipeline lives in `App.jsx` under
`normalizeVerseReferenceKey` and feeds off four lookup tables:
`HEBREW_FULL_BOOK_ID`, `KOREAN_FULL_BOOK_ID`, `MULTILANG_FULL_BOOK_ID`, and
`BIBLE_BOOKS` (the short-form dictionary).

## Checklist when adding a new language or a new verse file

### 1. UI-language pieces (only if adding a brand-new language)
- `BIBLE_LANGUAGE_OPTIONS` in `App.jsx` — add the picker entry.
- `UI_TRANSLATIONS` — add the dict for visible strings.
- Voice locale — wire the speech-synthesis locale string.
- `verseLoader.js` — add the `case 'xx': return import('./verses_xx.js')` branch.
- `bibleDictionary.js` — fill in the per-language abbreviation field
  (`ja`, `ko`, `de`, `es`, `tr`, `fa`, `he`, `my`, `vi`, `idn`, `msy`) for
  every book in `BIBLE_BOOKS`. These are SHORT forms (1-3 chars).

### 2. Full-name lookup (this is the part that breaks silently if skipped)
- Verse files use **full** book names like `"이사야 40:31"`, `"Johannes 1:1"`,
  `"Yuhanna 1:1"`, `"Sáng-thế-ký 1:1"`. The `BIBLE_BOOKS.<lang>` field only
  has short abbreviations, so these full forms must be added to
  `MULTILANG_FULL_BOOK_ID` (and for Korean, to `KOREAN_FULL_BOOK_ID` +
  `KOREAN_NUMERIC_VARIANTS`).
- Include common alternate spellings, hyphenation, and abbreviated forms
  the verse files actually use (`Châm ngôn` vs `Châm-ngôn`, `1.Mose` vs
  `1 Mose` vs `1. Mose`).
- The `_NORM` variants (built automatically at module load) collapse
  case/space/hyphen/dot/digit differences, so you usually only need one
  canonical entry per book — but list explicit ASCII/native-digit variants
  if both forms appear.

### 3. Non-ASCII digits
- Persian/Arabic-Indic (`۰-۹`) and Myanmar (`၀-၉`) digits are handled by
  `asciifyDigits`. If you add a language that uses yet another digit
  block (Devanagari, Bengali, Thai, etc.), extend that function.

### 4. Secondary fetch source
- If bolls.life has a translation for the new language, add to
  `BOLLS_TRANSLATIONS`. Test with
  `curl https://bolls.life/get-verse/<SLUG>/43/3/16/`.
- If not, try getbible.net (`https://api.getbible.net/v2/translations.json`)
  and add to `GETBIBLE_TRANSLATIONS`. The orchestrator in `App.jsx`
  (around `secondaryVersion === 'tr' || 'my'`) needs to route this
  language to the getbible branch too.
- If neither has it, decide whether to bundle verses locally (large) or
  document that bilingual is not supported for this language.

### 5. Run the validator (always)

```sh
npm run validate-refs
```

This script (`scripts/validate-refs.mjs`) scans every `verses_*.js`,
normalizes every reference, and **exits non-zero** if any can't be
resolved to a numeric book id OR any language has no fetch path. Failures
print the exact `bookPart` string that's missing — copy it into
`MULTILANG_FULL_BOOK_ID` (or whatever map applies) and re-run.

Run this whenever you:
- Add or edit `verses_*.js` / `verses_cuvs.js` / `verses.js`.
- Add a new language entry.
- Change `normalizeVerseReferenceKey` or its lookup tables.

### 6. Manual smoke test (visual verification)
- Start the dev server and pick the new language as primary.
- Set `bilingualSecondaryVersion` to a paired language (CUV/CUVS/KJV/etc.).
- Play any verse — confirm the secondary line appears under each phrase.
- Repeat with chapter-only refs (e.g. `Psalm 1`) and verse-range refs
  (e.g. `Psalm 1:1-6`), since they take different paths in
  `fetchVerseFromBolls` / `fetchVerseFromGetBible`.

## Common pitfalls — already learned the hard way

- **`BIBLE_BOOKS.<lang>` short form ≠ full name.** Korean `ko: "사"` does
  not match `이사야`. Full names live in `MULTILANG_FULL_BOOK_ID` /
  `KOREAN_FULL_BOOK_ID`.
- **Singular vs plural in English.** `BIBLE_BOOKS.names` has `"Psalms"` —
  references written as `"Psalm 33:9"` (singular) need an explicit
  `"Psalm"` alias.
- **Hyphen vs space vs dot.** `1.Mose`, `1 Mose`, `1. Mose` all reach the
  same key via the `_NORM` collapse; without the collapse you'd need to
  add each variant explicitly.
- **Native-digit chapter:verse.** `یوحنا ۱:۱` (Persian) and
  `ယောဟန် ၁:၁` (Myanmar) fail the `\d` regex unless `asciifyDigits` runs
  first.
- **`set.language` ≠ `bilingualSecondaryVersion`.** Verse files label sets
  with `language: "zh-TW"`, but the runtime version code is `"cuv"`. The
  validator's `LANG_ALIASES` table maps between them.
- **Renaming a topic set without keeping the parallel set's id in sync.**
  Cross-language pairing in `findSecondarySetForPrimarySet` tries
  `<id>-<lang>` first; mismatched ids force the fallback to score-based
  ref matching, which only works if normalize works.
- **Arabic-script ≠ Arabic-language.** Persian (`fa`) and Arabic (`ar`)
  both use Arabic script but are completely different languages with
  different phonetics. They must stay separated everywhere:
  - Distinct voice locales (`fa-IR` vs `ar-SA`).
  - Distinct `VOICE_LANG_BLOCKLIST` entries (`fa: ['ar']` and `ar: ['fa']`)
    so neither falls back to the other when no native voice exists.
  - Distinct `VOICE_NAME_FALLBACKS` patterns (Persian: Soraya/Dariush;
    Arabic: Maged/Majed/Tarik/Laila).
  - Distinct bolls slugs (`POV` for Persian, `SVD` for Arabic).
  - Distinct verse files (`verses_fa.js` vs `verses_ar.js`).
  - Distinct entries in `MULTILANG_FULL_BOOK_ID` — sharing the script
    doesn't mean sharing book names (e.g. Persian پیدایش vs Arabic
    تكوين for Genesis).

## Generator helper: `scripts/build-verses-ar.mjs`

For SVD-Arabic specifically (and as a template for future languages), this
script parses `verses_kjv.js`, looks each reference up on bolls.life under
the target slug, and emits a fully-formed `verses_<lang>.js`. Useful when
adding a language that needs ALL existing topical sets translated. Edit the
`BOLLS_SLUG`, `SET_META` (titles + descriptions), and `BOOK_AR` map for the
new language and re-run:

```sh
node scripts/build-verses-ar.mjs > src/verses_ar.js
npm run validate-refs
```
