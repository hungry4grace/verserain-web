// UI language, deep-link routes and share URLs — moved out of App.jsx (UI/UX 第 4 階段).
import { SHOW_CHARITY } from '../../api/_lib/features.js';

export const PUBLIC_APP_ORIGIN = 'https://www.verserain.com';

export const SUPPORTED_UI_LANGS = ['zh', 'cuvs', 'en', 'fa', 'ar', 'he', 'ja', 'ko', 'es', 'tr', 'de', 'my', 'vi', 'id', 'ms', 'pt', 'fr', 'ru', 'hi', 'km'];

// First-visit language. A saved Bible version always wins; a share link's
// ?lang= keeps the old default (和合本). Otherwise a brand-new visitor starts
// in the phone's language instead of always 繁體中文 · 和合本. Nothing is
// stored here — the version effect in App persists whatever was chosen.
export const DEVICE_VERSION_CODES = ['fa', 'ar', 'he', 'ja', 'ko', 'es', 'tr', 'de', 'pt', 'fr', 'ru', 'hi', 'my', 'vi', 'id', 'ms', 'km'];
export function detectDeviceBibleVersion() {
  let langs = [];
  try { langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean); } catch { /* no navigator */ }
  for (const raw of langs) {
    const l = String(raw).toLowerCase();
    if (l.startsWith('zh')) return (/hans|-cn|-sg|-my/.test(l) && !/hant|-tw|-hk|-mo/.test(l)) ? 'cuvs' : 'cuv';
    if (l.startsWith('en')) return 'kjv';
    const base = l.split('-')[0];
    if (DEVICE_VERSION_CODES.includes(base)) return base;
  }
  return 'cuv';
}
export function initialBibleVersion() {
  try {
    const saved = localStorage.getItem('verseRain_version');
    if (saved) return saved;
  } catch { /* storage off */ }
  try {
    if (new URLSearchParams(window.location.search).get('lang')) return 'cuv';
  } catch { /* no window.location */ }
  return detectDeviceBibleVersion();
}
// UI language that goes with a Bible version (same mapping as handleVersionChange).
export function uiLangForVersion(v) {
  if (v === 'kjv' || v === 'esv' || v === 'niv') return 'en';
  if (v === 'cuvs') return 'cuvs';
  if (SUPPORTED_UI_LANGS.includes(v) && v !== 'zh') return v;
  return 'zh';
}

// Document title per UI language — index.html ships the zh title, so without
// this the browser tab stays Chinese for everyone (including recipients of a
// share link opened in an in-app browser, where the tab title is prominent).
export const APP_TITLE_BY_LANG = {
  zh: 'VerseRain — 澆灌心田，結出生命果子',
  cuvs: 'VerseRain — 浇灌心田，结出生命果子',
  en: 'VerseRain — Water your heart, bear the fruit of life',
  ja: 'VerseRain — 心に潤いを、いのちの実を',
  ko: 'VerseRain — 마음에 물을 주어 생명의 열매를',
  es: 'VerseRain — Riega tu corazón y da fruto de vida',
  de: 'VerseRain — Bewässere dein Herz, bringe Frucht des Lebens',
  tr: 'VerseRain — Kalbini sula, yaşam meyvesi ver',
  vi: 'VerseRain — Tưới mát tâm hồn, kết trái sự sống',
  id: 'VerseRain — Siram hatimu, hasilkan buah kehidupan',
  ms: 'VerseRain — Siram hatimu, hasilkan buah kehidupan',
  my: 'VerseRain — နှလုံးသားကို ရေလောင်း၊ အသက်၏အသီးကို သီးပါစေ',
  ar: 'VerseRain — اسقِ قلبك ليُثمر ثمر الحياة',
  he: 'VerseRain — השקו את הלב, הניבו פרי חיים',
  fa: 'VerseRain — دل خود را سیراب کن تا میوهٔ زندگی دهد',
};

// The sender's current UI language, mirrored out of React state so the
// module-level share-link builder can stamp it onto every outgoing link.
// Without this, a recipient who has never picked a language falls back to the
// app default (zh) and reads Chinese directions under an English verse set.
export let SHARE_UI_LANG = '';
export function setShareUiLang(lang) { SHARE_UI_LANG = lang; }

