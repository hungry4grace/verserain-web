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
