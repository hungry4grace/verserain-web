# verserain-web

## Releases: bump the version on every release

Every merge to `main` deploys to production (Vercel). **Each release PR must
bump the app version by one patch** (e.g. `4.0.0` → `4.0.1`), in BOTH places,
kept identical:

- `package.json` → `"version"`
- `src/App.jsx` → the header badge `v4.0.0` (search `app-brand-version`)

Do this inside the same PR as the change being released, not as a separate
commit afterwards. Bump minor/major only when the owner asks.

The iOS wrapper (`../ios-vercel-wrapper`, `project.pbxproj` + `WebView.swift`
`iosApp=` tag) is versioned separately and only when a new App Store build is
shipped — leave it alone unless asked.

## Where code goes (UI/UX 第 4 階段)

`src/App.jsx` still holds the app's state and most pages, but new code should
not go there:

- New pages: `src/pages/<Name>Page.jsx`, with state kept in App and passed down
  as props (see `TodayPage.jsx`, `SettingsPage.jsx`, `src/pages/*`).
- Shared helpers: `src/lib/` (`routes`, `bible`, `speech`, `audio`,
  `verseDisplay`, `rooms`, `partyApi`, …). UI dictionaries: `src/uiDicts.js`
  (+ `src/i18nFillins.js`).
- Build UI from `src/ui` (`Button`, `IconButton`, `Modal`, `ListRow`,
  `toast`, `confirmDialog`) and the `--color-*` / `--fs-*` / `--space-*`
  tokens in `index.css`. No inline-styled `<button>`, no hex colours.
- Before sending a PR, run `npm run lint:clean` (must be 0 problems) and
  `npm run check:i18n`. The file list lives in `CLEAN_FILES` in
  `eslint.config.js`; `LEGACY_FILES` are pages moved out of App.jsx that still
  use the old styles — drop a file from that list once it is converted.
