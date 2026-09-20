import { Redis } from '@upstash/redis';

// GET /api/get-referees?authors=<code1>,<code2>,<playerName>
//
// "People I referred" for the 互惠點數紀錄 panel. The inviter's referral
// history (gamification:history:referral:<author>, entries of type 'referred')
// names each referee by playerName — the same key the PartyKit garden and the
// creator-points bucket use — so the client can link straight to their garden.
//
// For every distinct referee we also count how many people THEY referred, by
// reading their own history under every key they could have written to:
// their playerName plus every personalCode mapped to that name in
// player_mapping (a code is per device; a person can have several). Trees and
// fruits are not in Redis — the client reads those from the PartyKit garden.
const HISTORY_KEY = (k) => `gamification:history:referral:${k}`;
const MAX_REFEREES = 200;

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
  if (!authors.length) return res.status(400).json({ error: 'Missing authors' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ referees: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const myLists = await Promise.all(authors.map((a) => redis.lrange(HISTORY_KEY(a), 0, 499)));
    const referees = collectReferees(myLists)
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .slice(0, MAX_REFEREES);
    if (!referees.length) return res.status(200).json({ referees: [] });

    const mapping = (await redis.hgetall('player_mapping')) || {};
    const codesByName = {};
    for (const [code, name] of Object.entries(mapping)) {
      if (!codesByName[name]) codesByName[name] = [];
      codesByName[name].push(code);
    }

    const enriched = await Promise.all(referees.map(async (r) => {
      const keys = Array.from(new Set([r.name, ...(codesByName[r.name] || [])]));
      const lists = await Promise.all(keys.map((k) => redis.lrange(HISTORY_KEY(k), 0, 499)));
      const referredCount = collectReferees(lists).length;
      return { name: r.name, joinedAt: r.joinedAt, referredCount };
    }));

    res.status(200).json({ referees: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
