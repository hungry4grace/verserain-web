import { Redis } from '@upstash/redis';
import { requireAdmin } from './_lib/admins.js';
import { partyFetch } from './_lib/party.js';
import { pushNotify } from './_lib/rewards.js';
import { notifyAdmins, placeSubmittedMessage, placeResubmittedMessage } from './_lib/adminNotify.js';
import { listPools } from './_lib/pools.js';
import {
  listPlaces, getPlace, savePlace, deletePlace, normalizePlaceSubmission, applyAdminAction, publicView,
  countSubmissionsToday, bumpSubmissions, taipeiDay, MAX_SUBMISSIONS_PER_DAY,
  applyOwnerEdit, applyOwnerAction, canOwnerDelete, canAdminDelete, ownerView, REFERRER_CODE_RE,
} from './_lib/places.js';

// Map places (地圖標記): merchants / churches / organisations on the world map.
//   GET                                   public → { places } (approved only, cached)
//   GET ?mine=1&email=                    own submissions with status (self-asserted
//                                         email — it only reveals what that email sent)
//   GET ?all=1&adminEmail=                admin → { places } (everything, with notes)
//   POST { action: 'register', email, sessionKey, place }
//                                         logged-in player → { success, place } (status pending);
//                                         a place.id the same owner already has is treated as owner_update.
//                                         place.referrerCode (optional, the introducer's 10-char referral
//                                         code, any valid code incl. the submitter's own) is checked against
//                                         PartyKit and locked afterwards — only an admin update changes it.
//                                         400 referrer_invalid | referrer_not_found
//   POST { action: 'owner_update', email, sessionKey, placeId, place }
//                                         owner → { success, place, reviewRequired, changed }: phone/hours/
//                                         website/description/photo apply at once; name/address/spot/kind/
//                                         discount/voucher-count changes go back to review (pending)
//   POST { action: 'withdraw'|'relist'|'owner_delete', email, sessionKey, placeId }
//                                         owner → 下架 (status withdrawn: off the map, no new vouchers, open
//                                         vouchers stay redeemable) / 重新上架 (→ pending) / hard delete
//                                         (only while stats.issued is 0, else 400 has_vouchers)
//   Owner edits / withdraw / relist / delete never count toward the daily cap.
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
      return res.status(200).json({ places: publicView(await listPlaces(redis), { poolByPlace: await approvedPoolsByPlace(redis) }) });
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    const action = String(body.action || '');

    if (action === 'register') return register(req, res, redis, body);
    if (['owner_update', 'withdraw', 'relist', 'owner_delete'].includes(action)) return ownerAction(req, res, redis, body, action);

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
      if (body.place && body.place.sponsorId !== undefined) place.sponsorId = String(body.place.sponsorId || '').slice(0, 40);
      if (body.place && body.place.referrerCode !== undefined) {
        const ref = await resolveReferrer(body.place.referrerCode);
        if (ref.error) return res.status(ref.status).json({ error: ref.error });
        place.referrerCode = ref.code;
        place.referrerName = ref.name;
      }
      await savePlace(redis, place);
    } else if (['approve', 'reject', 'hide', 'unhide', 'update', 'delete'].includes(action)) {
      const placeId = String(body.placeId || '').trim();
      place = placeId ? await getPlace(redis, placeId) : null;
      if (!place) return res.status(404).json({ error: 'Place not found' });
      if (action === 'delete') {
        if (!canAdminDelete(place)) return res.status(400).json({ error: 'only rejected, hidden or withdrawn places can be deleted' });
        await deletePlace(redis, placeId);
      } else {
        try {
          place = applyAdminAction(place, action, { adminEmail, now, patch: body.patch });
        } catch (e) {
          return res.status(400).json({ error: e.message });
        }
        if (action === 'update' && place.referrerCode && !place.referrerName) {
          const ref = await resolveReferrer(place.referrerCode);
          if (ref.error) return res.status(ref.status).json({ error: ref.error });
          place.referrerName = ref.name;
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

// Login check shared by every player-side action: PartyKit vouches for the
// (email, sessionKey) pair; we never trust the client's own claim of who it
// is. Sends the error itself and returns null when the caller must stop.
async function verifyLogin(res, body) {
  const email = String(body.email || '').trim().toLowerCase();
  const sessionKey = String(body.sessionKey || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'login_required' }); return null; }
  if (!sessionKey) { res.status(400).json({ error: 'login_required' }); return null; }
  let elig;
  try {
    elig = await partyFetch('/reward-eligibility', { email, sessionKey });
  } catch {
    res.status(503).json({ error: 'verify_unavailable' });
    return null;
  }
  const identity = (elig && elig.identity) || {};
  if (identity.sessionValid !== true) { res.status(401).json({ error: 'session_invalid' }); return null; }
  return { email, identity };
}

// …plus "and this place is theirs" for the self-service actions.
async function verifyOwner(res, redis, body) {
  const login = await verifyLogin(res, body);
  if (!login) return null;
  const placeId = String(body.placeId || '').trim();
  const place = placeId ? await getPlace(redis, placeId) : null;
  if (!place) { res.status(404).json({ error: 'place_not_found' }); return null; }
  if (String(place.ownerEmail || '').toLowerCase() !== login.email) { res.status(403).json({ error: 'not_owner' }); return null; }
  return { ...login, place };
}

const whoIs = (identity, email) => identity.playerName || email;

// { orgPlaceId → { id, name } } for the approved charity pools; fails soft so the
// map never goes blank because of the pools table.
async function approvedPoolsByPlace(redis) {
  try {
    const out = {};
    for (const p of await listPools(redis)) if (p.status === 'approved' && p.orgPlaceId) out[p.orgPlaceId] = { id: p.id, name: p.name };
    return out;
  } catch { return {}; }
}

// Turn a referral code into { code, name } through PartyKit's account-true
// lookup, or { error, status } when the code is malformed / unknown / the
// lookup is down. Empty input is simply "no referrer".
async function resolveReferrer(raw) {
  const code = String(raw || '').trim();
  if (!code) return { code: '', name: '' };
  if (!REFERRER_CODE_RE.test(code)) return { error: 'referrer_invalid', status: 400 };
  let owner;
  try {
    owner = await partyFetch('/code-owner', { code });
  } catch {
    return { error: 'verify_unavailable', status: 503 };
  }
  if (!owner || !owner.email) return { error: 'referrer_not_found', status: 400 };
  return { code, name: String(owner.playerName || '').trim().slice(0, 40) };
}

// A player registers a place. A place.id this owner already holds (a draft
// re-sent from another device, an old client) is an edit, not a new listing:
// it goes through the owner-update rules and never burns the daily cap.
async function register(req, res, redis, body) {
  const login = await verifyLogin(res, body);
  if (!login) return undefined;
  const { email, identity } = login;

  const input = body.place || {};
  const existing = input.id ? await getPlace(redis, String(input.id)) : null;
  if (existing && existing.ownerEmail !== email) return res.status(409).json({ error: 'place_taken' });
  if (existing) return ownerUpdate(res, redis, { email, identity, place: existing }, input);

  const day = taipeiDay();
  if ((await countSubmissionsToday(redis, email, day)) >= MAX_SUBMISSIONS_PER_DAY) return res.status(429).json({ error: 'daily_limit' });

  let place;
  try {
    place = normalizePlaceSubmission(input, { ownerEmail: email, ownerCode: identity.personalCode || '' });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  // The introducer (推薦者), checked once here and locked from then on.
  const ref = await resolveReferrer(input.referrerCode);
  if (ref.error) return res.status(ref.status).json({ error: ref.error });
  place.referrerCode = ref.code;
  place.referrerName = ref.name;
  place.status = 'pending';
  await savePlace(redis, place);
  await bumpSubmissions(redis, email, day);
  // Tell the admins there is something to review (🔔 inbox + phone push);
  // before this the only way to notice a new registration was to open the
  // admin page and look. Best-effort — never fails the registration.
  try { await notifyAdmins(redis, placeSubmittedMessage(place, whoIs(identity, email))); } catch { /* best-effort */ }
  return res.status(200).json({ success: true, place: ownerView(place) });
}

async function ownerUpdate(res, redis, { email, identity, place: existing }, input) {
  let next;
  try {
    next = normalizePlaceSubmission({ ...input, id: existing.id }, { ownerEmail: email, ownerCode: existing.ownerCode || identity.personalCode || '', existing });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const { place, reviewRequired, changed } = applyOwnerEdit(existing, next, { now: new Date() });
  await savePlace(redis, place);
  if (reviewRequired) {
    try { await notifyAdmins(redis, placeResubmittedMessage(place, whoIs(identity, email), changed.major)); } catch { /* best-effort */ }
  }
  return res.status(200).json({ success: true, place: ownerView(place), reviewRequired, changed });
}

// Owner self-service: edit (see ownerUpdate), 下架, 重新上架, delete.
async function ownerAction(req, res, redis, body, action) {
  const owner = await verifyOwner(res, redis, body);
  if (!owner) return undefined;
  const { email, identity, place } = owner;
  if (action === 'owner_update') return ownerUpdate(res, redis, owner, body.place || {});
  if (action === 'owner_delete') {
    if (!canOwnerDelete(place)) return res.status(400).json({ error: 'has_vouchers' });
    await deletePlace(redis, place.id);
    return res.status(200).json({ success: true, deleted: place.id });
  }
  let updated;
  try {
    updated = applyOwnerAction(place, action, { now: new Date() });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  await savePlace(redis, updated);
  if (action === 'relist') {
    try { await notifyAdmins(redis, placeSubmittedMessage(updated, whoIs(identity, email))); } catch { /* best-effort */ }
  }
  return res.status(200).json({ success: true, place: ownerView(updated) });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
