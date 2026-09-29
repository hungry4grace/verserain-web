// 🔔 提醒他 — an inviter nudges a friend who registered with their code but has
// not cleared a verse yet (the 「已加入，還沒開始」 list). The nudge lands in the
// friend's 🔔 inbox (gamification:notify:<code>, kind 'nudge') and, when they
// allowed it, as a phone push.
//
// Who may nudge whom is decided server-side: the inviter's session must be
// valid and the friend must be one of *their* pending referees, both answered
// by PartyKit /reward-eligibility (the same source the pending list comes
// from). The friend's device codes are looked up in player_mapping and never
// leave the server.
//
// Redis keys:
//   nudge:<inviterEmail>:<friendName>   STR  cooldown latch (3 days)
//   nudge:day:<inviterEmail>:<day>      STR  nudges sent today (Taipei day)
import { dropForeignCodes, personalCodesOf, PERSONAL_CODE_RE } from './referees.js';
import { expandIdentityKeys } from '../get-referees.js';
import { identityKey } from '../link-identity.js';
import { taipeiDay } from './points.js';

export const NUDGE_COOLDOWN_SEC = 3 * 86400;
export const NUDGE_DAILY_MAX = 30;
const MAX_TARGET_CODES = 5;

const norm = (email) => String(email || '').trim().toLowerCase();
export const nudgePairKey = (email, name) => `nudge:${norm(email)}:${name}`;
export const nudgeDayKey = (email, day) => `nudge:day:${norm(email)}:${day}`;

export function nudgeMessage(fromName) {
  return `${fromName || '邀請你的人'} 邀你來經文雨玩一節經文，種下第一棵樹！`;
}

// deps: { partyFetch(path, body), push(code, { title, body, url, tag }) }
// → { success, delivered, retryAt } or { error, retryAt? }
export async function sendNudge(redis, { email, sessionKey, authors = [], name, now = new Date() } = {}, deps = {}) {
  const em = norm(email);
  const friend = String(name || '').trim();
  if (!em || !friend || friend.length > 60) return { error: 'bad_request' };
  if (!sessionKey) return { error: 'session_invalid' };

  // My codes: the same identity expansion 我推薦的朋友 uses (get-referees).
  const [mapping, linked] = await Promise.all([
    redis.hgetall('player_mapping'),
    redis.smembers(identityKey(em)),
  ]);
  const codesByName = {};
  for (const [code, n] of Object.entries(mapping || {})) (codesByName[n] = codesByName[n] || []).push(code);
  const mine = dropForeignCodes(authors, { mapping: mapping || {}, linked: linked || [] });
  const myKeys = expandIdentityKeys([...mine, ...(linked || [])], codesByName);
  const inviterCodes = personalCodesOf(myKeys);
  if (!inviterCodes.length) return { error: 'not_your_referee' };

  const elig = await deps.partyFetch('/reward-eligibility', { email: em, sessionKey, inviterCodes });
  if (!elig || !elig.identity || !elig.identity.sessionValid) return { error: 'session_invalid' };
  const list = (elig.referrals && Array.isArray(elig.referrals.list)) ? elig.referrals.list : [];
  const entry = list.find((r) => String((r && r.name) || '').trim() === friend);
  if (!entry) return { error: 'not_your_referee' };
  if (Number(entry.passedVerses) > 0) return { error: 'already_started' };

  const nowMs = now.getTime();
  const dayKey = nudgeDayKey(em, taipeiDay(now));
  if (Number(await redis.get(dayKey)) >= NUDGE_DAILY_MAX) return { error: 'daily_limit' };
  const pairKey = nudgePairKey(em, friend);
  const latch = await redis.set(pairKey, String(nowMs), { nx: true, ex: NUDGE_COOLDOWN_SEC });
  if (latch !== 'OK') {
    const ttl = Number(await redis.ttl(pairKey));
    return { error: 'too_soon', retryAt: nowMs + Math.max(0, ttl) * 1000 };
  }
  await redis.incr(dayKey);
  await redis.expire(dayKey, 2 * 86400);

  // The sender's name comes from their account, not the request.
  const fromName = String(elig.identity.playerName || '').trim();
  const targets = (codesByName[friend] || []).filter((c) => PERSONAL_CODE_RE.test(c)).slice(0, MAX_TARGET_CODES);
  const at = new Date(nowMs).toISOString();
  const body = nudgeMessage(fromName);
  for (const code of targets) {
    const key = `gamification:notify:${code}`;
    await redis.lpush(key, JSON.stringify({ kind: 'nudge', fromName, at }));
    await redis.ltrim(key, 0, 49);
    // Best effort: the inbox entry is the delivery; a push is a bonus.
    if (deps.push) {
      try { await deps.push(code, { title: '🌧️ VerseRain', body, url: 'https://www.verserain.com/?notify=1', tag: `verserain-nudge-${em}` }); } catch { /* ignore */ }
    }
  }
  return { success: true, delivered: targets.length, retryAt: nowMs + NUDGE_COOLDOWN_SEC * 1000 };
}
