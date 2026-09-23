import { Redis } from '@upstash/redis';

// A room badge on the map must mean "a match is going on right now". The
// location record only remembers the room a player LAST reported, so before
// showing a badge we ask that PartyKit room whether anyone is still connected
// (answers cached briefly; an unknown or empty room drops the badge).
const PARTY_ROOMS_BASE = (process.env.PARTY_BASE || 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db').replace(/\/+$/, '').replace(/\/global-auth-db$/, '');
const ROOM_LIVE_TTL_SEC = 20;
async function liveRooms(redis, roomIds) {
  const out = {};
  await Promise.all(roomIds.map(async (id) => {
    const key = `map:roomlive:${id}`;
    try {
      const cached = await redis.get(key);
      if (cached !== null && cached !== undefined) { out[id] = String(cached) === '1'; return; }
    } catch { /* fall through */ }
    let alive = false;
    try {
      const r = await fetch(`${PARTY_ROOMS_BASE}/${encodeURIComponent(id)}/status`);
      const d = r.ok ? await r.json().catch(() => null) : null;
      alive = !!(d && Number(d.connected) > 0);
    } catch { alive = false; }
    out[id] = alive;
    try { await redis.set(key, alive ? '1' : '0', { ex: ROOM_LIVE_TTL_SEC }); } catch { /* best effort */ }
  }));
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json([]);

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    const playerNames = await redis.smembers('map:players');
    if (!playerNames || playerNames.length === 0) return res.status(200).json([]);

    const pipeline = redis.pipeline();
    for (const name of playerNames) {
      pipeline.hgetall(`map:player:${name}`);
    }
    const results = await pipeline.exec();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const players = results
      .filter(r => r && r.lat && r.lng && !uuidRegex.test(r.name))
      .map(r => {
        const updatedAt = r.updatedAt ? parseInt(r.updatedAt) : 0;
        // If the player's last update was more than 15 minutes ago, they are no longer in an active room
        const isStale = (Date.now() - updatedAt) > 15 * 60 * 1000;
        return {
          name: r.name,
          score: parseFloat(r.score || 0),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lng),
          country: r.country || '',
          city: r.city || '',
          verseRef: r.verseRef || '',
          roomId: isStale ? null : (r.roomId || null),
          updatedAt
        };
      });

    const roomIds = Array.from(new Set(players.map((p) => p.roomId).filter(Boolean)));
    if (roomIds.length) {
      const alive = await liveRooms(redis, roomIds);
      for (const p of players) if (p.roomId && !alive[p.roomId]) p.roomId = null;
    }

    res.status(200).json(players);
  } catch (error) {
    console.error('Failed to get player map', error);
    res.status(500).json({ error: error.message });
  }
}
