import { Redis } from '@upstash/redis';
import { partyFetch, PartyError } from './_lib/party.js';
import { grantMilestones, VERSES_PER_REWARD, INVITES_PER_REWARD, QUALIFIED_PASSES } from './_lib/rewards.js';

// Server-verified reward check (贊助獎勵). The client never tells us how many
// verses it passed — we ask the PartyKit garden store, which holds the synced
// garden, and mint at most one reward per (person, milestone).
//   POST { code, email, playerName?, codes?: [personalCode, …prevCodes], kind?: 'verses'|'invites'|'both' }
//   → { success, passedVerses, treesPlanted, qualifiedReferrals, totalReferrals,
//       nextVerses, nextInvites, created: [reward…], throttled?, verified }
// No auth: it only grants what the server verifies, and a caller can at most
// trigger a check for an email that legitimately earned something. One check
// per person per 10 minutes; a throttled call returns the last result.
const CHECK_TTL = 600;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  const kind = ['verses', 'invites'].includes(body.kind) ? body.kind : 'both';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });
  if (!code) return res.status(400).json({ error: 'code required' });
  const codes = Array.from(new Set([code, ...(Array.isArray(body.codes) ? body.codes : [])]
    .map(c => String(c || '').trim()).filter(c => /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(c)))).slice(0, 5);

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ success: true, mocked: true, created: [] });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const lastKey = `rewards:check:last:${email}`;
    const gate = await redis.set(`rewards:check:${email}`, '1', { nx: true, ex: CHECK_TTL });
    const throttled = gate !== 'OK';

    // Throttled calls skip the expensive part (the referee scan) and never
    // grant, but still read the garden so the progress bar shows the live
    // server count instead of a stale snapshot.
    let elig;
    try {
      elig = await partyFetch('/reward-eligibility', { email, playerName: body.playerName || '', inviterCodes: throttled ? [] : codes });
    } catch (e) {
      if (throttled) {
        const last = await redis.get(lastKey);
        const parsed = typeof last === 'string' ? safeJson(last) : (last || {});
        return res.status(200).json({ success: true, throttled: true, created: [], ...parsed });
      }
      // Fail closed: without server truth we grant nothing.
      const status = e instanceof PartyError && e.status ? 502 : 503;
      return res.status(status).json({ error: 'verify_unavailable', detail: e.message });
    }
    if (throttled) {
      const last = await redis.get(lastKey);
      const parsed = typeof last === 'string' ? safeJson(last) : (last || {});
      const passed = (elig.garden && elig.garden.passedVerses) || 0;
      const merged = { ...parsed, passedVerses: passed, treesPlanted: (elig.garden && elig.garden.treesPlanted) || 0, nextVerses: VERSES_PER_REWARD - (passed % VERSES_PER_REWARD), versesPerReward: VERSES_PER_REWARD, invitesPerReward: INVITES_PER_REWARD, qualifiedPasses: QUALIFIED_PASSES };
      await redis.set(lastKey, JSON.stringify(merged), { ex: 86400 });
      // The verses reward needs no scan and is idempotent, so a player who
      // crosses 100 inside the throttle window is still paid on time.
      const created = [];
      const id = elig.identity || {};
      if (kind !== 'invites' && id.emailKind && id.emailKind !== 'none') {
        const g = elig.garden || {};
        const r = await grantMilestones(redis, { code, name: String(body.playerName || id.playerName || '').slice(0, 40), email, kind: 'verses', count: passed, verified: { passedVerses: passed, treesPlanted: g.treesPlanted || 0, activeDays: g.activeDays || 0, accountAgeDays: id.accountAgeDays ?? null, emailKind: id.emailKind } });
        created.push(...r.created);
      }
      return res.status(200).json({ success: true, throttled: true, created, ...merged });
    }
    const identity = elig.identity || {};
    const garden = elig.garden || {};
    const referrals = elig.referrals || { qualified: 0, total: 0 };
    const name = String(body.playerName || identity.playerName || '').slice(0, 40);
    // Region (tw / intl) is the player's choice at claim time, never inferred.
    const region = undefined;

    const verifiedBase = {
      passedVerses: garden.passedVerses || 0,
      treesPlanted: garden.treesPlanted || 0,
      activeDays: garden.activeDays || 0,
      accountAgeDays: identity.accountAgeDays ?? null,
      emailKind: identity.emailKind || 'none',
    };
    const created = [];
    if (kind !== 'invites' && identity.emailKind !== 'none') {
      const r = await grantMilestones(redis, { code, name, email, kind: 'verses', count: verifiedBase.passedVerses, verified: verifiedBase, region });
      created.push(...r.created);
    }
    if (kind !== 'verses' && identity.emailKind !== 'none') {
      const verifiedInv = { ...verifiedBase, qualified: referrals.qualified || 0, totalReferrals: referrals.total || 0, sameDayClusters: referrals.sameDayClusters || 0 };
      const r = await grantMilestones(redis, { code, name, email, kind: 'invites', count: referrals.qualified || 0, verified: verifiedInv, region });
      created.push(...r.created);
    }

    const passed = verifiedBase.passedVerses;
    const qualified = referrals.qualified || 0;
    const result = {
      passedVerses: passed,
      treesPlanted: verifiedBase.treesPlanted,
      qualifiedReferrals: qualified,
      totalReferrals: referrals.total || 0,
      qualifiedPasses: QUALIFIED_PASSES,
      nextVerses: VERSES_PER_REWARD - (passed % VERSES_PER_REWARD),
      nextInvites: INVITES_PER_REWARD - (qualified % INVITES_PER_REWARD),
      versesPerReward: VERSES_PER_REWARD,
      invitesPerReward: INVITES_PER_REWARD,
      checkedAt: new Date().toISOString(),
    };
    await redis.set(lastKey, JSON.stringify(result), { ex: 86400 });
    res.status(200).json({ success: true, created, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
