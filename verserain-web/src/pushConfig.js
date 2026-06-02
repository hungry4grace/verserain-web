// Web Push (VAPID) public key. The matching private key lives in the
// PartyKit backend's PUSH_PRIVATE_KEY env var and in the GitHub Actions
// cron job's secrets — those are the only places that can sign push
// payloads. The public key here is fine to ship.
//
// Generated once via: npx web-push generate-vapid-keys
export const VAPID_PUBLIC_KEY = 'BOoK_sZ8gg8ltrv933Vg4anlYy1cZO-ZQ0clQYQ_6aH7cDpUlAG0c-4Vun2SI2BHYkChho3bNSER5L6L4Gqo5N8';

// Convert the base64url public key to the Uint8Array the PushManager expects.
export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// True when the browser exposes the APIs Web Push needs.
export function isWebPushSupported() {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!('Notification' in window)) return false;
  return true;
}

// Detect iOS Safari running in standalone (PWA) mode. iOS only allows Web
// Push when the site is launched from the Home Screen as a PWA — not from
// Safari proper, not from a WKWebView wrapper.
export function isIOSStandalone() {
  if (typeof window === 'undefined') return false;
  // Safari 16.4+ exposes window.matchMedia('(display-mode: standalone)').
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // Legacy: navigator.standalone is the older iOS-only flag.
  if (window.navigator?.standalone === true) return true;
  return false;
}

// Detect "iOS Safari, not yet added to Home Screen" — we use this to show a
// nicer onboarding ("Add to Home Screen first") instead of failing silently.
export function isIOSWithoutPWA() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iosLike = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document);
  if (!iosLike) return false;
  return !isIOSStandalone();
}
