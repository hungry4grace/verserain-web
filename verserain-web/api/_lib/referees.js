// 我推薦的朋友 has two tiers. "Active" referees come from the referral
// history (written when they first cleared a verse and the inviter was paid).
// "Pending" referees only exist on the account (PartyKit user.invitedBy):
// they registered with the code but have not cleared a verse yet. Showing
// them tells the inviter the invite worked, and whom to nudge.
export const PERSONAL_CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;

export function personalCodesOf(keys, max = 5) {
  return Array.from(new Set((keys || []).map((k) => String(k || '').trim()).filter((k) => PERSONAL_CODE_RE.test(k)))).slice(0, max);
}

// referees: [{ name, joinedAt, referredCount }] from the history.
// accountList: PartyKit /reward-eligibility referrals.list entries
//   [{ name, createdAt, passedVerses, treesPlanted, qualified }].
export function mergePendingReferees(referees, accountList) {
  const out = (referees || []).map((r) => ({ ...r }));
  const byName = new Map(out.map((r) => [r.name, r]));
  for (const a of accountList || []) {
    const name = String((a && a.name) || '').trim();
    if (!name) continue;
    const passed = Math.max(0, Math.floor(Number(a.passedVerses) || 0));
    const joinedAt = a.createdAt ? (Date.parse(a.createdAt) || 0) : 0;
    const hit = byName.get(name);
    if (hit) { hit.passedVerses = passed; continue; }
    const row = { name, joinedAt, referredCount: 0, pending: true, passedVerses: passed };
    out.push(row);
    byName.set(name, row);
  }
  return out.sort((x, y) => (y.joinedAt || 0) - (x.joinedAt || 0));
}

// A code counts for ONE account. The client sends every code its device ever
// held; a code that player_mapping assigns to somebody else's name (a shared
// tablet, a device another account signed in on later) must not pull that
// person's referrals into my list. Kept: names, codes linked to my account,
// unmapped codes, and codes mapped to one of my names.
export function dropForeignCodes(keys, { mapping = {}, linked = [] } = {}) {
  const list = (keys || []).map((k) => String(k || '').trim()).filter(Boolean);
  const linkedSet = new Set((linked || []).map((k) => String(k || '').trim()).filter(Boolean));
  const myNames = new Set([...list, ...linkedSet].filter((k) => !PERSONAL_CODE_RE.test(k)));
  for (const k of linkedSet) { const n = mapping[k]; if (n) myNames.add(String(n)); }
  return list.filter((k) => {
    if (!PERSONAL_CODE_RE.test(k) || linkedSet.has(k)) return true;
    const owner = mapping[k];
    return owner === undefined || owner === null || myNames.has(String(owner));
  });
}
