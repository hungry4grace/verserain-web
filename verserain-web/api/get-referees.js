import { Redis } from '@upstash/redis';
import { partyFetch } from './_lib/party.js';
import { mergePendingReferees, personalCodesOf } from './_lib/referees.js';

// Account-level referees (registered with one of my codes) come from the
// PartyKit user table via /reward-eligibility; that is a full user scan, so
// the answer is cached briefly per code set.
const PENDING_CACHE_SEC = 120;
async function accountReferees(redis, email, codes) {
  if (!codes.length) return [];
  const cacheKey = `referees:account:${codes.join(',')}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch { /* fall through */ }
  try {
    const elig = await partyFetch('/reward-eligibility', { email, inviterCodes: codes });
    const list = (elig && elig.referrals && Array.isArray(elig.referrals.list)) ? elig.referrals.list : [];
    const slim = list.map((r) => ({ name: r.name, createdAt: r.createdAt || null, passedVerses: r.passedVerses || 0 }));
    await redis.set(cacheKey, JSON.stringify(slim), { ex: PENDING_CACHE_SEC }).catch(() => {});
    return slim;
  } catch {
    return [];
  }
}
import { identityKey } from './link-identity.js';

// GET /api/get-referees?authors=<code1>,<code2>,<playerName>[&email=…]
//
// "People I referred" for the 互惠點數紀錄 panel. The inviter's referral
// history (gamification:history:referral:<author>, entries of type 'referred')
// names each referee by playerName — the same key the PartyKit garden and the
// creator-points bucket use — so the client can link straight to their garden.
//
// Which history lists are "mine": the keys the client passes (current name +
// this device's codes) ∪ every key linked to the account via link-identity
// (old names, codes from other devices) ∪ every personalCode that
// player_mapping maps to any of those names. A referral recorded against an
// old name or a code from another phone is found this way.
//
// For every distinct referee we also count how many people THEY referred, by
// reading their own history under every key they could have written to:
// their playerName plus every personalCode mapped to that name in
// player_mapping (a code is per device; a person can have several). Trees and
// fruits are not in Redis — the client reads those from the PartyKit garden.
const HISTORY_KEY = (k) => `gamification:history:referral:${k}`;
const MAX_REFEREES = 200;
const MAX_MY_KEYS = 100;

// All history keys belonging to one person: the given names/codes, plus every
// code player_mapping ties to any of those names.
export function expandIdentityKeys(seedKeys, codesByName) {
  const keys = Array.from(new Set((seedKeys || []).map((k) => String(k || '').trim()).filter(Boolean)));
  for (const k of [...keys]) for (const code of codesByName[k] || []) if (!keys.includes(code)) keys.push(code);
  return keys.slice(0, MAX_MY_KEYS);
}

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}

// Distinct referees named in a set of history lists, with the earliest
// 'referred' timestamp as their join date.
export function collectReferees(lists) {
  const byName = new Map();
  for (const list of lists || []) {
    for (const raw of list || []) {
      const it = parse(raw);
      if (!it || it.type !== 'referred' || !it.player) continue;
      const name = String(it.player);
      const ts = Number(it.timestamp) || 0;
      const prev = byName.get(name);
      if (!prev) byName.set(name, { name, joinedAt: ts });
      else if (ts && (!prev.joinedAt || ts < prev.joinedAt)) prev.joinedAt = ts;
    }
  }
  return [...byName.values()];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authors = String(req.query.authors || req.query.author || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!authors.length && !email) return res.status(400).json({ error: 'Missing authors' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ referees: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const [mapping, linked] = await Promise.all([
      redis.hgetall('player_mapping'),
      email ? redis.smembers(identityKey(email)) : Promise.resolve([]),
    ]);
    const codesByName = {};
    for (const [code, name] of Object.entries(mapping || {})) {
      if (!codesByName[name]) codesByName[name] = [];
      codesByName[name].push(code);
    }
    const myKeys = expandIdentityKeys([...authors, ...(linked || [])], codesByName);

    const myLists = await Promise.all(myKeys.map((a) => redis.lrange(HISTORY_KEY(a), 0, 499)));
    const referees = collectReferees(myLists)
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .slice(0, MAX_REFEREES);

    const [enriched, pendingSource] = await Promise.all([
      Promise.all(referees.map(async (r) => {
        const keys = Array.from(new Set([r.name, ...(codesByName[r.name] || [])]));
        const lists = await Promise.all(keys.map((k) => redis.lrange(HISTORY_KEY(k), 0, 499)));
        const referredCount = collectReferees(lists).length;
        return { name: r.name, joinedAt: r.joinedAt, referredCount };
      })),
      accountReferees(redis, email, personalCodesOf(myKeys)),
    ]);

    res.status(200).json({ referees: mergePendingReferees(enriched, pendingSource), keysSearched: myKeys.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
