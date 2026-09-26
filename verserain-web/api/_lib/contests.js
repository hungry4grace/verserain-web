// Bible reading contests (讀經比賽) — a church or organisation on the map
// scopes a time-boxed contest to one topic verse set. A player who "joins"
// can track reading progress (完成整組＝花園每一節都到達「已熟練」); the
// organisation sees who verified completion and rewards them OFFLINE — this
// module never issues or moves any money-equivalent value. A player who also
// "accepts the challenge" (接受背經文挑戰) gets a cumulative score on this
// contest's own leaderboard, earned only from Challenge (背經文) runs on this
// contest's verse set while the contest is open.
//
// Code calls this a "contest" (never "campaign"): the Challenge game engine
// elsewhere in this app already uses `campaign*` to mean "the current
// Challenge play-through queue" — an unrelated, in-memory concept.
//
// Redis keys:
//   contest:list                          HASH   contestId → JSON contest
//   contest:join:${contestId}             SET    emails who joined
//   contest:challenge:${contestId}        SET    emails who accepted the score challenge
//   contest:score:${contestId}            ZSET   email → cumulative Challenge score
//   contest:names:${contestId}            HASH   email → playerName (leaderboard display)
//   contest:completed:${contestId}        SET    emails verified as having finished the set
//   contest:completed:${contestId}:${email} STR  JSON { at } — completion timestamp
//   contest:submit:${email}:${day}        INT    contests created today (TTL 1 day)
import { normEmail, taipeiDay, eligibility, maskName } from './points.js';

export const CONTESTS_KEY = 'contest:list';
export const CONTEST_ID_RE = /^rc_[a-z0-9]{8,20}$/;
export const CONTEST_STATUSES = ['pending', 'approved', 'rejected', 'closed'];
export const ORG_KINDS = ['church', 'org'];
export const MAX_CONTEST_CREATES_PER_DAY = 2;
export const MAX_OPEN_CONTESTS_PER_PLACE = 5; // pending + approved contests one marker may run at once
export const MAX_CONTEST_VERSES = 200;
export const CONSENT_VERSION = 'v1';

const SUBMIT_TTL_SEC = 86400;

export const contestJoinKey = (contestId) => `contest:join:${contestId}`;
export const contestChallengeKey = (contestId) => `contest:challenge:${contestId}`;
export const contestScoreKey = (contestId) => `contest:score:${contestId}`;
export const contestNamesKey = (contestId) => `contest:names:${contestId}`;
export const contestCompletedKey = (contestId) => `contest:completed:${contestId}`;
export const contestCompletedEmailKey = (contestId, email) => `contest:completed:${contestId}:${normEmail(email)}`;
export const contestSubmitKey = (email, day) => `contest:submit:${normEmail(email)}:${day}`;

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}
function toDate(now) {
  if (now instanceof Date) return now;
  if (typeof now === 'number' || typeof now === 'string') return new Date(now);
  return new Date();
}
function toInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export class ContestError extends Error {
  constructor(code, extra = {}) { super(code); this.code = code; Object.assign(this, extra); }
}

export function newContestId(now, rand = Math.random) {
  const t = toDate(now).getTime().toString(36);
  const r = Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0');
  return `rc_${t}${r}`.slice(0, 23);
}

// ---------- pure: contest records ----------

// A contest belongs to an approved church / organisation marker on the map,
// scoped to one verse set. `verses` is the set's own reference list
// (["約翰福音 3:16", …]), snapshotted from the creator's client at creation
// time so completion-checking never has to re-resolve a set id against the
// right language file or the custom-sets store.
export function normalizeContestSubmission(input, { orgPlace, ownerEmail, ownerCode, now, existing } = {}) {
  const src = input || {};
  const place = orgPlace || null;
  if (!place || !ORG_KINDS.includes(place.kind) || place.status !== 'approved') throw new Error('org_place_invalid');
  const t = toDate(now).toISOString();
  const name = clip(src.name, 60);
  if (!name) throw new Error('name_required');
  const setId = clip(src.setId, 80);
  if (!setId) throw new Error('set_required');
  const setTitle = clip(src.setTitle, 100) || setId;
  const verses = Array.isArray(src.verses)
    ? Array.from(new Set(src.verses.map((v) => clip(v, 120)).filter(Boolean))).slice(0, MAX_CONTEST_VERSES)
    : [];
  if (!verses.length) throw new Error('verses_required');
  const startsAt = new Date(src.startsAt || Date.now()).toISOString();
  const endsAtRaw = new Date(src.endsAt || Date.now());
  if (!(endsAtRaw.getTime() > new Date(startsAt).getTime())) throw new Error('ends_after_starts');
  const endsAt = endsAtRaw.toISOString();
  const base = existing || {};
  return {
    id: base.id || newContestId(now),
    name,
    description: clip(src.description, 300),
    rewardDescription: clip(src.rewardDescription, 300),
    orgPlaceId: place.id,
    orgPlaceName: clip(place.name, 60),
    setId,
    setTitle,
    setLang: clip(src.setLang, 10),
    verses,
    seriesId: clip(src.seriesId, 40) || base.seriesId || base.id || newContestId(now),
    startsAt,
    endsAt,
    ownerEmail: normEmail(base.ownerEmail || ownerEmail),
    ownerCode: String(base.ownerCode || ownerCode || ''),
    status: base.status || 'pending',
    createdAt: base.createdAt || t,
    updatedAt: t,
    approvedAt: base.approvedAt || null,
    approvedBy: base.approvedBy || '',
    closedAt: base.closedAt || null,
    note: base.note || '',
  };
}

