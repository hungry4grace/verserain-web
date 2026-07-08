# 經文雨・聆聽版 (VerseRain for Blind)

A standalone, **blind-first** companion to VerseRain. Stripped down to three things:
**listen to the Bible daily, memorize it, and enjoy it.** No maps, gardens,
leaderboards, animations, or social features.

## Why a separate app

The accessibility mode inside the main app relies on single-key shortcuts
(`R`, `A`, `N`, …). When VoiceOver / TalkBack is running, the screen reader
*intercepts* those keys, so they never reach the app. This rebuild fixes the
core problems:

- **Real, large, focusable buttons** — every action is a `<button>` the screen
  reader can find and the user can Tab to. Nothing depends on a hidden hotkey.
- **Self-voicing** — the app reads each screen aloud on its own, so users who
  have *not* set up a screen reader still hear everything. (Toggle it off in
  Settings if you do use VoiceOver/TalkBack, to avoid double speech.)
- **High contrast + huge targets** — yellow-on-black, ≥88 px buttons, big type,
  for low-vision users.
- **Focus management + ARIA live regions** — focus moves to each screen's
  heading; status updates are announced politely.

## Screens

- **每日聆聽 (Daily Listen):** a hands-free audio Bible. Reads reference + verse,
  pauses, auto-advances through the set, loops. Pause / prev / next / repeat.
- **背經文 (Memorize):** hear a verse once, then recite it into the mic. Web
  Speech recognition scores similarity; ≥80% counts as memorized (with a chime).
  Falls back to "聽答案 → 我背對了" when the mic/recognizer is unavailable.
- **設定 (Settings):** verse set, TTS voice, speed, and the 自動朗讀 toggle.
- A simple **daily streak** ("連續第 N 天") for gentle motivation.

## Content

Verse content (Traditional Chinese / CUV) is synced from the main app:

```bash
npm run sync:verses   # reads ../verserain-web/src, writes src/data/verses.json
```

Re-run it whenever the source verse files change. The app ships the generated
JSON so it stays fully self-contained at build/runtime.

## Develop

```bash
npm install
npm run sync:verses   # first time / after content changes
npm run dev           # http://localhost:5180
npm run build
```

## Browser support notes

- **TTS (朗讀):** all modern browsers. Voices depend on the OS; pick one in
  Settings.
- **Speech recognition (背誦評分):** Chrome / Edge are most reliable; Safari is
  partial. The Memorize screen degrades gracefully without it.
- Browsers block audio until the first tap — the app primes audio on the first
  touch/keypress, then begins self-voicing.
