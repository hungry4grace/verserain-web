// Map places (地圖標記): merchants offering a discount to VerseRain players,
// churches, and other organisations that want to appear on the world map.
//
// A logged-in player submits a place; it sits in `pending` until an admin
// approves it, and only `approved` places are ever served publicly. Admins can
// also hide / reject / edit a place, or create one directly as approved.
//
// Redis keys:
//   map:places                              HASH  placeId → JSON place
//   places:submit:<email>:<YYYY-MM-DD>      STRING daily submission counter (EX 86400)
//
// Every function takes the Upstash client so the logic is testable with a stub.

export const PLACES_KEY = 'map:places';

export const KINDS = ['merchant', 'church', 'org'];
// 'withdrawn' = the owner took it off the map themselves (下架); only 重新上架
// (→ pending) or an admin delete moves it on. Must be listed here: the
// validator resets any status it does not know back to 'pending'.
export const STATUSES = ['pending', 'approved', 'hidden', 'rejected', 'withdrawn'];
// Owner edits: these fields change what a customer sees on the map / what a
// voucher is worth, so changing them sends the place back through review…
export const MAJOR_FIELDS = ['kind', 'name', 'address', 'lat', 'lng', 'discountPct', 'dailyPerPerson'];
// …while these take effect at once and leave the status alone.
export const MINOR_FIELDS = ['phone', 'hours', 'website', 'description', 'message', 'photoAssetId', 'photoMime'];
export const PLACE_ID_RE = /^pl_[a-z0-9]{8,20}$/;
// A player's referral (personal) code — same alphabet as src/party/referral.js.
export const REFERRER_CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;
export const ASSET_ID_RE = /^a_[A-Za-z0-9]{6,20}$/;
export const PHOTO_MIMES = ['image/webp', 'image/jpeg', 'image/png'];
export const DISCOUNT_MIN = 5;
export const DISCOUNT_MAX = 20;
export const DEFAULT_DAILY_CAP_NTD = 2000;
export const MAX_SUBMISSIONS_PER_DAY = 3;

