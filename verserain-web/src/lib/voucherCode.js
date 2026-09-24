// A voucher's QR encodes `${origin}/#verify/<CODE>` (see the 兌換券 card in
// App.jsx); staff may also type or paste the bare 8-character code. This turns
// whatever a scanner or a text box produced into the normalised code, or null.
export const VOUCHER_CODE_RE = /^[A-Z0-9]{8}$/;

export function extractVoucherCode(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  // Deep link (with or without origin / query): …#verify/ABCDEFGH
  const m = /verify\/([A-Za-z0-9]{8})(?![A-Za-z0-9])/.exec(s);
  if (m) return m[1].toUpperCase();
  // Bare code, tolerating spaces, dashes and lowercase ("abcd-efgh").
  const bare = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return VOUCHER_CODE_RE.test(bare) ? bare : null;
}
