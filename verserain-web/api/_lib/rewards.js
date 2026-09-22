import { sendReferralPush } from './webpush.js';
import { sendReferralApns } from './apns.js';

// Reward ledger — who earned a manually-fulfilled reward (e.g. a gift card)
// and where it is in the pending → claimed → sent flow. Every function takes
// the Upstash client so the logic is testable with a stub.
//
// Redis keys:
//   rewards:ledger                              HASH  rewardId → JSON reward
//   rewards:milestones:${kind}:${email}         SET   milestones already granted to this person
//   gamification:referrals:qualified:${code}    SET   referees of ${code} who planted ≥1 tree
//
// Reward kinds:
//   'verses'  — the player PASSED N verses (N a multiple of VERSES_PER_REWARD),
//               as counted by the PartyKit garden (stage ≥ 10), never by the client
//   'invites' — N people the player invited each passed ≥ QUALIFIED_PASSES
//               verses (N a multiple of INVITES_PER_REWARD)
//
// Money-backed rewards are minted only by grantMilestones() from a
// server-verified count (see api/reward-check.js); the `verified` snapshot on
// each record is what the admin reviews before sending anything.

export const LEDGER_KEY = 'rewards:ledger';
export const VERSES_PER_REWARD = 100;
export const INVITES_PER_REWARD = 10;
// A referee counts toward the inviter's reward once they have genuinely passed
// this many verses — signing up alone is worth nothing.
export const QUALIFIED_PASSES = 3;
// Review thresholds: below these the admin sees an amber flag (not a block).
export const REWARD_MIN_ACTIVE_DAYS = 10;
export const REWARD_MIN_ACCOUNT_DAYS = 14;
export const REWARD_CLUSTER_FLAG = 3;

export const qualifiedReferralsKey = (code) => `gamification:referrals:qualified:${code}`;
export const milestonesKey = (kind, email) => `rewards:milestones:${kind}:${String(email || '').trim().toLowerCase()}`;
export const rewardId = (code, kind, milestone) => `${code}:${kind}:${milestone}`;

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}

export async function pushNotify(redis, code, record) {
  if (!code) return;
  const key = `gamification:notify:${code}`;
  await redis.lpush(key, JSON.stringify({ ...record, at: record.at || new Date().toISOString() }));
  await redis.ltrim(key, 0, 49);
}

export function rewardTitle(reward) {
  return reward.kind === 'invites'
    ? `邀請的 ${reward.milestone} 位朋友都通過了經文`
    : `通過了 ${reward.milestone} 個經文`;
}

// Pure: review flags derived from the verification snapshot. Empty array means
// nothing looked odd; 'unverified' marks legacy rows minted before server
// verification existed.
export function flagsFor(reward) {
  const v = reward && reward.verified;
  if (!v) return ['unverified'];
  const flags = [];
  if (typeof v.activeDays === 'number' && v.activeDays < REWARD_MIN_ACTIVE_DAYS) flags.push('low_active_days');
  if (typeof v.accountAgeDays === 'number' && v.accountAgeDays < REWARD_MIN_ACCOUNT_DAYS) flags.push('young_account');
  if (v.emailKind === 'privaterelay') flags.push('privaterelay_email');
  if (reward.kind === 'invites' && typeof v.sameDayClusters === 'number' && v.sameDayClusters >= REWARD_CLUSTER_FLAG) flags.push('referee_cluster');
  return flags;
}

