// iOS wrapper-app detection — moved out of App.jsx (UI/UX 第 4 階段).

// Detect whether the page is running inside the VerseRain iOS WKWebView.
// We use three signals: a URL query marker the native app sets, the presence
// of a native bridge handler the Swift app injects, and a fallback UA sniff.
export function isInIosNativeApp() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URL(window.location.href).searchParams.has('iosApp')) return true;
  } catch { /* ignore */ }
  if (window.webkit?.messageHandlers?.googleSignIn) return true;
  return false;
}

// Returns the iOS native app's version string ("3.6.1-build42") or null when
// we're not in the wrapper app. The app injects this via its homeURL's
// `?iosApp=` query, so query persistence matters — see WebView.swift.
export function getIosAppVersion() {
  if (typeof window === 'undefined') return null;
  try {
    return new URL(window.location.href).searchParams.get('iosApp') || null;
  } catch { return null; }
}

// Camera (getUserMedia) calls inside WKWebView crash the app immediately if
// the host bundle's Info.plist lacks NSCameraUsageDescription — there's no
// JS-side catch path because iOS kills the process before the prompt is
// shown. The description was added in app version 3.7.0, so for any older
// build we hide the QR scan affordance entirely and fall back to manual
// paste.
export function iosAppSupportsCamera() {
  const raw = getIosAppVersion();
  if (!raw) return true; // Not in the wrapper app — Safari handles its own permission prompt.
  const match = String(raw).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return false;
  const [, mj, mn] = match.map(Number);
  return mj > 3 || (mj === 3 && mn >= 7);
}
