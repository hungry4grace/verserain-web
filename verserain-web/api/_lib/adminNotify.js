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
  const ref = String((place && place.referrerName) || (place && place.referrerCode) || '').slice(0, 40);
  return {
    record: { kind: 'place_submitted', placeId: place.id, name, placeKind: place.kind, by },
    title: '🏪 新的地圖標記待審核',
    body: `${by} 登記了「${name}」（${kind}${ref ? `，推薦者：${ref}` : ''}），請到獎勵管理審核`,
    url: 'https://www.verserain.com/#rewards_admin',
    tag: `verserain-place-${place.id}`,
  };
}

// A church / organisation opened a charity pool (愛心折抵池) that needs review.
export function poolSubmittedMessage(pool, who) {
  const name = String((pool && pool.name) || '').slice(0, 60);
  const org = String((pool && pool.orgPlaceName) || '').slice(0, 60);
  const by = String(who || '').slice(0, 40) || '有人';
  return {
    record: { kind: 'pool_submitted', poolId: pool.id, name, orgPlaceName: org, by },
    title: '❤️ 新的愛心折抵池待審核',
    body: `${by} 為「${org || name}」建立了愛心折抵池「${name}」，請到獎勵管理審核`,
    url: 'https://www.verserain.com/#rewards_admin',
    tag: `verserain-pool-${pool.id}`,
  };
}

const FIELD_ZH = { kind: '類型', name: '名稱', address: '地址', lat: '位置', lng: '位置', discountPct: '折扣', dailyPerPerson: '每人每天張數' };

// An owner changed something that needs a fresh look (name, address, spot,
// discount…): the place is off the map until an admin re-approves it.
export function placeResubmittedMessage(place, who, majorFields = []) {
  const name = String((place && place.name) || '').slice(0, 60);
  const by = String(who || '').slice(0, 40) || '有人';
  const labels = Array.from(new Set((majorFields || []).map((f) => FIELD_ZH[f]).filter(Boolean)));
  const what = labels.length ? labels.join('、') : '資料';
  return {
    record: { kind: 'place_submitted', placeId: place.id, name, placeKind: place.kind, by, resubmitted: true },
    title: '🏪 地圖標記修改待重審',
    body: `${by} 修改了「${name}」的${what}，已暫時下地圖，請重新審核`,
    url: 'https://www.verserain.com/#rewards_admin',
    tag: `verserain-place-${place.id}`,
  };
}
