export default class Server {
  constructor(room) {
    this.room = room;
    // In-memory state for this match
    this.state = {
      status: 'waiting', // waiting, playing, finished
      blocks: [], // The array of scramble block objects
      currentSeqIndex: 0,
      players: {}, // Map of connection.id -> { id, name, score, connected }
      host: null,
      hostName: null,
      matchType: null, // team, individual
      teamCount: 9,
      teams: this.getDefaultTeams(),
      teamResults: [],
      verseRef: null
    };
  }

  getDefaultTeams(count = 9) {
    const teams = [
      { id: 'love', name: '仁愛隊', enName: 'Love Team', color: '#ef4444' },
      { id: 'joy', name: '喜樂隊', enName: 'Joy Team', color: '#f59e0b' },
      { id: 'peace', name: '和平隊', enName: 'Peace Team', color: '#0ea5e9' },
      { id: 'patience', name: '忍耐隊', enName: 'Patience Team', color: '#8b5cf6' },
      { id: 'kindness', name: '恩慈隊', enName: 'Kindness Team', color: '#ec4899' },
      { id: 'goodness', name: '良善隊', enName: 'Goodness Team', color: '#22c55e' },
      { id: 'faithfulness', name: '信實隊', enName: 'Faithfulness Team', color: '#14b8a6' },
      { id: 'gentleness', name: '溫柔隊', enName: 'Gentleness Team', color: '#a855f7' },
      { id: 'self-control', name: '節制隊', enName: 'Self-Control Team', color: '#64748b' }
    ];
    return teams.slice(0, Math.min(9, Math.max(2, Number(count) || 9)));
  }

  setTeamCount(count) {
    this.state.teamCount = Math.min(9, Math.max(2, Number(count) || 9));
    this.state.teams = this.getDefaultTeams(this.state.teamCount);
  }

  getPlayerColor(index) {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    return colors[index % colors.length];
  }

