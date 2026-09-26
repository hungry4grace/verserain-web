import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { partyFetch } from './_lib/party.js';
import { pushNotify } from './_lib/rewards.js';
import { sendReferralPush } from './_lib/webpush.js';
import { sendReferralApns } from './_lib/apns.js';
import { notifyAdmins, contestSubmittedMessage } from './_lib/adminNotify.js';
import { getPlace } from './_lib/places.js';
import { clientIp, ipRateLimit, maskName, taipeiDay } from './_lib/points.js';
import {
  ContestError, listContests, getContest, saveContest, openContestsForPlace, MAX_OPEN_CONTESTS_PER_PLACE,
  normalizeContestSubmission, applyContestAdminAction, contestIsOpen, contestCounters,
  joinContest, acceptChallenge, submitContestScore, contestLeaderboard, contestRank,
  checkContestCompletion, markCompleted,
  publicContest, publicContests, ownerContestView,
  contestJoinKey, contestChallengeKey, contestCompletedKey,
  countContestCreatesToday, bumpContestCreates, MAX_CONTEST_CREATES_PER_DAY,
} from './_lib/contests.js';

// Bible reading contests (讀經比賽). See api/_lib/contests.js for the data
// model and what it deliberately leaves out (no in-app reward, no money).
//   GET                                   public → { contests } (approved+open, public view; cached 60 s)
//   GET ?mine=1&email=&sessionKey=        → { owned, joined }  (joined includes my progress/score/rank)
//   GET ?all=1&adminEmail=                admin → { contests } (everything + counters)
//   GET ?leaderboard=1&contestId=         → { leaderboard: [{who,score}] } (only who accepted the challenge)
//   POST { action:'create', email, sessionKey, contest:{ orgPlaceId, name, setId, setTitle, verses, startsAt, endsAt, ... } }
//   POST { action:'join', email, sessionKey, contestId }
//   POST { action:'accept_challenge', email, sessionKey, contestId }
//   POST { action:'submit_score', email, sessionKey, contestId, setId, score }
//   POST { action:'claim_completion', email, sessionKey, contestId }   → server verifies via PartyKit garden data
//   POST { action:'approve'|'reject'|'close', adminEmail, contestId }
//   POST { action:'create', adminEmail, contest:{...} }   admin → approved at once
const ERROR_STATUS = {
  login_required: 400, session_invalid: 401, verify_unavailable: 503,
  not_eligible: 403, not_owner: 403,
  contest_unavailable: 404, not_found: 404, org_place_invalid: 400,
  name_required: 400, set_required: 400, verses_required: 400, ends_after_starts: 400,
  invalid_state: 400, join_required: 400, challenge_required: 400, set_mismatch: 400, score_invalid: 400,
  contest_limit: 409, contest_closed: 409,
  rate_limited: 429, daily_limit: 429,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ contests: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const now = new Date();

    if (req.method === 'GET') return get(req, res, redis, now);

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const action = String(body.action || '');
    try {
      if (action === 'join') return await joinAction(req, res, redis, body, now);
      if (action === 'accept_challenge') return await acceptChallengeAction(req, res, redis, body, now);
      if (action === 'submit_score') return await submitScoreAction(req, res, redis, body, now);
      if (action === 'claim_completion') return await claimCompletionAction(req, res, redis, body, now);
      if (action === 'create' && !body.adminEmail) return await createByOwner(req, res, redis, body, now);
      return await adminAction(req, res, redis, body, action, now);
    } catch (e) {
      if (e instanceof ContestError) {
        const status = ERROR_STATUS[e.code] || 400;
        const extra = {};
        if (e.reasons) extra.reasons = e.reasons;
        if (e.limit !== undefined) extra.limit = e.limit;
        return res.status(status).json({ error: e.code, ...extra });
      }
      throw e;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function get(req, res, redis, now) {
  const q = req.query || {};
  if (q.all) {
    const denied = requireAdmin(req, q.adminEmail);
    if (denied) return res.status(denied.status).json({ error: denied.error });
    const contests = await listContests(redis);
    const out = [];
    for (const c of contests) out.push({ ...c, counters: await contestCounters(redis, c.id) });
    return res.status(200).json({ contests: out });
  }
  if (q.leaderboard) {
    const contestId = String(q.contestId || '').trim();
    if (!contestId) return res.status(400).json({ error: 'contestId required' });
    return res.status(200).json({ leaderboard: await contestLeaderboard(redis, contestId) });
  }
  if (q.mine) {
    const login = await verifyLogin(res, { email: q.email, sessionKey: q.sessionKey });
    if (!login) return undefined;
    const { email } = login;
    const contests = await listContests(redis);
    const owned = [];
    for (const c of contests.filter((x) => x.ownerEmail === email)) {
      owned.push(ownerContestView(c, await contestCounters(redis, c.id)));
    }
    const joinedList = [];
    for (const c of contests) {
      const isJoined = await redis.sismember(contestJoinKey(c.id), email);
      if (!isJoined) continue;
      const [accepted, completed, rankInfo] = await Promise.all([
        redis.sismember(contestChallengeKey(c.id), email),
        redis.sismember(contestCompletedKey(c.id), email),
        contestRank(redis, c.id, email),
      ]);
      joinedList.push({ ...publicContest(c, await contestCounters(redis, c.id)), accepted: !!accepted, completedByMe: !!completed, myScore: rankInfo.score, myRank: rankInfo.rank });
    }
    return res.status(200).json({ owned, joined: joinedList });
  }
  const contests = (await listContests(redis)).filter((c) => c.status === 'approved');
  const counters = {};
  for (const c of contests) counters[c.id] = await contestCounters(redis, c.id);
  // ?fresh=… is the client's own cache-buster right after it joined/scored.
  res.setHeader('Cache-Control', q.fresh ? 'no-store' : 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ contests: publicContests(contests, counters) });
}

async function joinAction(req, res, redis, body, now) {
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity, garden } = login;
  const contest = await getContest(redis, String(body.contestId || '').trim());
  if (!contest) throw new ContestError('contest_unavailable');
  await joinContest(redis, { contest, email, identity, garden, now });
  try {
    if (contest.ownerCode) await pushNotify(redis, contest.ownerCode, { kind: 'contest_joined', contestId: contest.id, name: contest.name, who: maskName(identity.playerName) });
  } catch { /* inbox is best-effort */ }
  return res.status(200).json({ success: true, contest: publicContest(contest, await contestCounters(redis, contest.id)) });
}

