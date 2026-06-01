---
name: AddLanguageToVerseRain
description: Add a new UI/Bible language to VerseRain end-to-end — language picker entry, Bible book names, voice locale, secondary-language Bolls slug, UI translation dict, verse loader case, optional Topic-set conversion + PartyKit publish.
---

# AddLanguageToVerseRain

Use this skill whenever the user asks to add a new language to **verserain.com** (e.g. "把馬來文加進去", "add Malay", "add Vietnamese"). This is the same pipeline used to add Indonesian, Vietnamese, Burmese, etc. Follow the steps exactly — every step is necessary or things break in subtle ways (silent fallback to English, missing voices, secondary language not displaying, etc.).

## When to use

Trigger when the user wants a NEW Bible language exposed in the UI dropdown. NOT for changing an existing language's translation or font.

## Required inputs

Before starting, gather:

1. **Language code** — short slug used internally. ISO 639-1 / 639-3 lowercase.
   Examples used: `cuv`, `cuvs`, `kjv`, `esv`, `niv`, `fa`, `he`, `ja`, `ko`, `es`, `tr`, `de`, `my` (Myanmar), `vi`, `id` (Indonesian).
   **Conflict warning**: a Bible-book object uses `id` as the numeric primary key (1–66). When adding the code `id`, use a different field NAME for the Indonesian book names — we used `idn`. Pick a non-conflicting field name if the new code collides with anything in `BIBLE_BOOKS`.
2. **Display label** for the picker — in the language itself, e.g. `Bahasa Melayu`, `Tiếng Việt`, `한국어`.
3. **Native book names** for all 66 books in that language's most common Bible translation.
4. **bolls.life translation slug** if available — the abbrev string used in `https://bolls.life/get-verse/<slug>/<bookId>/<chap>/<verse>/`. Check by running:
   ```bash
   curl -s "https://bolls.life/static/bolls/app/views/languages.json" | python3 -c "import sys,json;d=json.load(sys.stdin); [print(x['language'],'→',[t['short_name'] for t in x.get('translations',[])]) for x in d]"
   ```
   If bolls.life lacks it, decide whether to fall back to a related-language slug (e.g. Indonesian TB ≈ Malay TMV), or skip the Topic-set conversion entirely.
5. **Voice locale** — BCP-47 string the OS uses for that language (e.g. `id-ID`, `ms-MY`, `vi-VN`).
6. **UI translations** (optional but strongly recommended) — at least the strings on the home page tiles and main navigation. If skipped, UI falls back to English.

If the user didn't give you these, ASK before starting.

## Files you will touch

| File | Why |
|------|-----|
| `src/bibleDictionary.js` | Add the language's book name field to all 66 books, plus a case in `getBookAbbr` / `getBookFullName`. |
| `src/App.jsx` | Add to `BIBLE_LANGUAGE_OPTIONS`, `BOLLS_TRANSLATIONS`, `getVoiceLangForVersion`, `handleVersionChange` setUiLang branch, `normalizeVerseReferenceKey` book-name lookup arrays (2 places), `normalizeVerseSetIdentity` regex and any sibling `-(cuv\|cuvs\|...)` regex, `langPrefixForVersion`, the "活動" early-return special case in `t()`, the final `t()` dispatch (`if (uiLang === '<code>') return <code>Dict[zh] || en || zh`), and the new `<code>Dict` literal. |
| `src/verseLoader.js` | Add a `case '<code>': { const m = await import('./verses_<code>'); return { sets: m.VERSE_SETS_<CODE>, verses: m.VERSE_SETS_<CODE>.flatMap(s => s.verses) }; }` branch. |
| `src/verses_<code>.js` | Create the file. Minimum: `export const VERSE_SETS_<CODE> = [];`. |
| `src/convert_topic_kjv_to_<code>.mjs` | Optional. Only if a Bible API source exists. Copies the pattern from `src/convert_topic_kjv_to_id.mjs`. |

## Step-by-step procedure

### 1. Confirm Bible-text source

Run the bolls.life check above. Print to the user which slug you found OR that none exists. If none, ask whether to (a) substitute a sister-language slug, (b) skip Topic-set conversion, or (c) abort. **Do not silently fall back** — the user must choose.

### 2. Patch `bibleDictionary.js` — add native book names

Create a one-shot Node script at `scripts/_<code>_books_patch.mjs` that reads the file, iterates ids 1..66, and uses a regex to inject `, <fieldName>: "<name>", ` right before `, cn: [...] }` on each book line. Pattern (idempotent — skips if already present):

```js
const re = new RegExp(`(\\{\\s*id:\\s*${id},[^}]*?), (cn:\\s*\\[[^\\]]+\\]\\s*\\})`, 'm');
src = src.replace(re, (full, before, after) => {
  if (before.includes('<fieldName>:')) return full;
  return `${before}, <fieldName>: "${name}", ${after}`;
});
```

Run the script, then DELETE it. Verify `grep -c '<fieldName>:' src/bibleDictionary.js` returns 66.

### 3. Patch `bibleDictionary.js` — getBookAbbr / getBookFullName

Add a case to both functions, right before the English (`names[3]` / `names[2]`) branch:

```js
if (version === '<code>') return book.<fieldName> || book.names[3];  // abbr — fallback to English
if (version === '<code>') return book.<fieldName> || book.names[2];  // full name — fallback to English
```

### 4. Patch `App.jsx` — every spot the language list is enumerated

In order of how the code is laid out:

a. **`getVoiceLangForVersion`** (around line 524): add `if (v === '<code>') return '<bcp47>';` before the `return 'zh-TW';` fallback.