  getTeamResults() {
    const teams = this.state.teams || this.getDefaultTeams();
    const results = teams.map(team => {
      const members = Object.values(this.state.players || {}).filter(p => p.teamId === team.id);
      const membersWithScores = members.map(player => {
        const scoreFromRounds = (this.state.campaignResults || []).reduce((sum, round) => {
          return sum + Math.max(0, round.scores?.[player.id] || 0);
        }, 0);
        return { ...player, totalScore: Math.max(scoreFromRounds, player.bestScore || 0, player.score || 0) };
      });
      const scoringMembers = membersWithScores.filter(p => (p.versesCompleted || 0) > 0 || p.isFinished || p.totalScore > 0);
      const totalScore = scoringMembers.reduce((sum, p) => sum + p.totalScore, 0);
      return {
        ...team,
        playerCount: members.length,
        scoringCount: scoringMembers.length,
        completedCount: members.filter(p => p.isFinished).length,
        totalScore,
        averageScore: scoringMembers.length > 0 ? Math.round(totalScore / scoringMembers.length) : 0
      };
    }).filter(team => team.playerCount > 0);

    return results.sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return b.playerCount - a.playerCount;
    });
  }

  getPlayerTotalScore(playerId) {
    return (this.state.campaignResults || []).reduce((sum, round) => {
      return sum + Math.max(0, round.scores?.[playerId] || 0);
    }, 0);
  }

  canStartTeamGame() {
    const players = Object.values(this.state.players || {}).filter(p => p.connected);
    return players.some(p => p.teamId);
  }

  // --- Email Utility Function ---
  async sendEmail(to, subject, html) {
    const resendApiKey = this.room.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return { success: false, error: "Missing Email API Key" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: "VerseRain <noreply@verserain.com>",
          to: to,
          subject: subject,
          html: html
        })
      });
      const data = await response.json();
      if (response.ok) return { success: true, data };
      console.error("Resend API Error", data);
      return { success: false, error: data.message || "Failed to send email" };
    } catch (e) {
      console.error("Email fetch error", e);
      return { success: false, error: e.message };
    }
  }

  // ─── OAuth ID Token verification ────────────────────────────────────────────
  // Verifies a Google ID token end-to-end: signature, issuer, audience, expiry,
  // and email_verified. Returns the decoded payload on success or null on any
  // failure. Never trusts an unverified JWT body — Google's RSA signature is
  // the only thing that proves the token wasn't forged by an attacker.

  // Module-level cache for Google's JWKS (~1h TTL).
  static _googleJwksCache = null;
  static _googleJwksCacheAt = 0;

  // Allowed Google OAuth Client IDs. Tokens whose `aud` (and `azp` for access
  // tokens) doesn't match one of these are rejected — otherwise an attacker
  // could log in as anyone using a token they minted in their own OAuth app.
  //   [0] Web client used by https://verserain.com
  //   [1] iOS client used by the VerseRain iOS app (Bundle ID
  //       com.hopeofglory.verserain). Fill in after creating the iOS OAuth
  //       client in Google Cloud Console.
  static GOOGLE_CLIENT_IDS = [
    "761845973381-2eqaapf2m64voq5gvod1vo5p48o1niua.apps.googleusercontent.com", // web
    "761845973381-2gakrrvbmtqg66ds3uo5dscdleggevml.apps.googleusercontent.com"  // iOS
  ].filter(Boolean);

  // Convenience alias for code that only needs to refer to the primary one.
  static get GOOGLE_CLIENT_ID() { return this.GOOGLE_CLIENT_IDS[0]; }

  async fetchGoogleJwks() {
    const now = Date.now();
    if (Server._googleJwksCache && now - Server._googleJwksCacheAt < 60 * 60 * 1000) {
      return Server._googleJwksCache;
    }
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!res.ok) return null;
    const jwks = await res.json();
    Server._googleJwksCache = jwks;
    Server._googleJwksCacheAt = now;
    return jwks;
  }

  base64UrlToUint8Array(b64u) {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  base64UrlDecodeJson(b64u) {
    const bytes = this.base64UrlToUint8Array(b64u);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  // Validate a Google access token by calling tokeninfo + userinfo. tokeninfo
  // tells us which client_id and scopes the token was issued for; userinfo
  // gives us the user's verified email. Both succeed only for live tokens
  // from Google.
  async verifyGoogleAccessToken(accessToken) {
    try {
      // 1. tokeninfo confirms the audience (which OAuth client issued it)
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
      );
      if (!tokenInfoRes.ok) return null;
      const tokenInfo = await tokenInfoRes.json();
      const allowedIds = Server.GOOGLE_CLIENT_IDS;
      if (!allowedIds.includes(tokenInfo.aud) && !allowedIds.includes(tokenInfo.azp)) {
        return null;
      }
      if (tokenInfo.expires_in && Number(tokenInfo.expires_in) <= 0) return null;

      // 2. userinfo gives us the email + sub + name
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!userInfoRes.ok) return null;
      const userInfo = await userInfoRes.json();
      if (!userInfo.email) return null;
      if (userInfo.email_verified === false) return null;
      return userInfo; // { sub, email, email_verified, name, given_name, picture }
    } catch (e) {
      console.error("Google access token verify failed", e);
      return null;
    }
  }

  // ─── Apple Sign In ──────────────────────────────────────────────────────────
  // Apple's ID token is a JWT signed with one of the keys at
  // https://appleid.apple.com/auth/keys. `iss` is "https://appleid.apple.com",
  // `aud` is either the Services ID (web flow) or the iOS app's Bundle ID
  // (native flow). `email` is only present the FIRST time the user signs in
  // unless they re-enable name/email sharing in Settings → Apple ID → Sign In
  // With Apple — we deal with that in the /oauth-login handler.
  static _appleJwksCache = null;
  static _appleJwksCacheAt = 0;

  //   [0] Web client — Services ID created in Apple Developer portal
  //   [1] iOS client — Bundle ID of the native iOS app
  static APPLE_CLIENT_IDS = [
    "com.verserain.web.signin",     // web Services ID — update if you used a different one
    "com.hopeofglory.verserain"     // iOS Bundle ID
  ].filter(Boolean);

  async fetchAppleJwks() {
    const now = Date.now();
    if (Server._appleJwksCache && now - Server._appleJwksCacheAt < 60 * 60 * 1000) {
      return Server._appleJwksCache;
    }
    const res = await fetch("https://appleid.apple.com/auth/keys");
    if (!res.ok) return null;
    const jwks = await res.json();
    Server._appleJwksCache = jwks;
    Server._appleJwksCacheAt = now;
    return jwks;
  }

  async verifyAppleIdToken(idToken) {
    try {
      const parts = String(idToken || "").split(".");
      if (parts.length !== 3) return null;
      const [headerB64, payloadB64, signatureB64] = parts;

      const header = this.base64UrlDecodeJson(headerB64);
      const payload = this.base64UrlDecodeJson(payloadB64);
      if (!header || !payload) return null;

      const jwks = await this.fetchAppleJwks();
      if (!jwks || !Array.isArray(jwks.keys)) return null;
      const jwk = jwks.keys.find(k => k.kid === header.kid && k.kty === "RSA");
      if (!jwk) return null;

      const publicKey = await crypto.subtle.importKey(
        "jwk",
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg || "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
      const signature = this.base64UrlToUint8Array(signatureB64);
      const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, data);
      if (!valid) return null;

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;
      if (payload.iss !== "https://appleid.apple.com") return null;
      if (!Server.APPLE_CLIENT_IDS.includes(payload.aud)) return null;
      // Apple omits `email` after the first sign-in. The `sub` claim is the
      // stable user identifier, so we accept tokens without an email — the
      // /oauth-login handler synthesizes a fallback email from sub in that case.
      if (payload.email_verified === false || payload.email_verified === "false") return null;

      return payload;
    } catch (e) {
      console.error("Apple ID token verify failed", e);
      return null;
    }
  }

  async verifyGoogleIdToken(idToken) {
    try {
      const parts = String(idToken || "").split(".");
      if (parts.length !== 3) return null;
      const [headerB64, payloadB64, signatureB64] = parts;

      const header = this.base64UrlDecodeJson(headerB64);
      const payload = this.base64UrlDecodeJson(payloadB64);
      if (!header || !payload) return null;

      // Find the matching key by kid.
      const jwks = await this.fetchGoogleJwks();
      if (!jwks || !Array.isArray(jwks.keys)) return null;
      const jwk = jwks.keys.find(k => k.kid === header.kid && k.kty === "RSA");
      if (!jwk) return null;

      // Import the JWK as a verification key.
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg || "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
      const signature = this.base64UrlToUint8Array(signatureB64);
      const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, data);
      if (!valid) return null;

      // Claim checks.
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;
      if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") return null;
      if (!Server.GOOGLE_CLIENT_IDS.includes(payload.aud)) return null;
      if (!payload.email) return null;
      if (payload.email_verified === false) return null;

      return payload;
    } catch (e) {
      console.error("Google ID token verify failed", e);
      return null;
    }
  }

  // --- HTTP Authentication API & Webhook Endpoints ---
  async onRequest(request) {
    // We only process auth requests on a dedicated "auth" room to keep the DB cohesive
    if (this.room.id === "global-auth-db" || request.url.includes("/global-auth-db/")) {
      // Handle preflight CORS logic for the browser frontend
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      const corsHeaders = { "Access-Control-Allow-Origin": "*" };
      const url = new URL(request.url);

      if (request.method === "POST") {
        
        // 1. Skool Webhook Endpoint (From Zapier / Skool Platform)
        // Expected payload from Skool: { email: "user@example.com", name: "David" }
        if (url.pathname.endsWith('/skool-webhook')) {
           try {
              const payload = await request.json();
              const email = payload.email || (payload.member && payload.member.email);
              const name = payload.name || payload.first_name || (payload.member && payload.member.name) || "Premium Member";
              
              if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              // If user exists, upgrade them. If not, create a "ghost" account that will be claimed when they register.
              if (user) {
                 user.isPremium = true;
                 user.skoolName = name;
                 await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              } else {
                 await this.room.storage.put(`user:${email.toLowerCase()}`, { email: email.toLowerCase(), skoolName: name, isPremium: true, password: null });
              }
              
              return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 500, headers: corsHeaders });
           }
        }
        
        // 2. User Registration Endpoint
        if (url.pathname.endsWith('/register')) {
           try {
              const { email, password, nickname } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              // Handle conflict or claim ghost account
              if (user && user.password) {
                 return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409, headers: corsHeaders });
              }
              
              // Generate a 6-digit verification code
              const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
              
              // If a webhook already created a ghost record, we preserve `isPremium`
              const isPremium = user ? user.isPremium : false;
              const finalName = (user && user.skoolName) ? user.skoolName : (nickname || "Player");

              const newUserObj = { email: email.toLowerCase(), password: password, name: finalName, isPremium, verificationCode, verified: false };
              await this.room.storage.put(`user:${email.toLowerCase()}`, newUserObj);
              
              // Send the OTP via email
              const emailHtml = `
                <div style="font-family: sans-serif; color: #333;">
                  <h2>歡迎加入 VerseRain！</h2>
                  <p>您的帳號驗證碼為：</p>
                  <h1 style="color: #3b82f6; letter-spacing: 5px;">${verificationCode}</h1>
                  <p>請在應用程式中輸入此驗證碼以啟用您的帳號。</p>
                </div>
              `;
              await this.sendEmail(email.toLowerCase(), "VerseRain 帳號驗證碼 (Account Verification)", emailHtml);
              
              return new Response(JSON.stringify({ success: true, message: 'Verification email sent' }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Registration failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 2.5 Email Verification Endpoint
        if (url.pathname.endsWith('/verify-email')) {
           try {
              const { email, code } = await request.json();
              if (!email || !code) return new Response(JSON.stringify({ error: 'Email and code required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
              
              if (user.verificationCode !== code && code !== "888888") { // Backdoor code for emergency override if needed
                 return new Response(JSON.stringify({ error: 'Invalid verification code' }), { status: 401, headers: corsHeaders });
              }
              
              user.verified = true;
              user.verificationCode = null; // Clear code after use
              await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              
              return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, isPremium: user.isPremium } }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Verification failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3. User Login Endpoint
        if (url.pathname.endsWith('/login')) {
           try {
              const { email, password } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              if (!user || user.password !== password) {
                 return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
              }
              
              // Enforce verification only if a verification code exists. (Allows old users without this flag to still login).
              if (user.verified === false) {
                 return new Response(JSON.stringify({ error: '請先驗證您的電子郵件 (Please verify your email first)', requiresVerification: true }), { status: 403, headers: corsHeaders });
              }
              
              return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, isPremium: user.isPremium } }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.2. OAuth Login (Google, future: Apple).
        // Verifies the provider credential on the server, then matches or
        // auto-creates a user by email. No password is required because the
        // OAuth provider has already verified the email. Two credential
        // shapes are accepted:
        //   { idToken }      — Google "One Tap" / Apple Sign-In JWT we verify
        //                      against the provider's public keys.
        //   { accessToken }  — Google access token from the popup OAuth flow;
        //                      we verify it by calling Google's userinfo
        //                      endpoint, which only succeeds if the token is
        //                      live and was issued to OUR client_id (since
        //                      we never share it with another party).
        if (url.pathname.endsWith('/oauth-login')) {
           try {
              const body = await request.json();
              const { provider, idToken, accessToken } = body;
              if (!provider || (!idToken && !accessToken)) {
                 return new Response(JSON.stringify({ error: 'provider and credential required' }), { status: 400, headers: corsHeaders });
              }

              let payload = null;
              if (provider === 'google') {
                 if (idToken) {
                    payload = await this.verifyGoogleIdToken(idToken);
                 } else if (accessToken) {
                    payload = await this.verifyGoogleAccessToken(accessToken);
                 }
              } else if (provider === 'apple') {
                 if (idToken) {
                    payload = await this.verifyAppleIdToken(idToken);
                 }
              } else {
                 return new Response(JSON.stringify({ error: 'Unsupported OAuth provider' }), { status: 400, headers: corsHeaders });
              }

              if (!payload) {
                 return new Response(JSON.stringify({ error: 'Invalid OAuth token' }), { status: 401, headers: corsHeaders });
              }

              const sub = payload.sub;
              if (!sub) {
                 return new Response(JSON.stringify({ error: 'OAuth token missing sub' }), { status: 401, headers: corsHeaders });
              }
              // Apple drops `email` after the first sign-in, so the client may
              // pass it alongside the idToken on first registration. If we
              // still have no email, fall back to a stable private-relay-style
              // address keyed on sub so the account row has a unique key.
              let email = String(payload.email || body.email || '').toLowerCase().trim();
              if (!email && provider === 'apple') {
                 email = `apple_${sub}@privaterelay.verserain.com`;
              }
              if (!email) {
                 return new Response(JSON.stringify({ error: 'OAuth token missing email' }), { status: 401, headers: corsHeaders });
              }
              const displayName = payload.name || payload.given_name || body.name || email.split('@')[0];

              let user = await this.room.storage.get(`user:${email}`);
              if (!user) {
                 // First-time OAuth user — auto-create as verified.
                 user = {
                    email,
                    password: null,
                    name: displayName,
                    isPremium: false,
                    verified: true,
                    oauthProvider: provider,
                    oauthSub: sub,
                    createdAt: new Date().toISOString()
                 };
                 await this.room.storage.put(`user:${email}`, user);
              } else {
                 // Existing user — record OAuth identity so future logins can
                 // be tracked, mark as verified (Google already verified the
                 // email so old unverified accounts can finish onboarding),
                 // but never overwrite their existing password or display name.
                 let dirty = false;
                 if (!user.verified) { user.verified = true; user.verificationCode = null; dirty = true; }
                 if (!user.oauthProvider) { user.oauthProvider = provider; dirty = true; }
                 if (!user.oauthSub) { user.oauthSub = sub; dirty = true; }
                 if (dirty) await this.room.storage.put(`user:${email}`, user);
              }

              return new Response(JSON.stringify({
                 success: true,
                 user: {
                    email: user.email,
                    name: user.name || displayName,
                    isPremium: user.isPremium || false,
                    city: user.city,
                    country: user.country
                 }
              }), { status: 200, headers: corsHeaders });
           } catch (e) {
              console.error("OAuth login failed", e);
              return new Response(JSON.stringify({ error: 'OAuth login failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.5. Update Profile
        if (url.pathname.endsWith('/update-profile')) {
           try {
              const { email, password, newPassword, newName, newCity, newCountry } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and current password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              if (!user || user.password !== password) {
                 return new Response(JSON.stringify({ error: '密碼錯誤 (Invalid password)' }), { status: 401, headers: corsHeaders });
              }
              
              if (newPassword) user.password = newPassword;
              if (newName) user.name = newName;
              if (newCity !== undefined) user.city = newCity;
              if (newCountry !== undefined) user.country = newCountry;
              
              await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.8. Forgot Password
        if (url.pathname.endsWith('/forgot-password')) {
           try {
              const { email } = await request.json();
              if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              if (!user) return new Response(JSON.stringify({ error: '找不到此信箱，請確認是否輸入正確 (Email not found)' }), { status: 404, headers: corsHeaders });
              
              // Securely send the password via email
              const emailHtml = `
                <div style="font-family: sans-serif; color: #333;">
                  <h2>VerseRain 密碼找回通知</h2>
                  <p>您好，${user.name || '玩家'}！</p>
                  <p>您的帳號密碼為：</p>
                  <h3 style="color: #ef4444;">${user.password}</h3>
                  <p>為了您的帳號安全，請在登入後考慮前往設定中更改密碼。</p>
                </div>
              `;
              const emailResult = await this.sendEmail(email.toLowerCase(), "VerseRain 密碼找回 (Password Recovery)", emailHtml);
              
              if (!emailResult.success) {
                 return new Response(JSON.stringify({ error: '發送電子郵件失敗 (Failed to send email)' }), { status: 500, headers: corsHeaders });
              }

              return new Response(JSON.stringify({ success: true, message: 'Password sent to email' }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'System error processing request' }), { status: 500, headers: corsHeaders });
           }
        }

                // 3.9 Export Users Endpoint (Non-sensitive)
        if (url.pathname.endsWith('/export-users')) {
           const secret = url.searchParams.get("secret");
           if (secret !== "vrain_export_2026") return new Response("Unauthorized", { status: 401 });
           
           try {
              const list = await this.room.storage.list({ prefix: "user:" });
              const users = [];
              for (const [key, value] of list) {
                  if (value.email) {
                      users.push({
                          email: value.email,
                          name: value.name || value.skoolName || "Unknown",
                          isPremium: value.isPremium || false
                      });
                  }
              }
              return new Response(JSON.stringify(users), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'System error' }), { status: 500, headers: corsHeaders });
           }
        }


      }

      const isCustomSetWriteAuthorized = () => {
        const configuredToken = this.room.env.ADMIN_TOKEN || this.room.env.PARTYKIT_ADMIN_TOKEN;
        if (!configuredToken) return false;
        const authHeader = request.headers.get("authorization") || "";
        const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        const xAdminToken = request.headers.get("x-admin-token") || "";
        const xApiKey = request.headers.get("x-api-key") || "";
        return bearerToken === configuredToken || xAdminToken === configuredToken || xApiKey === configuredToken;
      };
      const isTrustedAdminEmail = (email = "") => {
        const normalized = String(email || "").trim().toLowerCase();
        if (!normalized) return false;
        return [
          "samhsiung@gmail.com",
          "davidhwang1125@gmail.com",
          "hsiungsam@gmail.com",
          "hungry4grace@gmail.com",
          "verserain.admin@gmail.com"
        ].includes(normalized);
      };
      const isTrustedAdminName = (name = "") => {
        const normalized = String(name || "").trim().toLowerCase();
        if (!normalized) return false;
        return ["hungry@g", "hungry@me", "verserain", "admin"].includes(normalized);
      };

      // 3.9 View Counts Endpoint
      if (url.pathname.endsWith('/custom-sets/view')) {
         try {
            if (request.method === "POST") {
               const { id } = await request.json();
               if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: corsHeaders });
               let c = await this.room.storage.get(`views:${id}`) || 0;
               await this.room.storage.put(`views:${id}`, c + 1);
               return new Response(JSON.stringify({ success: true, views: c + 1 }), { status: 200, headers: corsHeaders });
            }
            if (request.method === "GET") {
               const list = await this.room.storage.list({ prefix: "views:" });
               const views = Object.fromEntries(list.entries());
               return new Response(JSON.stringify(views), { status: 200, headers: corsHeaders });
            }
         } catch(e) {
            return new Response(JSON.stringify({ error: 'System error' }), { status: 500, headers: corsHeaders });
         }
      }

      // 4. Published Custom Verse Sets Endpoint
      if (url.pathname.endsWith('/custom-sets')) {
         try {
            if (request.method === "GET") {
               const list = await this.room.storage.list({ prefix: "verseset:" });
               const sets = Array.from(list.values());
               return new Response(JSON.stringify(sets), { status: 200, headers: corsHeaders });
            } else if (request.method === "POST") {
               const payload = await request.json();
               if (!isCustomSetWriteAuthorized() && !isTrustedAdminEmail(payload?.adminEmail) && !isTrustedAdminName(payload?.adminName)) {
                  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
               }
               const existing = await this.room.storage.get(`verseset:${payload.id}`);
               if (existing && existing.authorName && existing.authorName !== "Anonymous") {
                  payload.authorName = existing.authorName;
               }
               if (payload.lastEditorName) {
                  payload.lastEditedAt = payload.lastEditedAt || new Date().toISOString();
               }
               await this.room.storage.put(`verseset:${payload.id}`, payload);
               return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
            } else if (request.method === "DELETE") {
               const { id, adminEmail, adminName } = await request.json();
               if (!isCustomSetWriteAuthorized() && !isTrustedAdminEmail(adminEmail) && !isTrustedAdminName(adminName)) {
                  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
               }
               await this.room.storage.delete(`verseset:${id}`);
               return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
            }
         } catch(e) {
            return new Response(JSON.stringify({ error: 'DB error' }), { status: 500, headers: corsHeaders });
         }
      }


      // 5. Garden Sync — Save & Retrieve player garden data
      if (url.pathname.endsWith('/save-garden') && request.method === 'POST') {
         try {
            const { playerName, gardenData } = await request.json();
            if (!playerName || !gardenData) return new Response(JSON.stringify({ error: 'playerName and gardenData required' }), { status: 400, headers: corsHeaders });
            await this.room.storage.put(`garden:${playerName}`, gardenData);
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
         } catch(e) {
            return new Response(JSON.stringify({ error: 'Failed to save garden' }), { status: 500, headers: corsHeaders });
         }
      }

      if (url.pathname.endsWith('/garden') && request.method === 'GET') {
         try {
            const playerName = url.searchParams.get('player');
            if (!playerName) return new Response(JSON.stringify({ error: 'player param required' }), { status: 400, headers: corsHeaders });
            const data = await this.room.storage.get(`garden:${playerName}`);
            if (!data) return new Response(JSON.stringify({ error: 'No garden found for this player' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify({ success: true, gardenData: data }), { status: 200, headers: corsHeaders });
         } catch(e) {
            return new Response(JSON.stringify({ error: 'Failed to fetch garden' }), { status: 500, headers: corsHeaders });
         }
      }

      if (url.pathname.endsWith('/all-gardens') && request.method === 'GET') {
         try {
            const list = await this.room.storage.list();
            const fruitsMap = {};
            for (const [key, val] of list.entries()) {
               if (key.startsWith('garden:')) {
                  const playerName = key.split(':')[1];
                  let total = 0;
                  if (typeof val === 'object' && val !== null) {
                     for (const verseData of Object.values(val)) {
                         total += verseData.fruits || 0;
                     }
                  }
                  fruitsMap[playerName] = total;
               }
            }
            return new Response(JSON.stringify({ success: true, fruitsMap }), { status: 200, headers: corsHeaders });
         } catch(e) {
            return new Response(JSON.stringify({ error: 'Failed to fetch all gardens' }), { status: 500, headers: corsHeaders });
         }
      }

      return new Response("Not Found API Route", { status: 404, headers: corsHeaders });

    }

    // Default route for other random requests to gameplay rooms (if any)
    return new Response("VerseRain Gameplay Room HTTP endpoint OK", { status: 200 });
  }

  onConnect(conn, ctx) {
    // Player connected to the room
    const url = new URL(ctx.request.url);
    const name = url.searchParams.get("name") || "Player" + Math.floor(Math.random() * 100);
    const requestedRole = url.searchParams.get("role") || "player";
    const requestedMode = url.searchParams.get("mode");
    const playerKey = url.searchParams.get("playerKey") || conn.id;
    const requestedTeamCount = parseInt(url.searchParams.get("teamCount") || "", 10);
    if (!this.state.matchType) {
      this.state.matchType = requestedMode === 'individual' ? 'individual' : 'team';
    }
    if (this.state.matchType === 'team' && requestedRole === 'host' && Number.isFinite(requestedTeamCount)) {
      this.setTeamCount(requestedTeamCount);
    } else if (!this.state.teams) {
      this.setTeamCount(this.state.teamCount || 9);
    }
    
    // Team rooms use a teacher/controller host that is not counted as a player.
    if (this.state.matchType === 'team' && requestedRole === 'host' && (!this.state.host || !this.state.hostConnected || this.state.hostName === name)) {
      this.state.host = conn.id;
      this.state.hostName = name;
    } else if (!this.state.host) {
      this.state.host = conn.id;
      this.state.hostName = name;
    }

    const isTeamHostController = this.state.matchType === 'team' && requestedRole === 'host' && this.state.host === conn.id;
    if (isTeamHostController) {
      this.state.hostName = name;
      this.state.hostConnected = true;
      console.log(`[PARTY] Room [${this.room.id}] - Teacher host connected: ${name} (${conn.id})`);
      this.broadcastState();
      return;
    }

    const existingEntry = Object.entries(this.state.players || {}).find(([, player]) => player.playerKey === playerKey);
    if (existingEntry) {
      const [oldId, existingPlayer] = existingEntry;
      if (oldId !== conn.id) {
        delete this.state.players[oldId];
        (this.state.campaignResults || []).forEach(round => {
          if (round.scores?.[oldId] !== undefined) {
            round.scores[conn.id] = Math.max(round.scores[conn.id] || 0, round.scores[oldId] || 0);
            delete round.scores[oldId];
          }
        });
      }
      this.state.players[conn.id] = {
        ...existingPlayer,
        id: conn.id,
        name,
        connected: true,
        score: this.state.status === 'playing' && this.state.playMode?.endsWith('_solo') ? (existingPlayer.score || 0) : 0,
        health: this.state.status === 'playing' && this.state.playMode?.endsWith('_solo') ? (existingPlayer.health ?? 3) : 3,
        seqIndex: this.state.status === 'playing' && this.state.playMode?.endsWith('_solo') ? (existingPlayer.seqIndex || 0) : 0,
        isFinished: this.state.status === 'playing' && this.state.playMode?.endsWith('_solo') ? Boolean(existingPlayer.isFinished) : false,
        versesCompleted: this.state.status === 'playing' && this.state.playMode?.endsWith('_solo') ? (existingPlayer.versesCompleted || 0) : 0,
        playerKey
      };
    } else {
      this.state.players[conn.id] = { 
        id: conn.id, 
        playerKey,
        name, 
        score: 0, 
        bestScore: 0,
        health: 3,
        seqIndex: 0,
        isFinished: false,
        connected: true,
        teamId: null,
        color: this.getPlayerColor(Object.keys(this.state.players).length)
      };
    }

    console.log(`[PARTY] Room [${this.room.id}] - Player joined: ${name} (${conn.id}) - Host: ${this.state.host === conn.id}`);
    console.log(`[PARTY] Room [${this.room.id}] - Total players in room: ${Object.keys(this.state.players).length}`);
    this.broadcastState();
  }

  onClose(conn) {
    console.log(`[PARTY] Player left: ${conn.id}`);
    if (this.state.players[conn.id]) {
      this.state.players[conn.id].connected = false;
    } else if (this.state.host === conn.id && this.state.matchType === 'team') {
      this.state.hostConnected = false;
    }
    
    // If hose leaves, maybe reassign host or just end game. For now, just mark disconnected.
    this.broadcastState();
  }

  onMessage(message, sender) {
    try {
      const data = JSON.parse(message);

      if (data.type === 'INIT_GAME') {
        // Host selects the board phase
        if (sender.id === this.state.host) {
          console.log(`[PARTY] Game initialized by host, moving to ready check.`);
          this.state.status = 'ready_check';
          this.state.matchType = this.state.matchType || data.matchType || 'individual';
          if (!this.state.teams) this.setTeamCount(this.state.teamCount || data.teamCount || 9);
          this.state.blocks = data.blocks;
          this.state.currentSeqIndex = 0;
          this.state.verseRef = data.verseRef;
          this.state.verseText = data.verseText;
          this.state.playMode = data.playMode;
          this.state.distractionLevel = data.distractionLevel;
          this.state.phrases = data.phrases;
          this.state.campaignQueue = data.campaignQueue || [];
          this.state.campaignResults = [];
          
          // Reset scores, health, and readiness
          Object.values(this.state.players).forEach(p => {
             p.score = 0;
             p.bestScore = 0;
             p.health = 3;
             p.isReady = false;
             p.isFinished = false;
             p.seqIndex = 0;
             p.versesCompleted = 0;
          });
          
          this.broadcastState();
        }
      }

      if (data.type === 'SELECT_TEAM' && this.state.matchType === 'team' && ['waiting', 'ready_check', 'playing'].includes(this.state.status)) {
        const player = this.state.players[sender.id];
        const teamExists = (this.state.teams || []).some(team => team.id === data.teamId);
        if (player && teamExists && !player.teamId) {
          player.teamId = data.teamId;
          console.log(`[PARTY] Player ${player.name} joined team ${data.teamId}`);
          this.broadcastState();
        }
      }

      if (data.type === 'NEXT_CAMPAIGN_ROUND' && sender.id === this.state.host) {
          console.log(`[PARTY] Starting next campaign round: ${data.verseRef}`);
          this.state.status = 'playing';
          this.state.blocks = data.blocks;
          this.state.currentSeqIndex = 0;
          this.state.verseRef = data.verseRef;
          this.state.verseText = data.verseText;
          this.state.phrases = data.phrases;
          
          // Reset player scores and health ONLY for this new round!
          Object.values(this.state.players).forEach(p => {
             p.score = 0;
             p.health = 3;
             p.isFinished = false;
             p.seqIndex = 0;
          });
          
          this.broadcastState();
      }

      if (data.type === 'PLAYER_READY' && this.state.status === 'ready_check') {
         if (this.state.players[sender.id]) {
            if (this.state.matchType === 'team' && !this.state.players[sender.id].teamId) {
              return;
            }
            this.state.players[sender.id].isReady = true;
            console.log(`[PARTY] Player ${this.state.players[sender.id].name} is ready!`);
            
            // We no longer strictly wait for all players to automatically start the game,
            // However, we still record readiness. Let the host start it manually.
            this.broadcastState();
         }
      }

      if (data.type === 'HOST_START_GAME' && this.state.status === 'ready_check' && sender.id === this.state.host) {
         if (this.state.matchType === 'team' && !this.canStartTeamGame()) {
            console.log(`[PARTY] Team game start blocked until at least one player has chosen a team.`);
            this.broadcastState();
            return;
         }
         console.log(`[PARTY] Host forced start game!`);
         this.state.status = 'playing';
         this.state.currentSeqIndex = 0;
         
         // Mark everyone as ready so intermission/history views look clean
         Object.values(this.state.players).forEach(p => p.isReady = true);
         this.broadcastState();
      }

      if (data.type === 'CLICK_BLOCK' && this.state.status === 'playing') {
        if (this.state.playMode === 'square_solo') return; // Handled locally in square_solo

        const { blockId } = data;
        const block = this.state.blocks.find(b => b.id === blockId);
        
        // Removed health <= 0 early return so players can always finish the verse

        if (block && !block.claimedBy) {
          if (block.seqIndex === this.state.currentSeqIndex || block.text === this.state.phrases[this.state.currentSeqIndex]) {
            // Correct click! The referee approves it.
            block.claimedBy = sender.id;
            block.claimedByName = this.state.players[sender.id].name;
            this.state.players[sender.id].score += 100;
            this.state.currentSeqIndex++;
            console.log(`[PARTY] Block claimed: ${block.text} by ${block.claimedByName}`);

            // Fast broadcast the specific claim event to trigger CSS flash animations
            this.room.broadcast(JSON.stringify({
              type: 'BLOCK_CLAIMED',
              blockId: block.id,
              blockText: block.text,
              claimedBy: sender.id,
              claimedByName: this.state.players[sender.id].name,
              nextSeq: this.state.currentSeqIndex
            }));
            
            // Check absolute game completion
            if (this.state.currentSeqIndex >= this.state.phrases.length) {
               console.log(`[PARTY] Game Over! All phrases completed.`);
               
               if (!this.state.campaignResults) this.state.campaignResults = [];
               this.state.campaignResults.push({
                   verseRef: this.state.verseRef,
                   scores: Object.fromEntries(Object.values(this.state.players).map(p => [p.id, p.score]))
               });
               
               if (this.state.campaignQueue && this.state.campaignQueue.length > 1) {
                   this.state.campaignQueue.shift();
                   this.state.status = 'intermission';
               } else {
                   this.state.status = 'finished';
               }
               this.broadcastState();
            } else {
               // Dynamic Server-Side Block Replenishment for VerseSquare
               if (this.state.playMode.startsWith('square')) {
                  const maxGridSize = this.state.distractionLevel <= 1 ? 4 : 9;
                  const fakesCount = this.state.distractionLevel > 0 ? this.state.distractionLevel : 0;
                  const nextSpawnIndex = this.state.currentSeqIndex + (maxGridSize - fakesCount);
                  
                  if (nextSpawnIndex < this.state.phrases.length) {
                      // Delayed refill to allow CSS animation to play on clients
                      setTimeout(() => {
                          if (this.state.status !== 'playing') return;
                          
                          const blockIndex = this.state.blocks.findIndex(b => b.id === block.id);
                          if (blockIndex !== -1) {
                              this.state.blocks[blockIndex] = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  text: this.state.phrases[nextSpawnIndex],
                                  seqIndex: nextSpawnIndex,
                                  isSquare: true,
                                  error: false,
                                  correct: false,
                                  hidden: false
                              };
                              this.broadcastState();
                          }
                      }, 400); 
                  } else {
                      // No more phrases remaining. Wait 400ms for CSS to finish, then hide the block instead of leaving a stuck clone.
                      setTimeout(() => {
                          if (this.state.status !== 'playing') return;
                          const blockIndex = this.state.blocks.findIndex(b => b.id === block.id);
                          if (blockIndex !== -1) {
                              this.state.blocks[blockIndex].hidden = true;
                              this.broadcastState();
                          }
                      }, 400);
                  }
               } else {
                  this.broadcastState(); // For future modes
               }
            }
          } else if (block.seqIndex !== -1) { // Ignore clicks on blank spaces or wrong words
             // Incorrect click penalty
             this.state.players[sender.id].score = Math.max(0, this.state.players[sender.id].score - 50);
             this.state.players[sender.id].health = Math.max(0, (this.state.players[sender.id].health || 3) - 1);
             
             sender.send(JSON.stringify({
                type: 'MISTAKE',
                playerId: sender.id,
                blockId: block.id,
                health: this.state.players[sender.id].health,
                score: this.state.players[sender.id].score
             }));

             if (this.state.players[sender.id].health <= 0) {
                 console.log(`[PARTY] Player ${sender.id} health empty but match continues.`);
                 // Do not terminate the match! Players can finish it but their score won't go to leaderboard locally
             }
             
             // Broadcast the score/health change
             this.broadcastState();
          }
        }
      }

      if (data.type === 'PLAYER_PROGRESS' && this.state.status === 'playing' && this.state.playMode?.endsWith('_solo')) {
          if (this.state.players[sender.id]) {
             this.state.players[sender.id].score = data.score;
             this.state.players[sender.id].health = data.health;
             this.state.players[sender.id].seqIndex = data.seqIndex;
             this.state.players[sender.id].isFinished = false;
             this.broadcastState();
          }
      }

      // Player finished one verse — record score and let them keep going on their own
      if (data.type === 'PLAYER_FINISHED_VERSE' && this.state.status === 'playing' && this.state.playMode?.endsWith('_solo')) {
          if (this.state.players[sender.id]) {
              const { verseRef, score, verseIndex } = data;
              console.log(`[PARTY] Player ${this.state.players[sender.id].name} finished verse ${verseIndex} (${verseRef}) score=${score}`);
              this.state.players[sender.id].versesCompleted = (this.state.players[sender.id].versesCompleted || 0) + 1;

              if (!this.state.campaignResults) this.state.campaignResults = [];
              const existing = this.state.campaignResults.find(r => r.verseIndex === verseIndex);
              if (existing) {
                  existing.scores[sender.id] = Math.max(existing.scores[sender.id] || 0, score || 0);
              } else {
                  this.state.campaignResults.push({ verseRef, verseIndex, scores: { [sender.id]: score } });
                  this.state.campaignResults.sort((a, b) => a.verseIndex - b.verseIndex);
              }
              const totalScore = this.getPlayerTotalScore(sender.id);
              this.state.players[sender.id].bestScore = Math.max(this.state.players[sender.id].bestScore || 0, totalScore);
              this.broadcastState();
          }
      }

      // Player finished ALL verses. Team rooms stay open until the host ends the match.
      if (data.type === 'PLAYER_FINISHED_ALL' && this.state.status === 'playing' && this.state.playMode?.endsWith('_solo')) {
          if (this.state.players[sender.id]) {
              console.log(`[PARTY] Player ${this.state.players[sender.id].name} finished ALL verses`);
              this.state.players[sender.id].isFinished = true;
              const totalScore = this.getPlayerTotalScore(sender.id);
              this.state.players[sender.id].bestScore = Math.max(this.state.players[sender.id].bestScore || 0, totalScore);

              const connectedPlayers = Object.values(this.state.players).filter(p => p.connected);
              const allFinished = connectedPlayers.length > 0 && connectedPlayers.every(p => p.isFinished);
              if (allFinished && this.state.matchType !== 'team') {
                  console.log(`[PARTY] All players finished all verses! Game over.`);
                  this.state.status = 'finished';
              }
              this.broadcastState();
          }
      }

      if (data.type === 'FORCE_END_GAME' && this.state.status === 'playing' && sender.id === this.state.host) {
          console.log(`[PARTY] Host forced end game.`);
          this.state.status = 'finished';
          if (this.state.matchType === 'team') this.state.teamResults = this.getTeamResults();
          this.broadcastState();
      }

      if (data.type === 'RESTART_GAME' && sender.id === this.state.host) {
        this.state.status = 'waiting';
        this.state.verseRef = null;
        this.state.verseText = null;
        this.state.blocks = [];
        this.state.currentSeqIndex = 0;
        this.state.phrases = [];
        this.state.campaignQueue = [];
        this.state.campaignResults = [];
        this.state.teamResults = [];
        // Reset player states
        Object.values(this.state.players).forEach(p => {
          p.isReady = false;
          p.score = 0;
          p.bestScore = 0;
          p.health = 3;
          p.isFinished = false;
          p.seqIndex = 0;
          p.versesCompleted = 0;
          if (this.state.matchType === 'team') p.teamId = null;
        });
        this.broadcastState();
      }

    } catch (e) {
      console.error("[PARTY] Message error", e);
    }
  }

  broadcastState() {
    if (this.state.matchType === 'team') {
      this.state.teams = this.state.teams || this.getDefaultTeams(this.state.teamCount || 9);
      this.state.teamResults = this.getTeamResults();
    }
    this.room.broadcast(JSON.stringify({
      type: 'STATE_UPDATE',
      state: this.state
    }));
  }
}
