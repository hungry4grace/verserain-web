// PartyKit host, set ownership and fetch retry helpers — moved out of App.jsx (UI/UX 第 4 階段).

export const PARTY_HOST = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";

// ── Who owns a verse set ─────────────────────────────────────────────────────
// Names this account has used before (kept locally on every rename; the
// server keeps its own copy in user.previousNames).
export const myPreviousNames = () => {
  try { const a = JSON.parse(localStorage.getItem('verserain_prev_names') || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
};
export const rememberPreviousName = (name) => {
  const n = String(name || '').trim();
  if (!n) return;
  const list = myPreviousNames().filter(x => String(x).toLowerCase() !== n.toLowerCase());
  list.push(n);
  try { localStorage.setItem('verserain_prev_names', JSON.stringify(list.slice(-20))); } catch { /* storage off */ }
};
// Strict "this set is mine": bound to my email, or authored under my current
// or any earlier name (or not attributed at all). Used where the author
// name is (re)written, so a rename never turns my set into someone else's
// and a name-prefix guess never renames someone else's.
export const isMySet = (s, currentPlayerName, currentEmail) => {
  if (!s) return false;
  const email = String(currentEmail || '').trim().toLowerCase();
  if (email && s.ownerEmail && String(s.ownerEmail).trim().toLowerCase() === email) return true;
  if (!s.authorName || s.authorName === 'Anonymous') return true;
  const author = String(s.authorName).trim().toLowerCase();
  if (currentPlayerName && author === String(currentPlayerName).trim().toLowerCase()) return true;
  return myPreviousNames().some(n => String(n).trim().toLowerCase() === author);
};
export const isOwnedByCurrentUser = (s, currentPlayerName, currentEmail) => {
  if (!s) return false;
  if (isMySet(s, currentPlayerName, currentEmail)) return true;
  const emailLocal = String(currentEmail || '').split('@')[0].toLowerCase();
  if (!emailLocal) return false;
  const author = String(s.authorName).toLowerCase();
  // Match common variants like "hungry", "hungry@G", "hungry@y" all sharing
  // the email-local prefix "hungry4grace" → use a sensible truncation.
  const shortLocal = emailLocal.slice(0, 6);
  return shortLocal.length >= 3 && author.startsWith(shortLocal);
};

export async function fetchRetry(url, opts = {}, { retries = 2, delay = 1500 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok || res.status < 500) return res;
      if (i < retries) await new Promise(r => setTimeout(r, delay * (i + 1)));
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}