// Record a newly earned reward. Idempotent per (code, kind, milestone): a
// replayed milestone report never creates a second entry or re-notifies.
export async function createReward(redis, { code, name, email, kind, milestone, inviterCode, verified, region }) {
  if (!code || !kind || !milestone) return { created: false };
  const id = rewardId(code, kind, milestone);
  const reward = {
    id,
    code,
    name: name || '',
    email: email || '',
    kind,
    milestone: Number(milestone),
    inviterCode: inviterCode || '',
    status: 'pending',
    at: new Date().toISOString(),
  };
  if (verified) reward.verified = { ...verified, checkedAt: verified.checkedAt || reward.at };
  if (region) reward.region = region;
  const added = await redis.hsetnx(LEDGER_KEY, id, JSON.stringify(reward));
  if (!added) return { created: false, id };

  await pushNotify(redis, code, { kind: 'reward', rewardId: id, rewardKind: kind, milestone: reward.milestone });

  const body = `恭喜！你${rewardTitle(reward)}，獲得一份獎勵 🎁 打開通知領取`;
  const tag = `verserain-reward-${id}`;
  await Promise.all([
    sendReferralPush(code, { title: '🎁 VerseRain', body, url: 'https://www.verserain.com/?notify=1', tag }).catch(() => {}),
    sendReferralApns(code, { title: '🎁 VerseRain', body, url: 'https://www.verserain.com/?notify=1', collapseId: tag }).catch(() => {}),
    notifyAdmins(`${name || code} ${rewardTitle(reward)}，有一份獎勵待發送`, tag),
  ]);
  return { created: true, id, reward };
}

// Mint every reward of `kind` the server-verified `count` entitles this person
// to, at most once per (person, milestone). Keyed by email so a second device
// or a regenerated personalCode can never re-earn the same milestone. Someone
// who jumps from 0 to 250 gets both the 100 and the 200 rewards.
export async function grantMilestones(redis, { code, name, email, kind, count, verified, region, inviterCode }) {
  const per = kind === 'invites' ? INVITES_PER_REWARD : VERSES_PER_REWARD;
  const emailKey = String(email || '').trim().toLowerCase();
  const created = [];
  if (!code || !emailKey || !Number.isFinite(count)) return { created };
  for (let m = per; m <= count; m += per) {
    const added = await redis.sadd(milestonesKey(kind, emailKey), String(m));
    if (!added) continue;
    const r = await createReward(redis, { code, name, email: emailKey, kind, milestone: m, inviterCode, verified, region });
    if (r.created) created.push(r.reward);
  }
  return { created };
}

// Optional: push admins' phones when a reward lands. REWARDS_ADMIN_CODES is a
// comma-separated list of the admins' personalCodes (their push subscriptions
// are keyed by code). Unset → no-op; the admin page still shows the queue.
async function notifyAdmins(body, tag) {
  const codes = String(process.env.REWARDS_ADMIN_CODES || '').split(',').map(s => s.trim()).filter(Boolean);
  await Promise.all(codes.flatMap(c => [
    sendReferralPush(c, { title: '🎁 待發送獎勵', body, url: 'https://www.verserain.com/#rewards_admin', tag: `${tag}-admin` }).catch(() => {}),
    sendReferralApns(c, { title: '🎁 待發送獎勵', body, url: 'https://www.verserain.com/#rewards_admin', collapseId: `${tag}-admin` }).catch(() => {}),
  ]));
}

export async function listRewards(redis) {
  const rows = (await redis.hgetall(LEDGER_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}

export async function getReward(redis, id) {
  const raw = await redis.hget(LEDGER_KEY, id);
  return raw ? parse(raw) : null;
}

export async function saveReward(redis, reward) {
  await redis.hset(LEDGER_KEY, { [reward.id]: JSON.stringify(reward) });
  return reward;
}

// Called from the milestone report when a referee plants their FIRST tree:
// counts them as a qualified referral of their inviter for the inviter's
// dashboard. It no longer awards anything — the invites reward is minted by
// grantMilestones() from the server-verified referee count. The referee is
// identified by email when known (stable across devices) and only falls back
// to their per-device personalCode, so one person can't count twice.
export async function recordQualifiedReferral(redis, { inviterCode, refereeCode, refereeEmail }) {
  const refereeId = String(refereeEmail || '').trim().toLowerCase() || refereeCode;
  if (!inviterCode || !refereeId || inviterCode === refereeCode) return { count: 0 };
  const added = await redis.sadd(qualifiedReferralsKey(inviterCode), refereeId);
  if (!added) return { count: null, duplicate: true };
  const count = await redis.scard(qualifiedReferralsKey(inviterCode));
  return { count };
}