async function acceptChallengeAction(req, res, redis, body, now) {
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;
  const contest = await getContest(redis, String(body.contestId || '').trim());
  if (!contest) throw new ContestError('contest_unavailable');
  await acceptChallenge(redis, { contest, email, identity, now });
  return res.status(200).json({ success: true });
}

async function submitScoreAction(req, res, redis, body, now) {
  const ip = clientIp(req);
  if (!(await ipRateLimit(redis, `contest:score:ip:${ip}`, 20, 60))) return res.status(429).json({ error: 'rate_limited' });
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;
  const contest = await getContest(redis, String(body.contestId || '').trim());
  if (!contest) throw new ContestError('contest_unavailable');
  const { total } = await submitContestScore(redis, { contest, email, identity, setId: body.setId, score: body.score, now });
  return res.status(200).json({ success: true, total });
}

// Server-verified: fetches the player's real garden from PartyKit and checks
// every verse of the contest against it — never trusts the client's own claim.
async function claimCompletionAction(req, res, redis, body, now) {
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;
  const contest = await getContest(redis, String(body.contestId || '').trim());
  if (!contest) throw new ContestError('contest_unavailable');
  const playerName = String(identity.playerName || '').trim();
  let gardenData = {};
  if (playerName) {
    try {
      const g = await partyFetch(`/garden?player=${encodeURIComponent(playerName)}`, undefined, { method: 'GET' });
      gardenData = (g && g.gardenData) || {};
    } catch { /* no garden yet → completion check below simply fails */ }
  }
  const result = checkContestCompletion(contest, gardenData);
  if (!result.complete) return res.status(200).json({ success: true, completed: false, ...result });
  await markCompleted(redis, { contest, email, identity, now });
  try {
    if (contest.ownerCode) await pushNotify(redis, contest.ownerCode, { kind: 'contest_completed', contestId: contest.id, name: contest.name, who: maskName(identity.playerName) });
  } catch { /* inbox is best-effort */ }
  return res.status(200).json({ success: true, completed: true, ...result });
}

