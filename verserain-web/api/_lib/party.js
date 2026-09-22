// Server-to-server calls from the Vercel API into the PartyKit auth/garden
// Durable Object. Same PARTY_BASE + x-admin-token pairing api/line-webhook.js
// already uses, so no new secret is needed.
const PARTY_BASE = (process.env.PARTY_BASE || 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db').replace(/\/+$/, '');

export class PartyError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function partyFetch(path, body, { method = 'POST', env = process.env, fetchImpl = fetch } = {}) {
  const token = String(env.ADMIN_TOKEN || '').trim();
  if (!token) throw new PartyError('ADMIN_TOKEN not configured', 0);
  const res = await fetchImpl(`${PARTY_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PartyError(data.error || `party ${res.status}`, res.status);
  return data;
}
