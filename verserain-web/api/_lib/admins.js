// Admin whitelist for the Vercel API routes. Mirrors isTrustedAdminEmail in
// src/party/server.js — keep the two lists in sync.
export const ADMIN_EMAILS = [
  'samhsiung@gmail.com',
  'davidhwang1125@gmail.com',
  'hsiungsam@gmail.com',
  'hungry4grace@gmail.com',
  'verserain.admin@gmail.com',
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

// The admin token as sent by the client: `x-admin-token` or `Authorization:
// Bearer …` (same two spellings PartyKit's isCustomSetWriteAuthorized takes).
export function adminTokenFrom(req) {
  const h = (req && req.headers) || {};
  const auth = String(h['authorization'] || h['Authorization'] || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return String(h['x-admin-token'] || bearer || '').trim();
}

// Gate for admin routes that can move money-backed rewards. The email whitelist
// alone is self-asserted (any caller can type an admin's address), so once
// ADMIN_TOKEN is configured the request must also carry it. Returns null when
// authorized, otherwise { status, error } for the route to send back.
// ADMIN_TOKEN unset → email-only, with a warning, so a first deploy never locks
// the admins out; production must set it.
export function requireAdmin(req, email, env = process.env) {
  if (!isAdminEmail(email)) return { status: 403, error: 'Forbidden' };
  const configured = String(env.ADMIN_TOKEN || '').trim();
  if (!configured) {
    console.warn('[admins] ADMIN_TOKEN is not set — admin routes are email-only');
    return null;
  }
  if (adminTokenFrom(req) !== configured) return { status: 401, error: 'admin token required' };
  return null;
}