export function buildPublicShareUrl(path = '/', params = {}) {
  const normalizedPath = path && path.startsWith('/') ? path : '/';
  const url = new URL(normalizedPath, PUBLIC_APP_ORIGIN);
  // `lang` first so an explicit params.lang from the caller still wins.
  const withLang = { ...(SHARE_UI_LANG ? { lang: SHARE_UI_LANG } : {}), ...params };
  Object.entries(withLang).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

// Deep-link params are scrubbed from the address bar once consumed, but ?lang=
// has to survive: it is what holds the recipient's UI in the sender's language
// across a reload (we never write it to their localStorage).
// ─── In-app history (browser ← → buttons) ───────────────────────────────
// The app keeps every "page" in React state, so without this the browser's
// Back button left the site. We mirror the page-like state into the URL hash
// (#garden, #versesets/<id>/listen, #multiplayer/room/<id>, <tab>/play …) and
// push one history entry per step; popstate applies the hash back to state.
// Only the query string carries share links (?listenSet= …) — those are
// consumed and scrubbed as before, and every scrub must keep the hash.
export const ROUTE_TABS = ['lobby', 'versesets', 'custom_verses', 'multiplayer', 'daily_verse', 'advanced', 'garden', 'search', 'map', 'manual', 'about', 'accessible', 'bilingual_rain', 'leaderboard', 'rewards_admin', 'sponsors', 'donate', 'sponsor', 'merchant', 'verify', 'charity', 'contests', 'settings'];
// 支持開發（Donate）頁的收款資訊。這是對開發者個人的贈與，不是公益勸募，
// 也開不了捐贈收據 — 獎勵資金池另走教會／非營利代收（見 sponsor 頁）。
// 空字串 → 頁面顯示「即將公布」。
export const DONATE_INFO = { bankName: '', bankCode: '', account: '', holder: '', paypalMe: '', contactEmail: 'hungry4grace@gmail.com' };
// The personal-support page is built but not offered yet: flip to true to
// show its tile and links again (the #donate route keeps working regardless).
export const SHOW_DONATE = false;
export const ROUTE_FLAGS = ['listen', 'edit', 'play', 'room'];
// The voucher QR deep link (#verify/<code>) is read once at module load, before
// any router sync can rewrite the hash to plain #verify.
export const INITIAL_VERIFY_CODE = (() => {
  try {
    const m = String(window.location.hash || '').match(/^#\/?verify\/([A-Za-z0-9-]{6,12})/);
    const code = m ? m[1].toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (code) sessionStorage.setItem('verserain_verify_code', code);
    return code || sessionStorage.getItem('verserain_verify_code') || '';
  } catch { return ''; }
})();
// First run: nothing saved yet and no deep link (shared set, challenge, room…)
// → show the three-step onboarding. Read at module load, before App writes its
// first settings. Anyone who already used the app is marked done silently.
export const FIRST_RUN = (() => {
  try {
    if (localStorage.getItem('verserain_onboarded')) return false;
    const used = localStorage.getItem('verseRain_version') || localStorage.getItem('verserain_player_name') || localStorage.getItem('verserain_player_email');
    if (used) { localStorage.setItem('verserain_onboarded', '1'); return false; }
    const deepHash = window.location.hash && !/^#\/?(lobby)?$/.test(window.location.hash);
    const extraParams = [...new URLSearchParams(window.location.search).keys()].filter(k => !['ref', 'lang', 'iosApp'].includes(k));
    return !deepHash && extraParams.length === 0;
  } catch { return false; }
})();

export function parseRoute(hash) {
  const seg = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  // #charity (old push links, bookmarks) lands on the lobby while 愛心行動 is paused.
  const tab = ROUTE_TABS.includes(seg[0]) && (SHOW_CHARITY || seg[0] !== 'charity') ? seg[0] : 'lobby';
  const r = { tab, setId: null, listen: false, edit: false, play: false, roomId: null, code: null };
  // #verify/<code> — the store-side voucher check, deep-linked from the QR.
  if (tab === 'verify') { r.code = seg[1] ? decodeURIComponent(seg[1]) : null; return r; }
  let i = 1;
  if (tab === 'versesets' && seg[1] && !ROUTE_FLAGS.includes(seg[1])) { r.setId = decodeURIComponent(seg[1]); i = 2; }
  for (; i < seg.length; i++) {
    if (seg[i] === 'room') { r.roomId = seg[i + 1] ? decodeURIComponent(seg[i + 1]) : null; i++; }
    else if (seg[i] === 'listen') r.listen = true;
    else if (seg[i] === 'edit') r.edit = true;
    else if (seg[i] === 'play') r.play = true;
  }
  return r;
}
export function routeFromState({ mainTab, selectedSetId, editing, listening, playing, roomId }) {
  const tab = ROUTE_TABS.includes(mainTab) ? mainTab : 'lobby';
  let route = tab;
  if (tab === 'versesets' && selectedSetId) route += '/' + encodeURIComponent(selectedSetId);
  if (roomId) route = 'multiplayer/room/' + encodeURIComponent(roomId);
  else if (tab === 'custom_verses' && editing) route += '/edit';
  else if (listening) route += '/listen';
  if (playing) route += '/play';
  return route;
}

// Deferred referral (see src/party/referral.js): tell the server this device
// took part in <inviter>'s room / opened their link. Fire-and-forget.
export const PARTY_AUTH_DB_URL = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";
export function postTouch(body) {
  try {
    fetch(PARTY_AUTH_DB_URL + '/touch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch { /* noop */ }
}

export function pathWithSharedLang() {
  const hash = window.location.hash || '';
  try {
    const lang = new URLSearchParams(window.location.search).get('lang');
    if (lang && SUPPORTED_UI_LANGS.includes(lang)) {
      return `${window.location.pathname}?lang=${encodeURIComponent(lang)}${hash}`;
    }
  } catch { /* noop */ }
  return window.location.pathname + hash;
}
