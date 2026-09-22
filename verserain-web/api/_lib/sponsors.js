// Sponsor ledger for the sponsored-rewards programme (贊助獎勵計劃).
//
// Money never touches the app: a church / non-profit receives the gift and
// issues the receipt, and an admin records the entry here. What the app adds is
// transparency — a public thank-you wall and a live "how much is left" figure
// — and bookkeeping: every reward marked sent is debited from one sponsor pool.
//
// Balances are derived (raised − value of rewards sent against the pool), never
// stored, so the ledger and the reward ledger can't drift apart.
//
// Redis keys:
//   rewards:sponsors    HASH  sponsorId → JSON sponsor
//
// Every function takes the Upstash client so the logic is testable with a stub.
import { isValidCurrency, isValidRegion } from './rewardCatalog.js';

export const SPONSORS_KEY = 'rewards:sponsors';

function parse(s) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
}

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

// A pool is either open to everyone or restricted to one church's members.
// The church hands its code to members like a Wi-Fi password; the code is
// never shown publicly, only the church's display name is.
export const SCOPES = ['open', 'church'];
export const CHURCH_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
export const normalizeChurchCode = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '-');

export function newSponsorId(now = Date.now()) {
  return `sp_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Validate + normalise an admin-submitted sponsor. Throws Error(message) on
// bad input; the message is safe to show the admin.
export function normalizeSponsor(input, { recordedBy = '', now = new Date(), existing = null } = {}) {
  const src = input || {};
  const displayName = clip(src.displayName, 60);
  if (!displayName) throw new Error('displayName required');
  const amount = Number(src.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be a positive number');
  const currency = String(src.currency || (existing && existing.currency) || 'TWD').toUpperCase();
  if (!isValidCurrency(currency)) throw new Error('currency must be TWD or USD');
  const region = String(src.region || (existing && existing.region) || (currency === 'USD' ? 'intl' : 'tw'));
  if (!isValidRegion(region)) throw new Error('region must be tw or intl');
  let receivedAt = clip(src.receivedAt, 30);
  if (receivedAt && Number.isNaN(Date.parse(receivedAt))) throw new Error('receivedAt must be a date');
  if (!receivedAt) receivedAt = (existing && existing.receivedAt) || now.toISOString().slice(0, 10);
  const scope = SCOPES.includes(src.scope) ? src.scope : ((existing && existing.scope) || 'open');
  let churchCode = '', churchName = '';
  if (scope === 'church') {
    churchCode = normalizeChurchCode(src.churchCode || (existing && existing.churchCode));
    if (!CHURCH_CODE_RE.test(churchCode)) throw new Error('churchCode must be 3-20 letters, digits or dashes');
    churchName = clip(src.churchName || (existing && existing.churchName) || displayName, 60);
  }
  return {
    id: (existing && existing.id) || clip(src.id, 40) || newSponsorId(now.getTime()),
    displayName,
    scope,
    churchCode,
    churchName,
    anonymous: !!src.anonymous,
    showAmount: src.showAmount === undefined ? !!(existing && existing.showAmount) : !!src.showAmount,
    amount: Math.round(amount),
    currency,
    region,
    message: clip(src.message, 200),
    receivedAt,
    note: clip(src.note, 200),
    active: src.active === undefined ? (existing ? existing.active !== false : true) : !!src.active,
    createdAt: (existing && existing.createdAt) || now.toISOString(),
    updatedAt: now.toISOString(),
    recordedBy: (existing && existing.recordedBy) || String(recordedBy || '').toLowerCase(),
  };
}

export async function listSponsors(redis) {
  const rows = (await redis.hgetall(SPONSORS_KEY)) || {};
  return Object.values(rows).map(parse).filter(Boolean)
    .sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function getSponsor(redis, id) {
  const raw = await redis.hget(SPONSORS_KEY, id);
  return raw ? parse(raw) : null;
}

export async function saveSponsor(redis, sponsor) {
  await redis.hset(SPONSORS_KEY, { [sponsor.id]: JSON.stringify(sponsor) });
  return sponsor;
}

// Value of a sent reward in its own currency (0 when the admin recorded no
// voucher, e.g. legacy rows).
const sentValue = (r) => (r && r.status === 'sent' ? Number(r.voucherValue) || 0 : 0);
const rewardCurrency = (r) => (r && (r.voucherCurrency || (r.region === 'intl' ? 'USD' : 'TWD'))) || 'TWD';

// Pure: per-currency totals plus per-sponsor spend/remaining.
//   byCurrency: { TWD: { raised, sentValue, sentCount, pendingCount, remaining }, USD: {...} }
//   bySponsor:  { [id]: { spent, remaining } }
export function poolStats(sponsors, rewards) {
  const byCurrency = {};
  const cur = (c) => (byCurrency[c] = byCurrency[c] || { raised: 0, sentValue: 0, sentCount: 0, pendingCount: 0, remaining: 0 });
  const bySponsor = {};
  for (const s of sponsors || []) {
    if (!s || s.active === false) continue;
    cur(s.currency).raised += Number(s.amount) || 0;
    bySponsor[s.id] = { spent: 0, remaining: Number(s.amount) || 0 };
  }
  for (const r of rewards || []) {
    if (!r) continue;
    const c = rewardCurrency(r);
    if (r.status === 'sent') {
      const v = sentValue(r);
      cur(c).sentValue += v;
      cur(c).sentCount += 1;
      if (r.poolId && bySponsor[r.poolId]) {
        bySponsor[r.poolId].spent += v;
        bySponsor[r.poolId].remaining -= v;
      }
    } else if (r.status === 'pending' || r.status === 'claimed') {
      cur(c).pendingCount += 1;
    }
  }
  for (const c of Object.keys(byCurrency)) byCurrency[c].remaining = byCurrency[c].raised - byCurrency[c].sentValue;
  return { byCurrency, bySponsor };
}

// Pure: what the public thank-you wall may show. Anonymous sponsors keep
// their message and (optionally) amount but never their name. A church pool
// shows the church's name and, only to a viewer holding that church's code
// (`viewerChurchCode`), that it is theirs — the code itself is never returned.
export function publicView(sponsors, viewerChurchCode = '') {
  const mine = normalizeChurchCode(viewerChurchCode);
  return (sponsors || [])
    .filter((s) => s && s.active !== false)
    .map((s) => ({
      id: s.id,
      displayName: s.anonymous ? '' : s.displayName,
      anonymous: !!s.anonymous,
      amount: s.showAmount ? Number(s.amount) || 0 : null,
      currency: s.currency,
      region: s.region,
      message: s.message || '',
      receivedAt: s.receivedAt || '',
      scope: s.scope === 'church' ? 'church' : 'open',
      churchName: s.scope === 'church' ? (s.churchName || s.displayName) : '',
      mine: s.scope === 'church' && !!mine && s.churchCode === mine,
    }));
}

// Pure: may this reward be paid from this pool? Open pools pay anyone; a
// church pool pays only a claimant who entered that church's code.
export function poolAccepts(sponsor, reward) {
  if (!sponsor || sponsor.active === false) return false;
  if (sponsor.scope !== 'church') return true;
  return !!sponsor.churchCode && normalizeChurchCode(reward && reward.churchCode) === sponsor.churchCode;
}
