# Companion Teams — User Guide

> "Two are better than one, because they have a good return for their labor." — Ecclesiastes 4:9

Companion Teams is a small-group Bible reading feature in VerseRain —
**for walking alongside each other, not for competition**.
Admins start a team, set the reading schedule; members read, reflect, and encourage one another.

---

## Table of Contents

- [Core Design Principles](#core-design-principles)
- [Quick Start](#quick-start)
  - [Joining a Team](#joining-a-team)
  - [Creating a Team](#creating-a-team)
- [Roles and Permissions](#roles-and-permissions)
- [Features](#features)
  - [Reading Schedule](#reading-schedule)
  - [Reflections and Prayer Requests](#reflections-and-prayer-requests)
  - [Cheer](#cheer)
  - [Our Team's Fruit Garden (Stats Panel)](#our-teams-fruit-garden-stats-panel)
  - [Gentle Nudge (Admin)](#gentle-nudge-admin)
- [Points System](#points-system)
- [Anti-Abuse Safeguards](#anti-abuse-safeguards)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Core Design Principles

Four red lines that run through the whole team feature and never bend:

1. **No ranking.** All lists are ordered by join time or most recent activity — **never** by completions or points.
2. **No "behind" framing.** A member's progress never shows a rank or "you have N fewer verses than X".
3. **Milestone feedback, not score comparisons.** Completing a verse shows ✓ — not a score delta.
4. **Admins are shepherds, not referees.** They can set the pace and initiate, but they cannot punish those who fall silent.

The points system exists **not for comparison** but to let you see:
- Your own growth this week (personal milestone)
- The fruit your team is bearing together (shared celebration)

---

## Quick Start

### Joining a Team

Method 1: **Scan a QR Code**
1. Admin opens the team's "Manage" page → taps **QR**
2. You point your phone camera at it
3. Auto-redirects to the join screen, confirm → done

Method 2: **Tap a Share Link**
1. Admin sends you a link like `https://www.verserain.com/?join=XXX-XXXX`
2. Tap it → app auto-opens the join screen with the code pre-filled
3. Tap "Join" → done

Method 3: **Enter the Invite Code Manually**
1. In the app, tap **"Companion Teams"** in the top nav
2. Tap "Join with invite code"
3. Enter the 7-character code like `IZ2-5HAF` (case-insensitive)
4. Confirm → done

> **You can join multiple teams at the same time**: up to 20 teams,
> with potentially different roles in each (admin in one, plain member in another).

### Creating a Team

1. Tap **"Companion Teams"** → tap "+ Create team"
2. Give the team a name (≤80 chars) + a short description (≤500 chars, optional)
3. The system auto-generates an invite code
4. You become the **creator + first admin**

> Each person can **create up to 5 teams** (to prevent spam).
> Each team holds at most **8 admins, 200 members**.

---

## Roles and Permissions

| Action | Member | Admin |
|---|:---:|:---:|
| See members, progress, reflections/prayers | ✓ | ✓ |
| Mark own verses complete | ✓ | ✓ |
| Write reflection / prayer | ✓ | ✓ |
| Send emoji / text cheer | ✓ | ✓ |
| React to reflections | ✓ | ✓ |
| See "Gentle Nudge" |  | ✓ |
| Edit schedule |  | ✓ |
| Regenerate invite code |  | ✓ |
| Promote / demote admin |  | ✓ |
| Delete others' reflections |  | ✓ |
| Disband team |  | ✓ (creator or sole admin only) |
| Leave team | ✓ | ✓ (a **sole admin** cannot leave directly — must promote someone or disband) |

---

## Features

### Reading Schedule

The admin designs a series of items in the "Manage" page. Each item represents one passage (a "verse set"):

- **Title** (required) — e.g., "Psalm 37 — Inherit the Land"
- **setId** (required) — matches a VerseRain verse set, or any string
- **Verses** — comma-separated references, e.g. `Ps 37:3, Ps 37:4, …`
- **Target date** (optional) — soft goal; overdue is **never** punished
- **Note to members** (optional, ≤800 chars) — why this passage, how to meditate

Members see each item in the team detail page with:
- Completion `X / N`
- The note (auto-expands)
- Verse buttons — tap to mark complete (turns green ✓), tap again to undo

### Reflections and Prayer Requests

Each schedule item has a **"Reflections · Prayers"** thread below it.

Tap **+ Reflection** or **+ Prayer** to open the compose form:
- Optionally tag a specific verse, or the whole passage
- Up to 1000 characters
- All team members see it after submission

**Reflection vs. Prayer**:
- Reflection (blue tag) — personal insight, testimony, what God spoke to you
- Prayer (purple tag) — something you'd like the team to pray for you about

Either kind can be reacted to with emoji (❤️ 🙏 ✨ 🌧️) by any member.
**Author can delete their own. Admins can also delete (mild moderation).**
**Editing is intentionally unavailable** — to preserve the journal-like
authenticity, no retroactive rewriting.

### Cheer

Two ways to encourage a member — both surface in the "Recent encouragement" area at the top.

1. **One-tap emoji** — tap ❤️ / 🙏 / ✨ / 🌧️ on a member's card
2. **Text note** — tap "Note", write up to 140 chars + pick an emoji, send

To respond to a reflection or prayer, it's a different path:
- Tap an emoji at the bottom of the reflection card
- Each person can give each emoji **once** per reflection (LINE-style)
- Tap again to remove (removing does **not** refund points)

### Our Team's Fruit Garden (Stats Panel)

Every team member sees a green-tinted panel at the top:

```
🌳 Our team's fruit garden
  You · this week     You · total      Team · this week
        30 🍎              30 🍎             58 🍎
                                              3/7 active
```

- **You · this week** — fruit you've earned in this team this week (UTC week)
- **You · total** — your total across all teams (integrated into your garden)
- **Team · this week** — the team's collective fruit + "N/M members active"
- **Never** shows other members' individual points
- **Never** ranks anyone

### Gentle Nudge (Admin)

An orange-tinted card visible only to admins. Auto-detects:

- **N members haven't opened the schedule yet** — expand to see the names + 4 quick-cheer emoji buttons
- **N members have been quiet for 7+ days** — same expand pattern

Designed to be a **shepherding tool** — admins can reach out proactively
to the quiet ones, without ever telling those members "you were flagged."

---

## Points System

Points are **integrated into your existing fruit garden** —
fruit earned in teams adds directly to your personal garden. No separate currency.

### Full Points Table

| Action | Points | Limit / Rule |
|---|:---:|---|
| **🌱 Personal Reading** |  |  |
| Mark a verse complete (first time) | **3** | Each verse earns once in a lifetime (across all teams) |
| **🌳 Deep Sharing (Author)** |  |  |
| Write a reflection | **15** | Only the first post per item per day earns points |
| Write a prayer request | **15** | Same as reflection |
| Your reflection receives an emoji reaction | **+2** | Per unique reactor (anti-spam) |
| **💗 Companionship (Giver)** |  |  |
| Quick-tap emoji on a member's card | **1** | Daily cap 10 = 10 pts |
| Text note on a member's card | **5** | Daily cap 5 notes = 25 pts |
| Emoji react to a reflection / prayer | **2** | Daily cap 20 times = 40 pts |
| **👑 Admin Building** |  |  |
| Create a new team | **20** | One-time |
| Schedule item with verses listed | **10** | One-time per item |
| Schedule item with meaningful description (>20 chars) | **5** | One-time per item |

### Typical Daily Scenarios

| Scenario | Calculation | Daily Total |
|---|---|---|
| Quiet observer: 1 verse only | 1×3 | **3 🍎** |
| Engaged reader: 3 verses + 1 reflection + 3 emoji cheers + 2 reactions | 9 + 15 + 3 + 4 | **31 🍎** |
| Active encourager: 1 verse + 1 reflection + 1 prayer + 5 emoji + 2 notes + 5 reactions | 3+15+15+5+10+10 | **58 🍎** |
| Admin on launch day (one-time): create team + 5 schedule items + 3 with descriptions + 1 reflection | 20+50+15+15 | **100 🍎** (then back to normal) |

### Design Rationale

- "**Reflection (15)**" ≈ "**Read 5 verses (15)**" — quality and quantity both matter
- "**Text cheer (5)**" > "**Quick emoji (1)**" — **intentional words** beat reaction spam
- "**Reaction daily cap = 40 pts**" ≈ "**Read a full chapter**" — companionship and reading are equally weighted
- **Admin one-time burst** (100 pts on launch day) — honors the shepherd's set-up effort,
  but **not repeated** — being an admin is not a permanent +50% buff

---

## Anti-Abuse Safeguards

| Mechanism | Stops |
|---|---|
| **Idempotent event keys** | Toggling a verse on/off doesn't farm points |
| **Per-day caps (per bucket)** | Spamming emoji to 100 people still caps at 10 pts |
| **First-post-per-item-per-day** | Writing 50 one-character "reflections" earns 15 pts total |
| **Cancelling a reaction doesn't refund** | Prevents the "react → un-react → react" cycle |
| **Author impact uniqueness per reactor** | Friends mashing the same reaction button still gives the author only +2 once |
| **One-time team creation** | Can't disband-and-recreate to farm 20 pts |
| **Server-enforced** | Client point counts are never trusted — server's `points-journal` locks dedup |

---

## Frequently Asked Questions

**Q1: Will points be ranked within the team?**
No. **Never.** Members only see each other's "X verses done" — never each other's points.
You only see your own weekly/total, plus your team's collective weekly total.

**Q2: I'm in 3 teams reading the same passage — do I earn 3× points?**
No. Reading is personal — each verse earns 3 pts once in your lifetime, across all teams.
But reflections and cheers are social acts and count separately per team
(each team's members deserve their own testimony — that's not spam).

**Q3: An admin gets 100 pts on team launch day — is that fair?**
The 100+ pts is **one-shot**. Day two, the admin earns the same as everyone else.
The shepherd's effort of laying the foundation deserves one-time recognition,
not a permanent +50% buff.

**Q4: Are points ever reset?**
- **Personal total** ("You · total") — never reset
- **Personal this week** ("You · this week") — reset every Monday UTC 00:00
- **Team this week** — same as above

**Q5: If I leave a team, do I lose my accumulated points?**
No. Points accumulate in your personal garden globally. Leaving a team doesn't affect them.
You just won't see that team's activity afterwards.

**Q6: Can admins manually give points to members?**
No. Points are awarded by the system based on actual actions. Admins have no manual control.
This is a deliberate fairness guarantee.

**Q7: Can I post reflections anonymously?**
Not currently. A premise of "companionship" is knowing who's speaking.
Future versions may revisit this for larger groups.

**Q8: Something a member wrote makes me uncomfortable. What do I do?**
- Tell the admin — admins can delete any member's reflection or prayer
- Cheer spam — admins can see the sender and reach out
- Truly hostile member — admins can disband and recreate the team (old invite code invalidates immediately)

**Q9: Can I create a pure "companionship" team with no schedule?**
Yes. An empty `schedule.items` is valid. Members can still encourage each other and write
daily testimonies (though they won't earn schedule-related points).

**Q10: Can I turn the points system off?**
Not currently — points are default behavior.
But because there's **no ranking and no popups**, you can treat them as background music if you don't care.

---

## Glossary

| 中文 | English | Description |
|---|---|---|
| 陪伴團隊 | Companion Team | The full feature name |
| 邀請碼 | Invite code | 7-character XXX-XXXX short code |
| 進度表 | Reading schedule | Admin-set reading plan |
| 心得 | Reflection | Personal insight / reflection |
| 代禱 | Prayer | Prayer request for the team |
| 鼓勵 | Cheer | Emoji or short-note encouragement |
| 果實 | Fruit (🍎) | Points, visually presented; integrated into garden |
| 關心提示 | Gentle Nudge | Admin-only "who to reach out to" panel |
| 本團果園 | Our team's fruit garden | The team's weekly collective stats panel |

---

*Version: Phase 2.5 (2026-06-10) — evolving*
