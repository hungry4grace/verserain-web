import { Redis } from '@upstash/redis';
import { identityKey } from './link-identity.js';
import { dropForeignCodes } from './_lib/referees.js';
import { expandIdentityKeys } from './get-referees.js';

// GET /api/get-creator-points?author=<key>[&history=true]
//   Points + (optionally) history for ONE point-bucket key.
// GET /api/get-creator-points?authors=<k1,k2,…>&email=<account email>[&history=true]
//   Same, but merged across every key that belongs to the account: the keys
//   given ∪ keys linked via link-identity (old names, codes from other
//   devices) ∪ every personalCode player_mapping ties to those names. Points
//   are summed per distinct key (each key is its own bucket, so nothing is
//   counted twice) and histories are merged, so every device of the same
//   account shows the same totals and the same records.
// GET /api/get-creator-points?stats=true
//   Distribution of creator points across all players (for the level chart).
function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { author, authors, email: rawEmail, stats, history } = req.query;
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!author && !authors && !email && !stats) return res.status(400).json({ error: 'Missing author or stats query' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ points: 0, mocked: true, allScores: [] });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    if (stats === 'true') {
      // Fetch all scores from the zset
      const allData = await redis.zrange('verse_stats:creator_points', 0, -1, { withScores: true });
      // Upstash zrange withScores returns [member1, score1, member2, score2, ...]
      const scores = [];
      for (let i = 1; i < allData.length; i += 2) {
        scores.push(parseFloat(allData[i]) || 0);
      }
      return res.status(200).json({ allScores: scores });
    }

    // Which buckets are "this person": one key in the legacy call, the whole
    // account in the merged call.
    const seed = [author, ...String(authors || '').split(',')].map((s) => String(s || '').trim()).filter(Boolean);
    let keys = Array.from(new Set(seed));
    let mappingDict = null;
    if (email || authors) {
      const [mapping, linked] = await Promise.all([
        redis.hgetall('player_mapping'),
        email ? redis.smembers(identityKey(email)) : Promise.resolve([]),
      ]);
      mappingDict = mapping || {};
      const codesByName = {};
      for (const [code, name] of Object.entries(mappingDict)) {
        if (!codesByName[name]) codesByName[name] = [];
        codesByName[name].push(code);
      }
      // Same ownership rule as get-referees: a code mapped to someone else's
      // name is not this person's bucket, whatever the device remembers.
      keys = expandIdentityKeys([...dropForeignCodes(keys, { mapping: mappingDict, linked: linked || [] }), ...(linked || [])], codesByName);
    }
    if (!keys.length) return res.status(200).json({ points: 0, referralPoints: 0, creatorHistory: [], referralHistory: [] });

    const [ptsList, refList] = await Promise.all([
      Promise.all(keys.map((k) => redis.zscore('verse_stats:creator_points', k))),
      Promise.all(keys.map((k) => redis.zscore('gamification:referrals:alltime', k))),
    ]);
    const sum = (list) => list.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

    let creatorHistory = [];
    let referralHistory = [];

    if (history === 'true') {
      const [cLists, rLists, mappings] = await Promise.all([
        Promise.all(keys.map((k) => redis.lrange(`gamification:history:creator:${k}`, 0, 499))),
        Promise.all(keys.map((k) => redis.lrange(`gamification:history:referral:${k}`, 0, 499))),
        mappingDict ? Promise.resolve(mappingDict) : redis.hgetall('player_mapping'),
      ]);
      const dict = mappings || {};
      const seen = new Set();
      const merge = (lists, resolveName) => {
        const out = [];
        for (const list of lists) {
          for (const raw of list || []) {
            const item = parse(raw);
            if (!item) continue;
            const sig = typeof raw === 'string' ? raw : JSON.stringify(raw);
            if (seen.has(sig)) continue;
            seen.add(sig);
            if (resolveName && item.player && dict[item.player]) item.player = dict[item.player]; // Resolve nickname
            out.push(item);
          }
        }
        return out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 500);
      };
      creatorHistory = merge(cLists, false);
      referralHistory = merge(rLists, true);
    }

    res.status(200).json({
      points: sum(ptsList),
      referralPoints: sum(refList),
      creatorHistory,
      referralHistory,
      keysSearched: keys.length,
      // Every name / code the account was known by, so the client can tell
      // "my old self" apart from other people in the history.
      keys,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
