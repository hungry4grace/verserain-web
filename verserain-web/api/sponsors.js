import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { listRewards } from './_lib/rewards.js';
import { listSponsors, getSponsor, saveSponsor, normalizeSponsor, poolStats, publicView, normalizeChurchCode } from './_lib/sponsors.js';
import { CATALOG, DEFAULT_VALUE } from './_lib/rewardCatalog.js';

// Sponsor pool (贊助池).
//   GET ?church=CODE                        public → { sponsors (anonymised), pool, catalog, defaults }
//                                           `church` marks the viewer's own church pool (mine: true)
//   POST { adminEmail, action: 'upsert', sponsor }     admin → { success, sponsor, pool }
//   POST { adminEmail, action: 'deactivate' | 'activate', sponsorId }
// Money is received off-platform by the church / non-profit; this is only the
// ledger the public page and the reward admin read from.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ sponsors: [], pool: { byCurrency: {}, bySponsor: {} }, catalog: CATALOG, defaults: DEFAULT_VALUE, mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    if (req.method === 'GET') {
      const [sponsors, rewards] = await Promise.all([listSponsors(redis), listRewards(redis)]);
      const pool = poolStats(sponsors, rewards);
      const church = normalizeChurchCode(req.query && req.query.church);
      if (!church) res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      // Per-pool remaining is public (it is what the wall shows); nothing else
      // about a sponsor leaks through bySponsor.
      const bySponsor = Object.fromEntries(Object.entries(pool.bySponsor).map(([id, v]) => [id, { remaining: v.remaining }]));
      return res.status(200).json({
        sponsors: publicView(sponsors, church),
        pool: { byCurrency: pool.byCurrency, bySponsor },
        catalog: CATALOG,
        defaults: DEFAULT_VALUE,
      });
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const denied = requireAdmin(req, body.adminEmail);
    if (denied) return res.status(denied.status).json({ error: denied.error });

    let sponsor;
    if (body.action === 'upsert') {
      const existing = body.sponsor && body.sponsor.id ? await getSponsor(redis, String(body.sponsor.id)) : null;
      try {
        sponsor = normalizeSponsor(body.sponsor, { recordedBy: body.adminEmail, existing });
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    } else if (body.action === 'deactivate' || body.action === 'activate') {
      sponsor = await getSponsor(redis, String(body.sponsorId || ''));
      if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });
      sponsor.active = body.action === 'activate';
      sponsor.updatedAt = new Date().toISOString();
    } else {
      return res.status(400).json({ error: 'action must be upsert|deactivate|activate' });
    }
    await saveSponsor(redis, sponsor);
    const [sponsors, rewards] = await Promise.all([listSponsors(redis), listRewards(redis)]);
    res.status(200).json({ success: true, sponsor, sponsors, pool: poolStats(sponsors, rewards) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
