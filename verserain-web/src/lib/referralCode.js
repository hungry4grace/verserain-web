// A player's referral (personal) code: 10 characters from the alphabet with
// no look-alikes (same as src/party/referral.js CODE_RE). The share QR encodes
// `${origin}/?ref=<CODE>&lang=..`; the merchant form also accepts a pasted
// link or the bare code. Unlike voucher codes these are CASE-SENSITIVE, so
// nothing here changes the case.
export const REFERRAL_CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;

export function extractReferralCode(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  // Absolute share link: read the ref query parameter.
  try {
    const u = new URL(s);
    const ref = (u.searchParams.get('ref') || '').trim();
    if (ref) return REFERRAL_CODE_RE.test(ref) ? ref : null;
  } catch { /* not an absolute URL */ }
  // Relative / partial link (…?ref=CODE, #?ref=CODE).
  const m = /[?&#]ref=([A-HJ-NP-Za-km-z2-9]{10})(?![A-HJ-NP-Za-km-z2-9])/.exec(s);
  if (m) return m[1];
  // Bare code, tolerating surrounding whitespace only.
  return REFERRAL_CODE_RE.test(s) ? s : null;
}
