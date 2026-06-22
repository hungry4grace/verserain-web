# 雲端家人 Daily — Canonical Reference

*Single source of truth for the Cloud Family daily-verse feature. Supersedes the earlier dated DESIGN/SETUP drafts. Last consolidated: 2026-06-22.*

---

## 1. What it does (one paragraph)

Each morning at **07:00 in the host's local timezone**, the system looks up that family's verse for the day and delivers it. The default, zero-setup path: the **host** gets a phone notification — "🙏 今日經文 — 分享給家人" — and tapping it opens **LINE's native share sheet** with the verse pre-filled, so the host forwards it into the family group with one tap. Family members who've enabled notifications also get a direct read nudge. Tapping the link opens today's reading in the app, credits it, and offers a one-tap **Amen / 已讀**. Back in the app, everyone sees a warm "今天 N 位家人來過 🙏" tally. No bots, no developer setup, no per-day work by anyone.

**Decisions baked in:** LINE is the channel · host one-tap forward (no bot) · 07:00 host-local · daily push **on by default** for family · one-tap Amen feedback.

---

## 2. The daily loop (how a day flows)

1. **07:00 host-local** — the hourly cron (`family-daily.yml`) finds families where it's now 7am and today's nudge hasn't gone out.
2. It picks **today's verse** = `verses[(today − startDate) in days]`, clamped to the plan length (one verse per day).
3. It sends:
   - **Host** → a "share with your family" push whose link is a `line.me/R/share` URL (opens LINE's share sheet pre-filled). *Skipped if the family bound a LINE bot — see §6.*
   - **Other members with notifications on** → a direct read + Amen nudge.
4. The host taps → picks the family LINE group → sends. The message carries a **`/fc` verse card** link.
5. A member taps the card → lands in the app on today's verse → reads → taps **Amen**.
6. The host/members see today's **Amen tally** in the family view.
7. The team is marked sent so a second cron run that hour doesn't double-send.

The in-app **Share** button uses the same `/fc` card link, so manual shares look identical to the automated one.

---

## 3. Files (what lives where)

**PartyKit backend** — `src/party/server.js` (deploy with `npx partykit deploy` from `verserain-web/`):

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /teams/amen` | member | Record one-tap Amen (idempotent per member/day; unranked, no points) |
| `GET /teams/amens` | member | Today's tally `{ count, names, mine }` |
| `GET /teams/daily-feed` | admin token | Cron manifest: per-team host tz, today's verse (resolved from inline verses → else the published set), host + member push subs, LINE config, last-sent date |
| `POST /teams/mark-daily-sent` | admin token | Idempotency stamp |
| `POST /teams/set-line` | admin token | Bind a LINE groupId to a family (used by the optional webhook) |

**Cron + workflow** (runs on GitHub Actions, free):

- `scripts/send-family-daily.mjs` — the sender: host LINE-forward prompt + member read nudges + optional bound-group auto-post + link-only fallback.
- `.github/workflows/family-daily.yml` — **at the repo root** (`/Users/davidhwang/Projects/verserain-web/.github/workflows/`, *not* inside `verserain-web/` — GitHub only scans the root). Runs hourly; checks out the repo and runs the sender from the `verserain-web/` subfolder. Falls back to the existing `PARTYKIT_ADMIN_TOKEN` secret.

**Vercel (the web app + serverless):**

- `api/family-card.js` — the `/fc` Open Graph card. LINE/WhatsApp render a verse preview (title · reference, verse text, branded image), then humans redirect into the app deep link with `&amen=1`. Verse data travels in `vref`/`vtext` params (renamed from `ref`/`t`, which crawlers strip).
- `api/line-webhook.js` — **optional/advanced** LINE auto-binder (see §6).
- `public/og-family.png` — 1200×630 branded preview image.
- `public/sw.js` — service worker; `notificationclick` opens external links (the LINE share sheet) in a fresh window instead of hijacking an app tab.
- `vercel.json` — rewrites `/fc → /api/family-card` and `/line-webhook → /api/line-webhook`.

**Frontend (React, in `verserain-web/`):**

- `src/teams/teamsApi.js` — `amen()`, `getAmens()`.
- `src/teams/TeamsModal.jsx` — push on by default on create/join; **notification-prompt banner** for hosts who haven't enabled it; **Amen tally** line; `/fc` verse-card share link; **plan end-date = start + (N−1) days** (display + on pick).
- `src/App.jsx` — handles `&amen=1` deep links (records Amen + warm toast); passes push status into the teams modal.

**Test:** `test-family-daily.mjs` — 61-assertion integration suite that drives the real `Server` class over HTTP through the whole flow. Run with `node test-family-daily.mjs`.

---

## 4. Deploy

```bash
cd /Users/davidhwang/Projects/verserain-web/verserain-web
npm run build                      # must pass

cd ..
git add -A
git commit -m "<message>"
git push                           # → Vercel (app + /fc) and GitHub Actions (cron script)

cd verserain-web
npx partykit deploy                # → backend endpoints (only when src/party/server.js changed)
```

- **Push** deploys the web app, the `/fc` and `/line-webhook` functions, and the cron script (Actions checks out the repo).
- **`npx partykit deploy`** is separate — only needed when `server.js` changed.
- The cron workflow file must be at the **repo root** `.github/workflows/`.

**GitHub Actions secrets** (Settings → Secrets → Actions). The first four are safe to set as-is; the last two already exist from "Morning Daily Verse Push":

| Secret | Value |
|---|---|
| `PARTY_BASE` | `https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db` |
| `PUBLIC_ORIGIN` | `https://www.verserain.com` |
| `VAPID_SUBJECT` | `mailto:hungry4grace@gmail.com` |
| `VAPID_PUBLIC_KEY` | the key in `src/pushConfig.js` |
| `VAPID_PRIVATE_KEY` | already set (pull from PartyKit via `npx partykit env pull .env.local` if needed) |
| `ADMIN_TOKEN` / `PARTYKIT_ADMIN_TOKEN` | the PartyKit admin token (also in Vercel env) |

**Test a run:** Actions → "Cloud Family daily nudge" → Run workflow → check **force** + **dry_run** → read the `Send daily nudges` log. `0 team(s)` is a healthy pass when no family has a verse scheduled for today.

---

## 5. Two operational must-knows

1. **Schedules created before verse-snapshotting need a one-time re-pick.** A bundled set stores only its id; the verses live only in that Bible version's client bundle. If an old schedule has no embedded verses, the link can't open for members on other versions. **Fix:** open the family → Manage → tap **更換/Change** on each item, re-select the same set, **Save**. That embeds the verses (`verses: [{reference, text}]`), so the link opens for everyone and the LINE message gets the verse text. New schedules do this automatically.

2. **Reach depends on hosts enabling notifications.** The morning forward is a web push; a host with notifications off (`forward→host=0` in the cron log) gets nothing. New create/join auto-prompts; existing hosts see the in-app **notification banner** and should tap "開啟 / Turn on" once. iPhone users must add VerseRain to the Home Screen for web push to work (Apple limitation) — which is another reason LINE (the host's forward) is the resilient channel.

---

## 6. Optional / advanced: full LINE-group auto-posting

Most families don't need this — the host forward already lands the verse in the group with zero setup. If you want the verse to post into a group **fully automatically** (no host tap), you can run one LINE bot for the whole app:

1. Create a Messaging API channel at developers.line.biz; copy the **channel access token** + **channel secret**; set the webhook URL to `https://www.verserain.com/api/line-webhook`; disable auto-reply.
2. Add the secrets: `LINE_CHANNEL_ACCESS_TOKEN` (GitHub + Vercel), `LINE_CHANNEL_SECRET` (Vercel).
3. A host adds the bot to the family's LINE group and types the family **invite code** in the chat. The webhook (`api/line-webhook.js`) auto-binds the group (calls `/teams/set-line`) and confirms — **no hunting for a group ID**.

When a group is bound, the cron auto-posts into it and skips that family's host-forward prompt.

---

## 7. Behavior reference

- **Day advance:** the verse steps forward one per calendar day from `startDate`; clamps to the last verse after the plan ends; shows "未開始" before it starts. The app and the morning forward use identical math, so they always agree.
- **Plan end date:** always `startDate + (totalCount − 1)` days — computed, never stored stale. Editing Start recomputes End.
- **Amen:** idempotent per member per UTC day; never ranked; no points — a warm presence signal only.
- **Idempotency:** a live run marks all sent families for that host-local day, so they won't re-fire at 7am the same day.

---

*Verification status: `node test-family-daily.mjs` → 61/61 passing, exercising the real backend over HTTP (family lifecycle, daily-feed + verse resolution, Amen, the live cron sender in host-forward and bound-group modes, date-window logic, idempotency, the `/fc` card with vref/vtext, set-line, and the LINE webhook). `vite build` should be run locally before each deploy.*
