import { sendReferralPush } from './webpush.js';
import { sendReferralApns } from './apns.js';

// Reward ledger — who earned a manually-fulfilled reward (e.g. a gift card)
// and where it is in the pending → claimed → sent flow. Every function takes
// the Upstash client so the logic is testable with a stub.
//
// Redis keys:
//   rewards:ledger                              HASH  rewardId → JSON reward
//   gamification:referrals:qualified:${code}    SET   referees of ${code} who planted ≥1 tree
//
// Reward kinds:
//   'verses'  — the player completed N verses (N a multiple of VERSES_PER_REWARD)
//   'invites' — N people the player invited each planted ≥1 tree (N a multiple
//               of INVITES_PER_REWARD)

export const LEDGER_KEY = 'rewards:ledger';
export const VERSES_PER_REWARD = 100;
export const INVITES_PER_REWARD = 10;

export const qualifiedReferralsKey = (code) => `gamification:referrals:qualified:${code}`;
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
    ? `邀請的 ${reward.milestone} 位朋友都開始種樹了`
    : `完成了 ${reward.milestone} 個經文`;
}

// Record a newly earned reward. Idempotent per (code, kind, milestone): a
// replayed milestone report never creates a second entry or re-notifies.
export async function createReward(redis, { code, name, email, kind, milestone, inviterCode }) {
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
// counts them as a qualified referral of their inviter, and grants the inviter
// a reward at every INVITES_PER_REWARD-th qualified referral.
export async function recordQualifiedReferral(redis, { inviterCode, refereeCode }) {
  if (!inviterCode || !refereeCode || inviterCode === refereeCode) return { count: 0 };
  const added = await redis.sadd(qualifiedReferralsKey(inviterCode), refereeCode);
  if (!added) return { count: null, duplicate: true };
  const count = await redis.scard(qualifiedReferralsKey(inviterCode));
  if (count % INVITES_PER_REWARD !== 0) return { count };
  let inviterName = '';
  try { inviterName = (await redis.hget('player_mapping', inviterCode)) || ''; } catch { /* name is cosmetic */ }
  const result = await createReward(redis, { code: inviterCode, name: inviterName, kind: 'invites', milestone: count });
  return { count, ...result };
}
