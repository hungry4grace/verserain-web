// Deferred referral attribution ("推薦人回溯歸因").
//
// A guest who plays in someone's room or opens someone's share link leaves a
// *touch* on the server: `touch:<deviceCode>` (this browser) and
// `touch-ip:<sha256(ip)>` (this network). When that device — or, within the
// window, any device on that network — later registers or logs in without an
// inviter, the EARLIEST touch within 90 days becomes the account's inviter.
// invitedBy stays write-once: nothing here ever overwrites an existing value.

export const TOUCH_TTL_MS = 90 * 24 * 3600 * 1000;
export const CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;
export const TOUCH_KINDS = ['link', 'room', 'challenge'];
const MAX_EVENTS = 30;
export const MAX_DEVICES = 50;

// Sort by time, keep the earliest event per inviter, drop expired ones, cap.
export function normalizeEvents(events, now = Date.now()) {
  const seen = new Set();
  const out = [];
  for (const e of [...(events || [])].filter(e => e && CODE_RE.test(String(e.inviter || '')) && Number.isFinite(e.at)).sort((a, b) => a.at - b.at)) {
    if (now - e.at > TOUCH_TTL_MS) continue;
    if (seen.has(e.inviter)) continue;
    seen.add(e.inviter);
    out.push({ inviter: e.inviter, kind: TOUCH_KINDS.includes(e.kind) ? e.kind : 'link', at: e.at, ...(e.roomId ? { roomId: String(e.roomId).slice(0, 12) } : {}) });
    if (out.length >= MAX_EVENTS) break;
  }
  return out;
}

// The earliest in-window touch whose inviter is not one of the account's own
// codes. `ownCodes` may contain empty/undefined entries.
export function pickInviter(events, { now = Date.now(), ownCodes = [] } = {}) {
  const own = new Set((ownCodes || []).filter(Boolean));
  for (const e of normalizeEvents(events, now)) {
    if (!own.has(e.inviter)) return e;
  }
  return null;
}

// IP-based matches are only trusted for young accounts (or brand-new ones):
// an account created years ago that logs in on a friend's Wi‑Fi must not be
// re-attributed to whoever hosted a game there last week.
export function ipMatchAllowed(user, now = Date.now()) {
  if (!user) return true;
  const created = Date.parse(user.createdAt || '');
  if (!Number.isFinite(created)) return false;
  return now - created <= TOUCH_TTL_MS;
}