b. **`BIBLE_LANGUAGE_OPTIONS`** (around line 540): append `{ value: '<code>', label: '<nativeLabel>' }`.

c. **`BOLLS_TRANSLATIONS`** (around line 612): add `<code>: '<slug>',` if a bolls slug exists.

d. **`normalizeVerseReferenceKey`** (around line 869 and 896): add `b.<fieldName>` to BOTH `[ ... ]` book-name arrays.

e. **`normalizeVerseSetIdentity`** regex (around line 928): the `-(cuv|cuvs|kjv|esv|niv|ja|ko|fa|he|es|tr|de|my|vi|id)$/i` pattern — add the new code. There may be a sibling at line ~3296 with the same regex; update both.

f. **`handleVersionChange`** (around line 3556): add `else if (newVer === '<code>') setUiLangPersisted('<code>');` before the final `else setUiLangPersisted('zh');`.

g. **`langPrefixForVersion`** (around line 4000): add `v === '<code>' ? '<code>'` in the ternary chain (this is what makes the voice dropdown filter to the new language).

h. **`t()` dispatch** (around line 11750): add `if (uiLang === '<code>') return <code>Dict[zh] || en || zh;` near the other language branches.

i. **`t()`'s "活動" early-return** (around line 11735): add `if (uiLang === '<code>') return '<localTranslation>';`.

j. **`<code>Dict`** literal: insert above `const esDict` or wherever the existing dicts live. Even an empty object is fine — entries fall through to English. Translate at least the homepage hero + 4 tiles (`每日經文`, `每日一句神的話，心意更新而變化。`, `我的園子`, `主話如霖澆我田，歲歲結果到豐年。`, `經文題庫`, `經題萬卷勤溫故，句句生光照此程。`, `團隊競賽`, `同心競走天路程，並肩得勝主名榮。`, `每天一句神的話，心意更新而變化`) and the auth buttons (`登入`, `申請帳號`, `Continue with Google`).

### 5. Patch `verseLoader.js`

Add a `case '<code>': { … }` mirroring the existing ones, before the `default:` branch.

### 6. Create `src/verses_<code>.js`

Minimum body:
```js
// <Language name> built-in verse sets.
// Translation: <translation full name>
export const VERSE_SETS_<CODE> = [];
```

### 7. Verify the build

```bash
npm run build 2>&1 | grep -E "✓|error|Error" | head -3
```

Must show `✓ built`. If it errors, you missed a step above.

### 8. (Optional) Convert Topic: KJV sets

ONLY if step 1 found a bolls.life slug. Copy `src/convert_topic_kjv_to_id.mjs` to `src/convert_topic_kjv_to_<code>.mjs`, swap:
- `BOLLS_SLUG`
- `ID_NAMES` (book id → native book name map)
- Reference builder + `language: '<code>'` in the publish payload
- The set ID rename: `-kjv$` → `-<code>`

Run it: `node src/convert_topic_kjv_to_<code>.mjs`. It will print each verse and publish 6 Topic sets to PartyKit. Verify with:
```bash
curl -s "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(len([s for s in d if s.get('language')=='<code>']))"
```
Should print `6`.

### 9. Bump version

Bump the `v3.9.X` literal in `src/App.jsx` (search for `app-brand-version`). This makes "did the user's browser pick up the new build?" trivially observable.

### 10. Commit + push

```bash
git add verserain-web/src/App.jsx verserain-web/src/bibleDictionary.js verserain-web/src/verseLoader.js verserain-web/src/verses_<code>.js
git commit -m "feat: 加入<language>支援 + Topic 經文組..."
git push origin main
```

Do NOT stage `api/translate-passage.js` (memory rule). Do NOT stage `scripts/_<code>_books_patch.mjs` if you forgot to delete it.

### 11. Tell the user

Summarize:
- Picker label + code
- Bible source used (or `none — Topic sets skipped`)
- How many Topic sets were published (0 or 6)
- Voice locale
- What still falls back to English (anything not in `<code>Dict`)
- Reminder: redeploy is automatic via Vercel push; if dev server running locally, restart so the new `verses_<code>.js` file is picked up.

## Anti-patterns

- **Forgetting `langPrefixForVersion`** → voice dropdown still shows Chinese voices when the new language is selected.
- **Forgetting `normalizeVerseSetIdentity` regex** → secondary-language pairing breaks for the new code's published sets.
- **Inserting hardcoded `<option>` instead of using `BIBLE_LANGUAGE_OPTIONS.map`** → already fixed once. If you ever see hardcoded `<option value="cuv">...</option>` in App.jsx, replace it with `.map`. Two known spots: header picker and settings panel.
- **Field-name collision with `id`** — the book object's primary key. Use a different field name like `idn` or 3-letter code.
- **Forgetting to delete the one-shot patch script** in `scripts/` after running it.
- **Committing `api/translate-passage.js`** — user-set memory rule, never commit it.

## Reference implementation

Indonesian (`id`) was the most recently added language; mirror its diff for guidance:
- `src/bibleDictionary.js` — `idn:` field on each book.
- `src/App.jsx` — `idDict`, plus all the call-site patches.
- `src/verseLoader.js` — `case 'id'`.
- `src/verses_id.js` — empty starter.
- `src/convert_topic_kjv_to_id.mjs` — Topic conversion driver.

Burmese (`my`) is the cleanest example of a language with NO bolls.life slug — UI is wired up, but `BOLLS_TRANSLATIONS` has no entry, and Topic sets weren't generated. Use this if no Bible API is available for the new language.