async function createByOwner(req, res, redis, body, now) {
  const ip = clientIp(req);
  if (!(await ipRateLimit(redis, `contest:create:ip:${ip}`, 5, 60))) return res.status(429).json({ error: 'rate_limited' });
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;
  const input = body.contest || {};
  const orgPlace = await getPlace(redis, String(input.orgPlaceId || '').trim());
  if (!orgPlace || String(orgPlace.ownerEmail || '').toLowerCase() !== email) throw new ContestError('org_place_invalid');
  if (openContestsForPlace(await listContests(redis), orgPlace.id).length >= MAX_OPEN_CONTESTS_PER_PLACE) throw new ContestError('contest_limit', { limit: MAX_OPEN_CONTESTS_PER_PLACE });
  const day = taipeiDay(now);
  if ((await countContestCreatesToday(redis, email, day)) >= MAX_CONTEST_CREATES_PER_DAY) return res.status(429).json({ error: 'daily_limit' });
  let contest;
  try {
    contest = normalizeContestSubmission(input, { orgPlace, ownerEmail: email, ownerCode: identity.personalCode || '', now });
  } catch (e) {
    throw new ContestError(e.message);
  }
  contest.status = 'pending';
  await saveContest(redis, contest);
  await bumpContestCreates(redis, email, day);
  try { await notifyAdmins(redis, contestSubmittedMessage(contest, identity.playerName || email)); } catch { /* best-effort */ }
  return res.status(200).json({ success: true, contest: ownerContestView(contest) });
}

async function adminAction(req, res, redis, body, action, now) {
  const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
  const denied = requireAdmin(req, adminEmail);
  if (denied) return res.status(denied.status).json({ error: denied.error });
  let contest;
  if (action === 'create') {
    const input = body.contest || {};
    const orgPlace = await getPlace(redis, String(input.orgPlaceId || '').trim());
    if (!orgPlace) throw new ContestError('org_place_invalid');
    if (openContestsForPlace(await listContests(redis), orgPlace.id).length >= MAX_OPEN_CONTESTS_PER_PLACE) throw new ContestError('contest_limit', { limit: MAX_OPEN_CONTESTS_PER_PLACE });
    try {
      contest = normalizeContestSubmission(input, { orgPlace, ownerEmail: orgPlace.ownerEmail || adminEmail, ownerCode: orgPlace.ownerCode || '', now });
    } catch (e) {
      throw new ContestError(e.message);
    }
    contest.status = 'approved';
    contest.approvedAt = now.toISOString();
    contest.approvedBy = adminEmail;
    await saveContest(redis, contest);
  } else if (action === 'approve' || action === 'reject' || action === 'close') {
    contest = await getContest(redis, String(body.contestId || '').trim());
    if (!contest) throw new ContestError('not_found');
    contest = applyContestAdminAction(contest, action, { adminEmail, now });
    if (body.note !== undefined) contest.note = String(body.note || '').slice(0, 200);
    await saveContest(redis, contest);
    if ((action === 'approve' || action === 'reject') && contest.ownerCode) await notifyContestOwner(redis, contest, action === 'approve' ? 'contest_approved' : 'contest_rejected');
  } else {
    return res.status(400).json({ error: 'action must be create|join|accept_challenge|submit_score|claim_completion|approve|reject|close' });
  }
  const contests = await listContests(redis);
  const out = [];
  for (const c of contests) out.push({ ...c, counters: await contestCounters(redis, c.id) });
  return res.status(200).json({ success: true, contest, contests: out });
}

async function verifyLogin(res, body) {
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'login_required' }); return null; }
  if (!sessionKey) { res.status(400).json({ error: 'login_required' }); return null; }
  let elig;
  try {
    elig = await partyFetch('/reward-eligibility', { email, sessionKey, inviterCodes: [] });
  } catch {
    res.status(503).json({ error: 'verify_unavailable' });
    return null;
  }
  const identity = (elig && elig.identity) || {};
  if (identity.sessionValid !== true) { res.status(401).json({ error: 'session_invalid' }); return null; }
  return { email, identity, garden: (elig && elig.garden) || {} };
}

async function notifyContestOwner(redis, contest, kind) {
  const approved = kind === 'contest_approved';
  const title = approved ? '📖 讀經比賽已通過審核' : '📖 讀經比賽未通過審核';
  const body = approved ? `「${contest.name}」已上線，現在可以邀請大家參加了` : `「${contest.name}」未通過審核，請聯絡管理員了解原因`;
  const url = 'https://www.verserain.com/#contests';
  const tag = `verserain-contest-${contest.id}-${kind}`;
  await Promise.all([
    pushNotify(redis, contest.ownerCode, { kind, contestId: contest.id, name: contest.name }).catch(() => {}),
    sendReferralPush(contest.ownerCode, { title, body, url, tag }).catch(() => {}),
    sendReferralApns(contest.ownerCode, { title, body, url, collapseId: tag }).catch(() => {}),
  ]);
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
