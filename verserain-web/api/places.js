import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { partyFetch } from './_lib/party.js';
import { pushNotify } from './_lib/rewards.js';
import { notifyAdmins, placeSubmittedMessage } from './_lib/adminNotify.js';
import {
  listPlaces, getPlace, savePlace, deletePlace, normalizePlaceSubmission, applyAdminAction, publicView,
  countSubmissionsToday, bumpSubmissions, taipeiDay, MAX_SUBMISSIONS_PER_DAY,
} from './_lib/places.js';

// Map places (地圖標記): merchants / churches / organisations on the world map.
//   GET                                   public → { places } (approved only, cached)
//   GET ?mine=1&email=                    own submissions with status (self-asserted
//                                         email — it only reveals what that email sent)
//   GET ?all=1&adminEmail=                admin → { places } (everything, with notes)
//   POST { action: 'register', email, sessionKey, place }
//                                         logged-in player → { success, place } (status pending)
//   POST { action: 'approve'|'reject'|'hide'|'unhide'|'update'|'delete', adminEmail, placeId, patch? }
//   POST { action: 'create', adminEmail, place }   admin → approved straight away
// A submission is only accepted when PartyKit confirms the (email, sessionKey)
// pair is a live login, and each email may submit at most 3 places a day.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.status(200).json({ places: [], mocked: true });

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.all) {
        const denied = requireAdmin(req, q.adminEmail);
        if (denied) return res.status(denied.status).json({ error: denied.error });
        return res.status(200).json({ places: await listPlaces(redis) });
      }
      if (q.mine) {
        const email = String(q.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'email required' });
        const mine = (await listPlaces(redis)).filter((p) => p.ownerEmail === email).map((p) => {
          const { note, ...rest } = p; // eslint-disable-line no-unused-vars
          return rest;
        });
        return res.status(200).json({ places: mine });
      }
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
      return res.status(200).json({ places: publicView(await listPlaces(redis)) });
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const action = String(body.action || '');

    if (action === 'register') return register(req, res, redis, body);

    // Everything below is admin-only.
    const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
    const denied = requireAdmin(req, adminEmail);
    if (denied) return res.status(denied.status).json({ error: denied.error });
    const now = new Date();

    let place;
    if (action === 'create') {
      try {
        place = normalizePlaceSubmission(body.place, { ownerEmail: adminEmail, now });
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
      place.status = 'approved';
      place.approvedAt = now.toISOString();
      place.approvedBy = adminEmail;
      await savePlace(redis, place);
    } else if (['approve', 'reject', 'hide', 'unhide', 'update', 'delete'].includes(action)) {
      const placeId = String(body.placeId || '').trim();
      place = placeId ? await getPlace(redis, placeId) : null;
      if (!place) return res.status(404).json({ error: 'Place not found' });
      if (action === 'delete') {
        if (!['rejected', 'hidden'].includes(place.status)) return res.status(400).json({ error: 'only rejected or hidden places can be deleted' });
        await deletePlace(redis, placeId);
      } else {
        try {
          place = applyAdminAction(place, action, { adminEmail, now, patch: body.patch });
        } catch (e) {
          return res.status(400).json({ error: e.message });
        }
        await savePlace(redis, place);
        if (action === 'approve' && place.ownerCode) {
          try { await pushNotify(redis, place.ownerCode, { kind: 'place_approved', placeId: place.id, name: place.name }); } catch { /* inbox is best-effort */ }
        }
      }
    } else {
      return res.status(400).json({ error: 'action must be register|create|approve|reject|hide|unhide|update|delete' });
    }
    res.status(200).json({ success: true, place, places: await listPlaces(redis) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// A player registers a place. PartyKit vouches for the login; we never trust
// the client's own claim of who it is.
async function register(req, res, redis, body) {
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'login_required' });
  if (!sessionKey) return res.status(400).json({ error: 'login_required' });

  let elig;
  try {
    elig = await partyFetch('/reward-eligibility', { email, sessionKey });
  } catch {
    return res.status(503).json({ error: 'verify_unavailable' });
  }
  const identity = (elig && elig.identity) || {};
  if (identity.sessionValid !== true) return res.status(401).json({ error: 'session_invalid' });

  const day = taipeiDay();
  if ((await countSubmissionsToday(redis, email, day)) >= MAX_SUBMISSIONS_PER_DAY) return res.status(429).json({ error: 'daily_limit' });

  const input = body.place || {};
  const existing = input.id ? await getPlace(redis, String(input.id)) : null;
  if (existing && existing.ownerEmail !== email) return res.status(409).json({ error: 'place_taken' });

  let place;
  try {
    place = normalizePlaceSubmission(input, { ownerEmail: email, ownerCode: identity.personalCode || '', existing });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  // Every (re)submission goes back through review.
  place.status = 'pending';
  await savePlace(redis, place);
  await bumpSubmissions(redis, email, day);
  // Tell the admins there is something to review (🔔 inbox + phone push);
  // before this the only way to notice a new registration was to open the
  // admin page and look. Best-effort — never fails the registration.
  try { await notifyAdmins(redis, placeSubmittedMessage(place, identity.playerName || email)); } catch { /* best-effort */ }
  return res.status(200).json({ success: true, place });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