export function applyContestAdminAction(contest, action, { adminEmail, now } = {}) {
  const c = { ...contest };
  const t = toDate(now).toISOString();
  if (action === 'approve') {
    if (!['pending', 'closed'].includes(c.status)) throw new ContestError('invalid_state');
    c.status = 'approved'; c.approvedAt = t; c.approvedBy = normEmail(adminEmail); c.closedAt = null;
  } else if (action === 'reject') {
    if (c.status !== 'pending') throw new ContestError('invalid_state');
    c.status = 'rejected';
  } else if (action === 'close') {
    if (c.status !== 'approved') throw new ContestError('invalid_state');
    c.status = 'closed'; c.closedAt = t;
  } else {
    throw new ContestError('invalid_state');
  }
  c.updatedAt = t;
  return c;
}

export function contestIsOpen(contest, now) {
  if (!contest || contest.status !== 'approved') return false;
  const t = toDate(now).getTime();
  const starts = new Date(contest.startsAt).getTime();
  const ends = new Date(contest.endsAt).getTime();
  return t >= starts && t <= ends;
}

// ---------- storage ----------

export async function listContests(redis) {
  const rows = (await redis.hgetall(CONTESTS_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
export async function getContest(redis, id) {
  if (!id) return null;
  const raw = await redis.hget(CONTESTS_KEY, String(id));
  return raw ? parse(raw) : null;
}
export async function saveContest(redis, contest) {
  await redis.hset(CONTESTS_KEY, { [contest.id]: JSON.stringify(contest) });
  return contest;
}
// A church / organisation may run several contests at once (one per series);
// only the open ones (pending or approved) count against the cap.
export function openContestsForPlace(contests, placeId) {
  return (contests || []).filter((c) => c && c.orgPlaceId === placeId && (c.status === 'pending' || c.status === 'approved'));
}
export async function countContestCreatesToday(redis, email, day) {
  return Math.max(0, toInt(await redis.get(contestSubmitKey(email, day))));
}
export async function bumpContestCreates(redis, email, day) {
  const n = await redis.incr(contestSubmitKey(email, day));
  if (n === 1) await redis.expire(contestSubmitKey(email, day), SUBMIT_TTL_SEC);
  return n;
}

export async function contestCounters(redis, contestId) {
  const [joined, accepted, completed] = await Promise.all([
    redis.scard(contestJoinKey(contestId)),
    redis.scard(contestChallengeKey(contestId)),
    redis.scard(contestCompletedKey(contestId)),
  ]);
  return { joined: Math.max(0, toInt(joined)), accepted: Math.max(0, toInt(accepted)), completed: Math.max(0, toInt(completed)) };
}

// ---------- join / accept challenge ----------

export async function joinContest(redis, { contest, email, identity, garden, now } = {}) {
  const em = normEmail(email || (identity && identity.email));
  if (!contest || !contestIsOpen(contest, now)) throw new ContestError('contest_unavailable');
  const { eligible, reasons } = eligibility(identity, garden);
  if (!eligible) throw new ContestError('not_eligible', { reasons });
  await redis.sadd(contestJoinKey(contest.id), em);
  return { joined: true };
}

export async function acceptChallenge(redis, { contest, email, identity, now } = {}) {
  const em = normEmail(email || (identity && identity.email));
  if (!contest || !contestIsOpen(contest, now)) throw new ContestError('contest_unavailable');
  const joined = await redis.sismember(contestJoinKey(contest.id), em);
  if (!joined) throw new ContestError('join_required');
  await redis.sadd(contestChallengeKey(contest.id), em);
  await redis.hset(contestNamesKey(contest.id), { [em]: clip(identity && identity.playerName, 40) || em });
  return { accepted: true };
}

// ---------- score (背經文挑戰累加分數) ----------

// Only a Challenge run finished on this contest's own set, by someone who
// accepted the challenge, while the contest is open, counts — and it ADDS to
// the running total (unlike the global set leaderboard's best-score-wins).
export async function submitContestScore(redis, { contest, email, identity, setId, score, now } = {}) {
  const em = normEmail(email || (identity && identity.email));
  if (!contest || contest.status !== 'approved') throw new ContestError('contest_unavailable');
  if (!contestIsOpen(contest, now)) throw new ContestError('contest_closed');
  if (String(setId || '') !== contest.setId) throw new ContestError('set_mismatch');
  const accepted = await redis.sismember(contestChallengeKey(contest.id), em);
  if (!accepted) throw new ContestError('challenge_required');
  const pts = Math.max(0, Math.min(1000000, toInt(score)));
  if (pts <= 0) throw new ContestError('score_invalid');
  const total = await redis.zincrby(contestScoreKey(contest.id), pts, em);
  await redis.hset(contestNamesKey(contest.id), { [em]: clip(identity && identity.playerName, 40) || em });
  return { total: Math.max(0, toInt(total)) };
}

export async function contestLeaderboard(redis, contestId, { limit = 50 } = {}) {
  const rows = (await redis.zrange(contestScoreKey(contestId), 0, limit - 1, { rev: true, withScores: true })) || [];
  const names = (await redis.hgetall(contestNamesKey(contestId))) || {};
  const out = [];
  for (let i = 0; i < rows.length; i += 2) {
    const email = rows[i];
    const score = toInt(rows[i + 1]);
    out.push({ who: maskName(names[email] || email), score });
  }
  return out;
}
export async function contestRank(redis, contestId, email) {
  const em = normEmail(email);
  const [rank, score] = await Promise.all([
    redis.zrevrank(contestScoreKey(contestId), em),
    redis.zscore(contestScoreKey(contestId), em),
  ]);
  return { rank: rank === null || rank === undefined ? null : toInt(rank) + 1, score: Math.max(0, toInt(score)) };
}

// ---------- completion (讀完整組經文, verified server-side) ----------

// Every verse ref the contest lists must be at garden stage ≥ 10 ("已熟練") in
// the player's REAL garden data (fetched server-side from PartyKit — never
// trust a client's own claim of completion).
export function checkContestCompletion(contest, gardenData) {
  const g = gardenData || {};
  const verses = (contest && contest.verses) || [];
  if (!verses.length) return { complete: false, passed: 0, total: 0 };
  let passed = 0;
  for (const ref of verses) if (((g[ref] || {}).stage || 0) >= 10) passed += 1;
  return { complete: passed >= verses.length, passed, total: verses.length };
}

export async function markCompleted(redis, { contest, email, identity, now } = {}) {
  const em = normEmail(email || (identity && identity.email));
  const joined = await redis.sismember(contestJoinKey(contest.id), em);
  if (!joined) throw new ContestError('join_required');
  const already = await redis.sismember(contestCompletedKey(contest.id), em);
  if (!already) {
    await redis.sadd(contestCompletedKey(contest.id), em);
    await redis.set(contestCompletedEmailKey(contest.id, em), JSON.stringify({ at: toDate(now).toISOString() }));
  }
  return { completed: true };
}

// ---------- views ----------

// What anyone may see: no emails, no owner code.
export function publicContest(contest, counters = {}) {
  if (!contest) return null;
  return {
    id: contest.id,
    name: contest.name,
    description: contest.description || '',
    rewardDescription: contest.rewardDescription || '',
    orgPlaceId: contest.orgPlaceId,
    orgPlaceName: contest.orgPlaceName || '',
    setId: contest.setId,
    setTitle: contest.setTitle || '',
    verses: contest.verses || [],
    totalVerses: (contest.verses || []).length,
    seriesId: contest.seriesId || '',
    status: contest.status,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    joined: toInt(counters.joined),
    accepted: toInt(counters.accepted),
    completed: toInt(counters.completed),
    createdAt: contest.createdAt,
    approvedAt: contest.approvedAt || null,
  };
}
export function publicContests(contests, countersById = {}) {
  return (contests || []).filter((c) => c && c.status === 'approved').map((c) => publicContest(c, countersById[c.id]));
}
// The organisation's own view: everything but the admin note.
export function ownerContestView(contest, counters = {}) {
  if (!contest) return null;
  const { note, ...rest } = contest; // eslint-disable-line no-unused-vars
  return { ...publicContest(contest, counters), ...rest };
}