// Fields an admin may change through the `update` action (everything a
// submitter can set, plus the admin-only note / cap / sponsor link).
const ADMIN_PATCH_FIELDS = ['name', 'address', 'lat', 'lng', 'discountPct', 'description', 'message', 'photoAssetId', 'photoMime', 'phone', 'website', 'hours', 'dailyCapNTD', 'dailyPerPerson', 'note', 'kind', 'sponsorId', 'referrerCode'];
// Vouchers one person may open at this shop per day; 0 = unlimited. Mirrors
// api/_lib/points.js (kept literal here so the validator stays dependency-free).
export const DEFAULT_DAILY_PER_PERSON = 3;
export const MAX_DAILY_PER_PERSON = 20;

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export function newPlaceId(now = Date.now()) {
  return `pl_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// 'YYYY-MM-DD' in Asia/Taipei — the day a submission counter is keyed by.
export function taipeiDay(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

function coord(v, name, limit) {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || !Number.isFinite(n)) throw new Error(`${name} must be a number`);
  if (n < -limit || n > limit) throw new Error(`${name} must be between -${limit} and ${limit}`);
  return Math.round(n * 1e5) / 1e5;
}

// Validate + normalise a submitted place. Throws Error(message) on bad input;
// the message is safe to show the submitter. `existing` is the stored record
// on an edit — identity, timestamps, status and admin fields carry over.
export function normalizePlaceSubmission(input, { ownerEmail, ownerCode = '', now = new Date(), existing = null } = {}) {
  const src = input || {};
  const ex = existing || null;
  const kind = String(src.kind || (ex && ex.kind) || '').trim();
  if (!KINDS.includes(kind)) throw new Error(`kind must be ${KINDS.join('|')}`);
  const name = clip(src.name, 60);
  if (!name) throw new Error('name required');
  const address = clip(src.address, 160);
  if (!address) throw new Error('address required');
  const lat = coord(src.lat, 'lat', 90);
  const lng = coord(src.lng, 'lng', 180);
  let discountPct = 0;
  let dailyPerPerson = DEFAULT_DAILY_PER_PERSON;
  if (kind === 'merchant') {
    const d = Number(src.discountPct);
    if (!Number.isInteger(d) || d < DISCOUNT_MIN || d > DISCOUNT_MAX) throw new Error(`discountPct must be an integer between ${DISCOUNT_MIN} and ${DISCOUNT_MAX}`);
    discountPct = d;
    const rawPer = src.dailyPerPerson !== undefined && src.dailyPerPerson !== '' && src.dailyPerPerson !== null ? src.dailyPerPerson : (ex && ex.dailyPerPerson !== undefined ? ex.dailyPerPerson : DEFAULT_DAILY_PER_PERSON);
    const n = Number(rawPer);
    if (!Number.isInteger(n) || n < 0 || n > MAX_DAILY_PER_PERSON) throw new Error(`dailyPerPerson must be an integer between 0 and ${MAX_DAILY_PER_PERSON} (0 = unlimited)`);
    dailyPerPerson = n;
  }
  const photoAssetId = clip(src.photoAssetId, 40);
  if (photoAssetId && !ASSET_ID_RE.test(photoAssetId)) throw new Error('photoAssetId is not valid');
  const photoMime = clip(src.photoMime, 40);
  if (photoMime && !PHOTO_MIMES.includes(photoMime)) throw new Error(`photoMime must be ${PHOTO_MIMES.join('|')}`);
  if (photoAssetId && !photoMime) throw new Error('photoMime required with photoAssetId');
  const website = clip(src.website, 120);
  if (website && !/^https?:\/\//i.test(website)) throw new Error('website must start with http:// or https://');
  const rawId = clip(src.id, 40);
  const id = PLACE_ID_RE.test(rawId) ? rawId : ((ex && ex.id) || newPlaceId(now.getTime()));
  let dailyCapNTD = ex && ex.dailyCapNTD !== undefined ? Number(ex.dailyCapNTD) : DEFAULT_DAILY_CAP_NTD;
  if (!Number.isInteger(dailyCapNTD) || dailyCapNTD <= 0) dailyCapNTD = DEFAULT_DAILY_CAP_NTD;
  return {
    id,
    kind,
    name,
    address,
    lat,
    lng,
    discountPct,
    dailyPerPerson,
    description: clip(src.description, 300),
    message: clip(src.message, 200),
    photoAssetId: photoAssetId ? photoAssetId : '',
    photoMime: photoAssetId ? photoMime : '',
    phone: clip(src.phone, 30),
    website,
    hours: clip(src.hours, 80),
    ownerEmail: String(ownerEmail || (ex && ex.ownerEmail) || '').trim().toLowerCase(),
    ownerCode: String(ownerCode || (ex && ex.ownerCode) || '').trim(),
    // Admin-only: never taken from the submission (a player could otherwise
    // link their shop to a sponsor record); admins set it via applyAdminAction.
    sponsorId: clip(ex && ex.sponsorId, 40),
    // Who introduced this place (earns 2.5% of every redemption). Set once by
    // the registering route, afterwards admin-only — never from an owner edit.
    referrerCode: clip(ex && ex.referrerCode, 10),
    referrerName: clip(ex && ex.referrerName, 40),
    dailyCapNTD,
    status: (ex && STATUSES.includes(ex.status)) ? ex.status : 'pending',
    createdAt: (ex && ex.createdAt) || now.toISOString(),
    updatedAt: now.toISOString(),
    approvedAt: (ex && ex.approvedAt) || null,
    approvedBy: (ex && ex.approvedBy) || '',
    note: (ex && ex.note) || '',
    stats: (ex && ex.stats) || { issued: 0, used: 0, usedNTD: 0 },
  };
}

// Pure: apply an admin action and return the updated copy. Throws on an
// unknown action or (for `update`) an invalid patch.
export function applyAdminAction(place, action, { adminEmail = '', now = new Date(), patch } = {}) {
  const admin = String(adminEmail || '').trim().toLowerCase();
  const at = now.toISOString();
  switch (action) {
    case 'approve':
      return { ...place, status: 'approved', approvedAt: at, approvedBy: admin, updatedAt: at };
    case 'reject':
      return { ...place, status: 'rejected', updatedAt: at };
    case 'hide':
      return { ...place, status: 'hidden', updatedAt: at };
    case 'unhide':
      return { ...place, status: 'approved', updatedAt: at };
    case 'update': {
      const p = patch || {};
      const merged = { ...place };
      for (const f of ADMIN_PATCH_FIELDS) if (p[f] !== undefined) merged[f] = p[f];
      // Re-validate the merged record against the stored one so identity,
      // owner, timestamps and status all carry over; then layer on the
      // admin-only fields the validator deliberately ignores from input.
      const next = normalizePlaceSubmission(merged, { ownerEmail: place.ownerEmail, ownerCode: place.ownerCode, now, existing: place });
      if (p.dailyCapNTD !== undefined) {
        const cap = Number(p.dailyCapNTD);
        if (!Number.isInteger(cap) || cap <= 0) throw new Error('dailyCapNTD must be a positive integer');
        next.dailyCapNTD = cap;
      }
      if (p.note !== undefined) next.note = clip(p.note, 200);
      if (p.sponsorId !== undefined) next.sponsorId = clip(p.sponsorId, 40);
      if (p.referrerCode !== undefined) {
        const code = clip(p.referrerCode, 10);
        if (code && !REFERRER_CODE_RE.test(code)) throw new Error('referrerCode must be a 10-character referral code');
        next.referrerCode = code;
        // The route re-resolves the name for a new code; an empty code clears both.
        if (code !== clip(place.referrerCode, 10)) next.referrerName = '';
      }
      next.status = place.status;
      return next;
    }
    default:
      throw new Error('action must be approve|reject|hide|unhide|update');
  }
}

// ── Owner self-service ──────────────────────────────────────────────────────
const normStr = (v) => String(v ?? '').trim();
const fieldValue = (place, f) => {
  if (f === 'lat' || f === 'lng') return Number(place[f]);
  if (f === 'discountPct') return place.kind === 'merchant' ? Number(place.discountPct) || 0 : 0;
  if (f === 'dailyPerPerson') return place[f] === undefined || place[f] === null || place[f] === '' ? DEFAULT_DAILY_PER_PERSON : Number(place[f]);
  return normStr(place[f]);
};
const sameValue = (a, b) => (typeof a === 'number' && typeof b === 'number') ? (Number.isNaN(a) && Number.isNaN(b)) || a === b : a === b;

// Pure: which fields an owner's edit touched, split into the ones that need
// a fresh review (MAJOR) and the ones that don't (MINOR). Both records are
// expected to be normalised (lat/lng rounded, strings clipped).
export function classifyOwnerEdit(existing, next) {
  const changed = (fields) => fields.filter((f) => !sameValue(fieldValue(existing || {}, f), fieldValue(next || {}, f)));
  return { major: changed(MAJOR_FIELDS), minor: changed(MINOR_FIELDS) };
}

// Pure: the record after an owner edit. Minor-only edits keep the status
// (approved stays on the map); a major edit goes back to 'pending'; a
// rejected place is re-submitted by any edit; a withdrawn place stays
// withdrawn until the owner re-lists it. Identity, owner, timestamps, stats,
// admin note / cap / sponsor all carry over from `existing` (the validator
// already did that when `next` was built with { existing }).
export function applyOwnerEdit(existing, next, { now = new Date() } = {}) {
  const changed = classifyOwnerEdit(existing, next);
  const major = changed.major.length > 0;
  let status = existing.status;
  if (existing.status === 'withdrawn') status = 'withdrawn';
  else if (existing.status === 'rejected' || major) status = 'pending';
  const place = { ...next, status, updatedAt: now.toISOString() };
  if (status === 'pending' && existing.status !== 'pending') { place.approvedAt = null; place.approvedBy = ''; }
  const reviewRequired = status === 'pending' && (major || existing.status !== 'pending');
  return { place, reviewRequired, changed };
}

// Pure: owner actions on a stored record. Throws on a transition that makes
// no sense so the route can answer 400 with the message.
export function applyOwnerAction(place, action, { now = new Date() } = {}) {
  const at = now.toISOString();
  if (action === 'withdraw') {
    if (!['pending', 'approved', 'hidden'].includes(place.status)) throw new Error(`a ${place.status} place cannot be withdrawn`);
    return { ...place, status: 'withdrawn', withdrawnAt: at, updatedAt: at };
  }
  if (action === 'relist') {
    if (place.status !== 'withdrawn') throw new Error('only a withdrawn place can be re-listed');
    return { ...place, status: 'pending', withdrawnAt: null, approvedAt: null, approvedBy: '', updatedAt: at };
  }
  throw new Error('action must be withdraw|relist');
}

// An owner may hard-delete only a place that never issued a voucher: after
// that, vouchers, the ledger and the stats all point at the record.
export function canOwnerDelete(place) {
  const issued = place && place.stats ? Number(place.stats.issued) : 0;
  return !(issued > 0);
}
export function canAdminDelete(place) {
  return !!place && ['rejected', 'hidden', 'withdrawn'].includes(place.status);
}
// What the owner gets back: everything but the admin's internal note.
export function ownerView(place) {
  if (!place) return place;
  const { note, ...rest } = place; // eslint-disable-line no-unused-vars
  return rest;
}

// Pure: what the public map may show — approved places only, no owner or
// admin fields.
export function publicView(places) {
  return (places || [])
    .filter((p) => p && p.status === 'approved')
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      discountPct: p.discountPct || 0,
      dailyPerPerson: Number.isInteger(p.dailyPerPerson) ? p.dailyPerPerson : DEFAULT_DAILY_PER_PERSON,
      description: p.description || '',
      message: p.message || '',
      photoAssetId: p.photoAssetId || '',
      photoMime: p.photoMime || '',
      phone: p.phone || '',
      website: p.website || '',
      hours: p.hours || '',
    }));
}

export async function listPlaces(redis) {
  const rows = (await redis.hgetall(PLACES_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function getPlace(redis, id) {
  const raw = await redis.hget(PLACES_KEY, id);
  return raw ? parse(raw) : null;
}

export async function savePlace(redis, place) {
  await redis.hset(PLACES_KEY, { [place.id]: JSON.stringify(place) });
  return place;
}

export async function deletePlace(redis, id) {
  await redis.hdel(PLACES_KEY, id);
}

const submitKey = (email, day) => `places:submit:${String(email || '').trim().toLowerCase()}:${day}`;

export async function countSubmissionsToday(redis, email, day = taipeiDay()) {
  const n = await redis.get(submitKey(email, day));
  return Number(n) || 0;
}

export async function bumpSubmissions(redis, email, day = taipeiDay()) {
  const key = submitKey(email, day);
  const n = await redis.incr(key);
  await redis.expire(key, 86400);
  return Number(n) || 0;
}
