import { sendReferralPush } from './webpush.js';
import { sendReferralApns } from './apns.js';
import { pushNotify } from './rewards.js';

// Tell the admins something needs their eyes: an inbox notice (the 🔔 list,
// keyed by personalCode like every other notice) plus a phone push / APNs
// alert per admin. REWARDS_ADMIN_CODES is the comma-separated list of the
// admins' personalCodes (set in Vercel); unset → nothing is sent and the
// caller's main work is unaffected. Every step fails soft.
export function adminCodes(env = process.env) {
  return String(env.REWARDS_ADMIN_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export async function notifyAdmins(redis, { record, title, body, url, tag }, { env = process.env, push = sendReferralPush, apns = sendReferralApns } = {}) {
  const codes = adminCodes(env);
  if (!codes.length) return { notified: 0 };
  const link = url || 'https://www.verserain.com/#rewards_admin';
  await Promise.all(codes.flatMap((code) => [
    record ? pushNotify(redis, code, record).catch(() => {}) : Promise.resolve(),
    push(code, { title, body, url: link, tag: `${tag}-admin` }).catch(() => {}),
    apns(code, { title, body, url: link, collapseId: `${tag}-admin` }).catch(() => {}),
  ]));
  return { notified: codes.length };
}

const KIND_ZH = { merchant: '商家', church: '教會', org: '機構' };

// A player (re)submitted a map place for review — what the admins get.
export function placeSubmittedMessage(place, who) {
  const name = String((place && place.name) || '').slice(0, 60);
  const by = String(who || '').slice(0, 40) || '有人';
  const kind = KIND_ZH[place && place.kind] || '地圖標記';
  return {
    record: { kind: 'place_submitted', placeId: place.id, name, placeKind: place.kind, by },
    title: '🏪 新的地圖標記待審核',
    body: `${by} 登記了「${name}」（${kind}），請到獎勵管理審核`,
    url: 'https://www.verserain.com/#rewards_admin',
    tag: `verserain-place-${place.id}`,
  };
}
