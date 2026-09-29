// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI, GOOGLE_CLIENT_ID, LINE_CHANNEL_ID, startLineLogin } from '../oauthConfig';
import { alertDialog } from '../ui';
import { isInIosNativeApp } from '../lib/platform';
import { useEffect, useRef } from 'react';

export function OAuthButtons({ onGoogleCredential, onAppleCredential, disabled, t }) {
  const inIosApp = isInIosNativeApp();
  const nativeBridge = inIosApp && typeof window !== 'undefined' && window.webkit?.messageHandlers?.googleSignIn;
  const nativeAppleBridge = inIosApp && typeof window !== 'undefined' && window.webkit?.messageHandlers?.appleSignIn;
  const googleClientRef = useRef(null);
  const appleInitialized = useRef(false);

  // Initialize Google OAuth2 token client once the gsi script is loaded.
  // Skipped when running inside the iOS app — Google blocks OAuth in WebViews,
  // so we instead use a native bridge (see handleGoogleClick).
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || inIosApp) return;
    let cancelled = false;
    const init = () => {
      if (cancelled) return false;
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) return false;
      try {
        googleClientRef.current = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: (response) => {
            if (response?.access_token) onGoogleCredential(response.access_token);
          },
        });
        return true;
      } catch { return false; }
    };
    if (init()) return () => { cancelled = true; };
    const interval = setInterval(() => { if (init()) clearInterval(interval); }, 200);
    const stop = setTimeout(() => clearInterval(interval), 8000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, [onGoogleCredential, inIosApp]);

  // Register a global callback the native app calls after completing the
  // ASWebAuthenticationSession OAuth flow. The Swift code evaluates:
  //   window.__verseRainNativeOAuth('google', '<access_token>')
  useEffect(() => {
    if (!inIosApp) return;
    window.__verseRainNativeOAuth = (provider, credential, extra) => {
      if (provider === 'google' && credential) onGoogleCredential(credential);
      else if (provider === 'apple' && credential) onAppleCredential(credential, extra || {});
    };
    return () => { try { delete window.__verseRainNativeOAuth; } catch {} };
  }, [inIosApp, onGoogleCredential, onAppleCredential]);

  // Initialize Apple SDK; the button itself is rendered with our own styles.
  // Skipped in the iOS app — we use the native ASAuthorizationAppleIDProvider
  // bridge instead of Apple's web JS SDK.
  useEffect(() => {
    if (inIosApp || !APPLE_CLIENT_ID || appleInitialized.current) return;
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.AppleID?.auth) return false;
      try {
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: APPLE_REDIRECT_URI,
          usePopup: true,
        });
        appleInitialized.current = true;
        return true;
      } catch { return false; }
    };
    if (init()) return () => { cancelled = true; };
    const interval = setInterval(() => { if (init()) clearInterval(interval); }, 200);
    const stop = setTimeout(() => clearInterval(interval), 8000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, []);

  const handleGoogleClick = () => {
    if (disabled) return;
    if (nativeBridge) {
      // Native iOS app with bridge — let Swift open ASWebAuthenticationSession.
      try { window.webkit.messageHandlers.googleSignIn.postMessage({}); } catch {}
      return;
    }
    if (inIosApp) {
      // iOS app without the native bridge yet (i.e. running an older build).
      // Inform the user the app needs to be updated.
      alertDialog({ message: t(
        '此版本 App 尚不支援 Google 登入。請更新 App，或先用下方 email / 密碼登入。',
        'This app version does not yet support Google sign-in. Please update the app, or use email / password below.'
      ) });
      return;
    }
    if (!googleClientRef.current) return;
    googleClientRef.current.requestAccessToken();
  };

  const handleAppleClick = async () => {
    if (disabled) return;
    if (nativeAppleBridge) {
      // Native iOS app — let Swift open ASAuthorizationAppleIDProvider.
      try { window.webkit.messageHandlers.appleSignIn.postMessage({}); } catch {}
      return;
    }
    if (inIosApp) {
      alertDialog({ message: t(
        '此版本 App 尚不支援 Apple 登入。請更新 App，或先用下方 email / 密碼登入。',
        'This app version does not yet support Apple sign-in. Please update the app, or use email / password below.'
      ) });
      return;
    }
    if (!window.AppleID?.auth) return;
    try {
      const result = await window.AppleID.auth.signIn();
      const idToken = result?.authorization?.id_token;
      if (idToken) onAppleCredential(idToken);
    } catch { /* user cancelled */ }
  };

  // Show the Apple button when in the iOS app (native bridge handles it) or
  // when the web Services ID is configured.
  const showAppleButton = inIosApp || !!APPLE_CLIENT_ID;

  // LINE uses a full-page redirect (no popup SDK), which works the same in
  // the plain web, the Android TWA, and the iOS WKWebView — no bridge needed.
  const handleLineClick = () => {
    if (disabled) return;
    startLineLogin();
  };

  if (!GOOGLE_CLIENT_ID && !showAppleButton && !LINE_CHANNEL_ID) {
    return (
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '0.7rem' }}>
        {t(
          'Google / Apple 登入尚未設定。請在 src/oauthConfig.js 填入 Client ID。',
          'Google / Apple sign-in not configured. Fill in Client IDs in src/oauthConfig.js.'
        )}
      </div>
    );
  }

  const baseBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
    width: '100%', padding: '0.85rem 1rem', borderRadius: '8px',
    fontSize: '0.95rem', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {GOOGLE_CLIENT_ID && (
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={disabled}
          style={{ ...baseBtnStyle, background: '#fff', color: '#3c4043', border: '1px solid #dadce0' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t('使用 Google 繼續', 'Continue with Google')}
        </button>
      )}
      {showAppleButton && (
        <button
          type="button"
          onClick={handleAppleClick}
          disabled={disabled}
          style={{ ...baseBtnStyle, background: '#000', color: '#fff', border: '1px solid #000' }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">
            <path d="M11.624 10.628c-.02-2.027 1.66-3.001 1.736-3.05-.946-1.382-2.418-1.571-2.943-1.593-1.252-.127-2.44.738-3.075.738-.635 0-1.612-.72-2.65-.7-1.366.02-2.622.793-3.327 2.012-1.42 2.461-.363 6.105 1.02 8.103.674 1.0 1.476 2.119 2.527 2.079 1.012-.04 1.395-.654 2.62-.654s1.567.654 2.638.634c1.088-.02 1.778-1.018 2.444-2.018.77-1.158 1.087-2.279 1.107-2.339-.024-.012-2.126-.815-2.147-3.232zM9.667 4.624c.553-.668.928-1.6.824-2.524-.798.032-1.764.531-2.336 1.198-.513.591-.962 1.54-.84 2.448.892.07 1.798-.453 2.352-1.122z" />
          </svg>
          {t('使用 Apple 繼續', 'Continue with Apple')}
        </button>
      )}
      {LINE_CHANNEL_ID && (
        <button
          type="button"
          onClick={handleLineClick}
          disabled={disabled}
          style={{ ...baseBtnStyle, background: '#06C755', color: '#fff', border: '1px solid #06C755' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          {t('使用 LINE 繼續', 'Continue with LINE')}
        </button>
      )}
    </div>
  );
}
