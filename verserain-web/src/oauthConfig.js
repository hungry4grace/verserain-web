// OAuth provider configuration.
//
// SETUP STEPS:
// ─── Google ─────────────────────────────────────────────────────────────────
//   1. Go to https://console.cloud.google.com/apis/credentials
//   2. Create project (or reuse existing) → "OAuth consent screen":
//        User Type: External; App name: VerseRain; Support email: hungry4grace@gmail.com
//        Authorized domains: verserain.com
//        Scopes: openid, email, profile
//   3. Credentials → "Create Credentials" → "OAuth client ID":
//        Application type: Web application
//        Authorized JavaScript origins:
//          https://verserain.com
//          https://www.verserain.com
//          http://localhost:5173
//          http://localhost:5177
//        Authorized redirect URIs: (leave empty — we use ID token flow, not redirect)
//   4. Copy the Client ID below.
//
// ─── Apple ──────────────────────────────────────────────────────────────────
//   Requires a paid Apple Developer account ($99/year).
//   1. https://developer.apple.com/account/resources/identifiers/list
//   2. Create an "App ID" first (e.g. com.verserain.web) and enable
//      "Sign In with Apple" capability.
//   3. Create a "Services ID" (e.g. com.verserain.web.signin):
//        - Enable Sign In with Apple
//        - Configure → primary App ID = the one above
//        - Domains: verserain.com, www.verserain.com
//        - Return URLs: https://verserain.com/  (must be HTTPS; trailing slash matters)
//   4. The Services ID becomes your APPLE_CLIENT_ID.
//
// After editing, redeploy. No secrets are stored here — these IDs are public.

export const GOOGLE_CLIENT_ID = ''; // e.g. '1234567890-abc.apps.googleusercontent.com'

export const APPLE_CLIENT_ID = '';  // e.g. 'com.verserain.web.signin'
export const APPLE_REDIRECT_URI = (typeof window !== 'undefined' ? window.location.origin : '') + '/';

// Hash an OAuth provider's stable sub claim into a password the existing
// email/password backend can verify. The sub is opaque per-provider so we
// namespace it. This lets us reuse the existing /register and /login routes
// without modifying the PartyKit backend.
export async function deriveOAuthPassword(provider, sub) {
  const seed = `verserain-oauth-v1::${provider}::${sub}`;
  const bytes = new TextEncoder().encode(seed);
  const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Decode a JWT payload (no signature verification — backend should verify in
// prod, but for our derived-password flow the sub binding is what matters).
export function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
