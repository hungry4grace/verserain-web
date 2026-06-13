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

  // ─── LINE Login ─────────────────────────────────────────────────────────────
  // LINE uses the plain OAuth2 authorization-code flow: the web client
  // redirects to access.line.me and comes back with ?code=..., which it hands
  // to /oauth-login. We exchange the code for tokens here because that step
  // needs the channel secret (set with: npx partykit env add LINE_CHANNEL_SECRET),
  // then validate the returned id_token through LINE's verify endpoint, which
  // checks signature/expiry and echoes back the decoded claims.
  // Must match LINE_CHANNEL_ID in src/oauthConfig.js.
  static LINE_CHANNEL_ID = "2010381708";

  async verifyLineCode(code, redirectUri) {
    try {
      const secret = this.room.env.LINE_CHANNEL_SECRET;
      if (!secret || !Server.LINE_CHANNEL_ID) {
        console.error("LINE login not configured (LINE_CHANNEL_SECRET / LINE_CHANNEL_ID)");
        return null;
      }
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: String(code || ""),
          redirect_uri: String(redirectUri || ""),
          client_id: Server.LINE_CHANNEL_ID,
          client_secret: String(secret),
        }),
      });
      if (!tokenRes.ok) {
        console.error("LINE token exchange failed", tokenRes.status, await tokenRes.text().catch(() => ""));
        return null;
      }
      const tokens = await tokenRes.json();
      if (!tokens.id_token) return null;

      const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_token: tokens.id_token,
          client_id: Server.LINE_CHANNEL_ID,
        }),
      });
      if (!verifyRes.ok) return null;
      const payload = await verifyRes.json(); // { iss, sub, aud, name, picture, email? }
      if (payload.iss !== "https://access.line.me") return null;
      if (payload.aud !== Server.LINE_CHANNEL_ID) return null;
      return payload;
    } catch (e) {
      console.error("LINE code verify failed", e);
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

  // Move all data keyed by a (mutable) display name from oldName -> newName.
  //
  // playerName is NOT a stable identity (see the Teams note: identity is
  // email), yet garden + private-sets are still keyed by it for legacy
  // reasons. Renaming therefore used to orphan a user's progress under the
  // old name AND leave a stale duplicate on the leaderboard. This makes the
  // rename authoritative server-side so progress follows the account instead
  // of relying on the client's localStorage carrying it over (which breaks
  // across devices / in-app browsers). Merge semantics mirror the client:
  // per-verse max(stage, fruits); _activity merged per-day by max.
  async migratePlayerName(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    try {
      // --- garden:<name> ---
      const oldGarden = await this.room.storage.get(`garden:${oldName}`);
      if (oldGarden && typeof oldGarden === 'object') {
        const target = (await this.room.storage.get(`garden:${newName}`)) || {};
        const merged = { ...target };
        for (const [ref, entry] of Object.entries(oldGarden)) {
          if (ref === '_activity') continue;
          if (!merged[ref]) {
            merged[ref] = entry;
          } else {
            merged[ref] = {
              ...merged[ref],
              stage: Math.max(merged[ref].stage || 0, entry.stage || 0),
              fruits: Math.max(merged[ref].fruits || 0, entry.fruits || 0),
            };
          }
        }
        const act = { ...(target._activity || {}) };
        for (const [day, v] of Object.entries(oldGarden._activity || {})) {
          act[day] = Math.max(act[day] || 0, v || 0);
        }
        merged._activity = act;
        await this.room.storage.put(`garden:${newName}`, merged);
        await this.room.storage.delete(`garden:${oldName}`);
      }

      // --- private-sets:<name>[:...] (legacy blob + chunked per-set keys) ---
      const legacy = await this.room.storage.get(`private-sets:${oldName}`);
      if (legacy !== undefined) {
        if ((await this.room.storage.get(`private-sets:${newName}`)) === undefined) {
          await this.room.storage.put(`private-sets:${newName}`, legacy);
        }
        await this.room.storage.delete(`private-sets:${oldName}`);
      }
      const oldPrefix = `private-sets:${oldName}:`;
      const chunks = await this.room.storage.list({ prefix: oldPrefix });
      for (const [key, value] of chunks.entries()) {
        const tail = key.slice(oldPrefix.length);
        await this.room.storage.put(`private-sets:${newName}:${tail}`, value);
        await this.room.storage.delete(key);
      }
    } catch (e) {
      console.error("migratePlayerName failed", oldName, "->", newName, e);
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
              const { email, password, nickname, inviter } = await request.json();
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
              // Bind inviter (referral code from ?ref=) to this account so it
              // survives cross-device login — set once on creation only.
              const cleanInviter = typeof inviter === 'string' ? inviter.trim() : '';
              if (cleanInviter && !(user && user.invitedBy)) {
                 newUserObj.invitedBy = cleanInviter;
              } else if (user && user.invitedBy) {
                 newUserObj.invitedBy = user.invitedBy;
              }
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
              const { email, password, inviter } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });

              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);

              if (!user || user.password !== password) {
                 return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
              }

              // Enforce verification only if a verification code exists. (Allows old users without this flag to still login).
              if (user.verified === false) {
                 return new Response(JSON.stringify({ error: '請先驗證您的電子郵件 (Please verify your email first)', requiresVerification: true }), { status: 403, headers: corsHeaders });
              }

              // Late-bind inviter if a returning user logs in from a new
              // device with a ?ref= link in the URL and we never recorded it.
              const cleanInviter = typeof inviter === 'string' ? inviter.trim() : '';
              if (cleanInviter && !user.invitedBy) {
                 user.invitedBy = cleanInviter;
                 await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              }

              return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, isPremium: user.isPremium, invitedBy: user.invitedBy || null } }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.2. OAuth Login (Google / Apple / LINE).
        // Verifies the provider credential on the server, then matches or
        // auto-creates a user by email. No password is required because the
        // OAuth provider has already verified the email. Three credential
        // shapes are accepted:
        //   { idToken }      — Google "One Tap" / Apple Sign-In JWT we verify
        //                      against the provider's public keys.
        //   { accessToken }  — Google access token from the popup OAuth flow;
        //                      we verify it by calling Google's userinfo
        //                      endpoint, which only succeeds if the token is
        //                      live and was issued to OUR client_id (since
        //                      we never share it with another party).
        //   { code, redirectUri } — LINE authorization code from the redirect
        //                      flow; we exchange it using the channel secret
        //                      and verify the resulting id_token.
        if (url.pathname.endsWith('/oauth-login')) {
           try {
              const body = await request.json();
              const { provider, idToken, accessToken, code, redirectUri, inviter } = body;
              if (!provider || (!idToken && !accessToken && !code)) {
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
              } else if (provider === 'line') {
                 // { code, redirectUri } — authorization code from the LINE
                 // redirect flow; exchanged + verified server-side.
                 if (code) {
                    payload = await this.verifyLineCode(code, redirectUri);
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
              // LINE only returns an email once the channel is granted the
              // email permission — until then, key the account on sub.
              if (!email && provider === 'line') {
                 email = `line_${sub}@privaterelay.verserain.com`;
              }
              if (!email) {
                 return new Response(JSON.stringify({ error: 'OAuth token missing email' }), { status: 401, headers: corsHeaders });
              }
              const displayName = payload.name || payload.given_name || body.name || email.split('@')[0];

              // Bind inviter (referral code from ?ref=) to this account so it
              // survives cross-device login — set once, never overwrite.
              const cleanInviter = typeof inviter === 'string' ? inviter.trim() : '';

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
                 if (cleanInviter) user.invitedBy = cleanInviter;
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
                 if (cleanInviter && !user.invitedBy) { user.invitedBy = cleanInviter; dirty = true; }
                 if (dirty) await this.room.storage.put(`user:${email}`, user);
              }

              return new Response(JSON.stringify({
                 success: true,
                 user: {
                    email: user.email,
                    name: user.name || displayName,
                    isPremium: user.isPremium || false,
                    city: user.city,
                    country: user.country,
                    invitedBy: user.invitedBy || null
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
              
              const oldName = user.name;
              if (newPassword) user.password = newPassword;
              if (newName) user.name = newName;
              if (newCity !== undefined) user.city = newCity;
              if (newCountry !== undefined) user.country = newCountry;

              await this.room.storage.put(`user:${email.toLowerCase()}`, user);

              // Carry garden + private-sets to the new name so a rename never
              // orphans progress or duplicates the player on the leaderboard.
              if (newName && oldName && newName !== oldName) {
                 await this.migratePlayerName(oldName, newName);
              }

              return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.6 Bind inviter — user finds out after the fact that they never
        // got bound (their ?ref= URL got stripped by an iOS deep-link or
        // similar), and wants to attach themselves to a referrer. Set-once
        // only — already-bound accounts can't change their referrer this
        // way (prevents griefing / late-attribution farming).
        if (url.pathname.endsWith('/bind-inviter') && request.method === 'POST') {
           try {
              const { email, inviter } = await request.json();
              const cleanEmail = String(email || '').toLowerCase().trim();
              const cleanInviter = String(inviter || '').trim();
              if (!cleanEmail || !cleanInviter) {
                 return new Response(JSON.stringify({ error: 'email and inviter required' }), { status: 400, headers: corsHeaders });
              }
              const user = await this.room.storage.get(`user:${cleanEmail}`);
              if (!user) {
                 return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
              }
              if (user.invitedBy) {
                 return new Response(JSON.stringify({ success: true, invitedBy: user.invitedBy, alreadyBound: true }), { status: 200, headers: corsHeaders });
              }
              user.invitedBy = cleanInviter;
              await this.room.storage.put(`user:${cleanEmail}`, user);
              return new Response(JSON.stringify({ success: true, invitedBy: cleanInviter }), { status: 200, headers: corsHeaders });
           } catch (e) {
              return new Response(JSON.stringify({ error: 'Failed to bind inviter' }), { status: 500, headers: corsHeaders });
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


      // 4.7 Web Push subscriptions — per-user. The frontend hands us the
      // PushSubscription JSON (endpoint + keys) plus the user's IANA
      // timezone. The hourly GitHub Actions cron pulls the full list,
      // figures out which users it's currently 7am for, and sends the
      // notifications via the web-push library outside this room.
      if (url.pathname.endsWith('/save-push-subscription') && request.method === 'POST') {
         try {
            const body = await request.json();
            const { playerName, email, subscription, timezone, version, hour } = body;
            if (!playerName || !subscription || !subscription.endpoint) {
               return new Response(JSON.stringify({ error: 'playerName + subscription required' }), { status: 400, headers: corsHeaders });
            }
            // Use the subscription endpoint URL as the storage key so the same
            // device updating its subscription doesn't create duplicates.
            const id = subscription.endpoint;
            await this.room.storage.put(`push:${id}`, {
               playerName,
               email: email || '',
               subscription,
               timezone: timezone || 'Asia/Taipei',
               version: version || 'cuv',
               hour: typeof hour === 'number' ? hour : 7,
               updatedAt: new Date().toISOString(),
            });
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to save subscription' }), { status: 500, headers: corsHeaders });
         }
      }

      if (url.pathname.endsWith('/delete-push-subscription') && request.method === 'POST') {
         try {
            const { playerName, endpoint } = await request.json();
            if (endpoint) {
               // Targeted delete by endpoint (most precise).
               await this.room.storage.delete(`push:${endpoint}`);
            } else if (playerName) {
               // Fallback: wipe every subscription registered under this player.
               const list = await this.room.storage.list({ prefix: 'push:' });
               for (const [key, val] of list.entries()) {
                  if (val?.playerName === playerName) await this.room.storage.delete(key);
               }
            }
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to delete subscription' }), { status: 500, headers: corsHeaders });
         }
      }

      // GET /push-subscriptions — returns ALL subscriptions for the cron
      // sender. Requires the admin token (same token used to publish to
      // the global custom-sets list) so random fetchers can't enumerate.
      if (url.pathname.endsWith('/push-subscriptions') && request.method === 'GET') {
         try {
            if (!isCustomSetWriteAuthorized()) {
               return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
            }
            const list = await this.room.storage.list({ prefix: 'push:' });
            const subscriptions = Array.from(list.values());
            return new Response(JSON.stringify({ success: true, subscriptions }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to list subscriptions' }), { status: 500, headers: corsHeaders });
         }
      }

      // 4.6 Share-Set token — a link-based share path that doesn't require
      // the global publish flow. Any logged-in user can publish a set "by
      // link" without needing admin privileges or polluting the public
      // /custom-sets list. The frontend POSTs the full set when the user
      // clicks the share button; anyone with the URL can GET the set back
      // by id, no auth required.
      if (url.pathname.endsWith('/share-set') && request.method === 'POST') {
         try {
            const { set } = await request.json();
            if (!set || !set.id) {
               return new Response(JSON.stringify({ error: 'set { id } required' }), { status: 400, headers: corsHeaders });
            }
            const stored = { ...set, sharedAt: new Date().toISOString() };
            await this.room.storage.put(`shared:${set.id}`, stored);
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to save shared set' }), { status: 500, headers: corsHeaders });
         }
      }

      if (url.pathname.endsWith('/share-set') && request.method === 'GET') {
         try {
            const id = url.searchParams.get('id');
            if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: corsHeaders });
            const set = await this.room.storage.get(`shared:${id}`);
            if (!set) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify({ success: true, set }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to fetch shared set' }), { status: 500, headers: corsHeaders });
         }
      }

      // 4.5 Private Custom Verse Sets — per-user sync (replaces device-local
      // only storage). Distinct from `/custom-sets` (the global published-set
      // list everyone can see).
      //
      // Storage layout: each set is serialized to JSON then split into ~100KB
      // chunks, written as `private-sets:<playerName>:<setId>::part:<n>` keys.
      // This is necessary because Cloudflare Durable Object storage caps each
      // key VALUE at 131072 bytes — a single rich set (HTML description +
      // many full-chapter verses) can exceed that on its own. The legacy
      // single-key array at `private-sets:<playerName>` is still read on GET
      // as a final fallback during migration.
      // Cloudflare Durable Object storage caps each VALUE at 131072 UTF-8
      // bytes. JSON of a rich verse set (HTML description + many Chinese
      // verses) easily exceeds that; CJK chars are 3 bytes each in UTF-8 so
      // chunking by JS string length is unsafe. Encode to bytes, slice on
      // codepoint boundaries via TextDecoder's streaming mode (no
      // multi-byte char splits), then store each chunk as a string.
      // Cloudflare DO storage caps each VALUE at 131072 bytes. We use a
      // conservative 50000-byte chunk so headroom covers any internal
      // serialization overhead (UTF-16 expansion, structuredClone wrapper).
      const CHUNK_BYTES = 50000;
      const splitChunks = (str) => {
         const bytes = new TextEncoder().encode(str);
         if (bytes.length <= CHUNK_BYTES) return [str];
         const decoder = new TextDecoder('utf-8');
         const out = [];
         let pos = 0;
         while (pos < bytes.length) {
            let end = Math.min(pos + CHUNK_BYTES, bytes.length);
            // Walk back if the next byte is a UTF-8 continuation byte
            // (10xxxxxx) — would otherwise split a multi-byte char.
            while (end < bytes.length && (bytes[end] & 0xC0) === 0x80) end--;
            out.push(decoder.decode(bytes.subarray(pos, end)));
            pos = end;
         }
         return out;
      };
      if (url.pathname.endsWith('/save-private-sets') && request.method === 'POST') {
         try {
            const { playerName, sets } = await request.json();
            if (!playerName || !Array.isArray(sets)) {
               return new Response(JSON.stringify({ error: 'playerName and sets[] required' }), { status: 400, headers: corsHeaders });
            }
            const prefix = `private-sets:${playerName}:`;
            // Clear the legacy single-key blob (if any).
            await this.room.storage.delete(`private-sets:${playerName}`);
            // Wipe all existing per-set chunk keys for this user — simpler
            // and safer than incremental diff when set sizes change.
            const existingMap = await this.room.storage.list({ prefix });
            for (const key of existingMap.keys()) await this.room.storage.delete(key);
            // Re-write each set as one or more chunked keys.
            let totalChunks = 0;
            const failures = [];
            for (const set of sets) {
               if (!set || !set.id) continue;
               const json = JSON.stringify(set);
               const jsonBytes = new TextEncoder().encode(json).length;
               const chunks = splitChunks(json);
               for (let i = 0; i < chunks.length; i++) {
                  const chunkBytes = new TextEncoder().encode(chunks[i]).length;
                  try {
                     await this.room.storage.put(`${prefix}${set.id}::part:${i}/${chunks.length}`, chunks[i]);
                     totalChunks++;
                  } catch (putErr) {
                     failures.push({
                        setId: set.id,
                        title: set.title,
                        chunkIndex: i,
                        chunkBytes,
                        totalChunks: chunks.length,
                        setJsonBytes: jsonBytes,
                        error: String(putErr?.message || putErr),
                     });
                  }
               }
            }
            if (failures.length) {
               return new Response(JSON.stringify({ error: 'Failed to save some private sets', failures, savedChunks: totalChunks }), { status: 500, headers: corsHeaders });
            }
            return new Response(JSON.stringify({ success: true, count: sets.length, chunks: totalChunks }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to save private sets', detail: String(e?.message || e) }), { status: 500, headers: corsHeaders });
         }
      }

      if (url.pathname.endsWith('/private-sets') && request.method === 'GET') {
         try {
            const playerName = url.searchParams.get('player');
            if (!playerName) return new Response(JSON.stringify({ error: 'player param required' }), { status: 400, headers: corsHeaders });
            const prefix = `private-sets:${playerName}:`;
            const map = await this.room.storage.list({ prefix });
            // Group keys by setId, then reassemble each set's chunks in order.
            const bySet = new globalThis.Map();
            for (const [key, value] of map.entries()) {
               const tail = key.slice(prefix.length);
               // Match `<setId>::part:<idx>/<total>`. If a key doesn't match
               // this shape, treat as a non-chunked legacy per-set value
               // (whole set object) for backward compatibility with the prior
               // server version that wrote one key per set unchunked.
               const m = tail.match(/^(.+?)::part:(\d+)\/(\d+)$/);
               if (m) {
                  const setId = m[1];
                  const idx = parseInt(m[2], 10);
                  if (!bySet.has(setId)) bySet.set(setId, { chunks: [], legacy: null });
                  bySet.get(setId).chunks[idx] = value;
               } else if (value && typeof value === 'object' && value.id) {
                  bySet.set(tail, { chunks: null, legacy: value });
               }
            }
            const sets = [];
            for (const entry of bySet.values()) {
               if (entry.legacy) { sets.push(entry.legacy); continue; }
               if (!entry.chunks || entry.chunks.some(c => c == null)) continue; // skip incomplete
               try { sets.push(JSON.parse(entry.chunks.join(''))); }
               catch { /* skip corrupt */ }
            }
            // Final fallback: pre-chunking single-blob layout.
            if (!sets.length) {
               const legacy = await this.room.storage.get(`private-sets:${playerName}`);
               if (Array.isArray(legacy)) return new Response(JSON.stringify({ success: true, sets: legacy }), { status: 200, headers: corsHeaders });
            }
            return new Response(JSON.stringify({ success: true, sets }), { status: 200, headers: corsHeaders });
         } catch (e) {
            return new Response(JSON.stringify({ error: 'Failed to fetch private sets' }), { status: 500, headers: corsHeaders });
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

      // Export Users (Non-sensitive). Lives here, NOT in the POST-only block
      // above — this is an admin GET call, so gating it on POST made it
      // unreachable (it 404'd via GET). Accept both methods to be safe.
      if (url.pathname.endsWith('/export-users') && (request.method === 'GET' || request.method === 'POST')) {
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

      // 6. Teams — companionship reading groups (not competition).
      // Identity key is always email (lowercased). playerName is mutable
      // (see project_playername_evolution memory) and must NEVER be used
      // as a primary key here. Display names are resolved on read from
      // `user:<email>.name`.
      //
      // Storage layout:
      //   team:<teamId>                       compact team object (admins + members both inline; cap 200 members)
      //   team-invite:<inviteCode>            inviteCode -> teamId reverse index
      //   user-teams:<emailLower>             array of teamId the user belongs to
      //   team-schedule:<teamId>::part:<i>/<n> chunked schedule (reuses splitChunks)
      //   team-progress:<teamId>:<emailLower> per-member progress (separate keys, no chunk needed)
      //   team-cheer:<teamId>:<emailLower>    inbox of cheers received (capped to 50)
      //
      // Soft limits (server-enforced): 20 teams/user, 5 created/user, 8 admins/team, 200 members/team.
      const TEAMS_PREFIX = '/teams/';
      const isTeamRoute = url.pathname.includes(TEAMS_PREFIX) || url.pathname.endsWith('/my-teams');
      if (isTeamRoute) {
         const lc = (s) => String(s || '').trim().toLowerCase();
         const randId = (n) => {
            const a = 'abcdefghijkmnpqrstuvwxyz23456789';
            let s = '';
            const buf = new Uint8Array(n);
            crypto.getRandomValues(buf);
            for (let i = 0; i < n; i++) s += a[buf[i] % a.length];
            return s;
         };
         const newTeamId = () => 't_' + randId(8);
         const newInviteCode = () => (randId(3) + '-' + randId(4)).toUpperCase();
         const readTeam = async (teamId) => teamId ? await this.room.storage.get(`team:${teamId}`) : null;
         const isAdmin = (team, email) => !!team && Array.isArray(team.admins) && team.admins.includes(lc(email));
         const isMember = (team, email) => !!team && Array.isArray(team.members) && team.members.includes(lc(email));
         const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: corsHeaders });
         const err = (msg, status = 400) => json({ error: msg }, status);
         const addUserTeam = async (email, teamId) => {
            const key = `user-teams:${lc(email)}`;
            const list = (await this.room.storage.get(key)) || [];
            if (!list.includes(teamId)) {
               list.push(teamId);
               await this.room.storage.put(key, list);
            }
         };
         const removeUserTeam = async (email, teamId) => {
            const key = `user-teams:${lc(email)}`;
            const list = (await this.room.storage.get(key)) || [];
            const next = list.filter(t => t !== teamId);
            if (next.length) await this.room.storage.put(key, next);
            else await this.room.storage.delete(key);
         };

         // -------- Points (gamification — integrates with garden fruits) --------
         // Storage keys:
         //   points-journal:<email>:<eventKey>           idempotency receipt
         //   points-daily:<email>:<YYYY-MM-DD>           per-day action counts (for cap enforcement)
         //   team-fruits:<email>                          user's total fruits earned via teams (global, across teams)
         //   team-week-fruits:<teamId>:<weekKey>         team's weekly sum
         //   member-week-fruits:<teamId>:<weekKey>:<email>  member's weekly contribution
         //   team-week-active-set:<teamId>:<weekKey>     emails that earned >=1 point this week
         //
         // weekKey is the UTC Monday's YYYY-MM-DD — easier than ISO weeks and timezone-neutral.
         const todayUTC = () => new Date().toISOString().slice(0, 10);
         const weekKeyUTC = () => {
            const d = new Date();
            d.setUTCHours(0, 0, 0, 0);
            const day = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() - day + 1);
            return d.toISOString().slice(0, 10);
         };

         // awardPoints({ email, eventKey, points, source, teamId, daily })
         //   eventKey is the idempotency key under points-journal:<email>:<eventKey>.
         //   For daily-capped actions: daily = { bucket, cap } — if the bucket
         //   has reached cap today, return 0 (no points) but action still proceeds.
         //   Returns: points actually awarded (0 if dedup or cap hit).
         const awardPoints = async ({ email, eventKey, points, source, teamId, daily }) => {
            const e = lc(email);
            if (!e || !points || points <= 0) return 0;

            if (daily) {
               const dailyKey = `points-daily:${e}:${todayUTC()}`;
               const counts = (await this.room.storage.get(dailyKey)) || {};
               const cur = counts[daily.bucket] || 0;
               if (cur >= daily.cap) return 0;
               counts[daily.bucket] = cur + 1;
               await this.room.storage.put(dailyKey, counts);
               // Make eventKey unique per increment for journal audit.
               eventKey = `${eventKey}:${todayUTC()}:${counts[daily.bucket]}`;
            }

            const journalKey = `points-journal:${e}:${eventKey}`;
            if (await this.room.storage.get(journalKey)) return 0;
            const at = new Date().toISOString();
            await this.room.storage.put(journalKey, { points, source, teamId: teamId || '', at });

            // Bump global total
            const total = (await this.room.storage.get(`team-fruits:${e}`)) || 0;
            await this.room.storage.put(`team-fruits:${e}`, total + points);

            // Bump team-scoped weekly rollups
            if (teamId) {
               const wk = weekKeyUTC();
               const twKey = `team-week-fruits:${teamId}:${wk}`;
               const twTotal = (await this.room.storage.get(twKey)) || 0;
               await this.room.storage.put(twKey, twTotal + points);

               const mwKey = `member-week-fruits:${teamId}:${wk}:${e}`;
               const mwTotal = (await this.room.storage.get(mwKey)) || 0;
               await this.room.storage.put(mwKey, mwTotal + points);

               const aKey = `team-week-active-set:${teamId}:${wk}`;
               const aSet = (await this.room.storage.get(aKey)) || [];
               if (!aSet.includes(e)) {
                  aSet.push(e);
                  await this.room.storage.put(aKey, aSet);
               }
            }
            return points;
         };

         // POST /teams/create — body: { email, name, description?, settings? }
         if (url.pathname.endsWith('/teams/create') && request.method === 'POST') {
            try {
               const { email, name, description } = await request.json();
               if (!email || !name) return err('email and name required');
               const myTeams = (await this.room.storage.get(`user-teams:${lc(email)}`)) || [];
               if (myTeams.length >= 20) return err('You have reached the 20-team limit', 403);
               // Count teams this user has created (admins[0] == creator at time of create)
               let createdCount = 0;
               for (const tid of myTeams) {
                  const t = await readTeam(tid);
                  if (t && t.createdBy === lc(email)) createdCount++;
               }
               if (createdCount >= 5) return err('You have already created 5 teams', 403);

               const teamId = newTeamId();
               const inviteCode = newInviteCode();
               const team = {
                  id: teamId,
                  name: String(name).slice(0, 80),
                  description: String(description || '').slice(0, 500),
                  createdBy: lc(email),
                  createdAt: new Date().toISOString(),
                  admins: [lc(email)],
                  members: [lc(email)],
                  inviteCode,
                  settings: { allowMemberInvite: false }
               };
               await this.room.storage.put(`team:${teamId}`, team);
               await this.room.storage.put(`team-invite:${inviteCode}`, teamId);
               await addUserTeam(email, teamId);
               await awardPoints({ email, eventKey: `team-create:${teamId}`, points: 20, source: 'team-create', teamId });
               return json({ success: true, team });
            } catch (e) { return err('Failed to create team', 500); }
         }

         // GET /teams/get?id=<teamId>&email=<email>
         if (url.pathname.endsWith('/teams/get') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               // Resolve display names for admins+members
               const allEmails = Array.from(new Set([...(team.members || []), ...(team.admins || [])]));
               const displayNames = {};
               for (const e of allEmails) {
                  const u = await this.room.storage.get(`user:${e}`);
                  displayNames[e] = (u && (u.name || u.skoolName)) || e.split('@')[0];
               }
               return json({ success: true, team, displayNames });
            } catch (e) { return err('Failed to fetch team', 500); }
         }

         // POST /teams/update — body: { email, teamId, name?, description?, settings? }
         if (url.pathname.endsWith('/teams/update') && request.method === 'POST') {
            try {
               const { email, teamId, name, description, settings } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               if (typeof name === 'string' && name.trim()) team.name = name.slice(0, 80);
               if (typeof description === 'string') team.description = description.slice(0, 500);
               if (settings && typeof settings === 'object') team.settings = { ...team.settings, ...settings };
               await this.room.storage.put(`team:${teamId}`, team);
               return json({ success: true, team });
            } catch (e) { return err('Failed to update team', 500); }
         }

         // POST /teams/regen-invite — body: { email, teamId }
         if (url.pathname.endsWith('/teams/regen-invite') && request.method === 'POST') {
            try {
               const { email, teamId } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               if (team.inviteCode) await this.room.storage.delete(`team-invite:${team.inviteCode}`);
               team.inviteCode = newInviteCode();
               await this.room.storage.put(`team:${teamId}`, team);
               await this.room.storage.put(`team-invite:${team.inviteCode}`, teamId);
               return json({ success: true, inviteCode: team.inviteCode });
            } catch (e) { return err('Failed to regen invite', 500); }
         }

         // POST /teams/join — body: { email, inviteCode }
         // Accept invite codes with or without the dash, any case, and with
         // stray whitespace — match what the user reads off a screen, not
         // what we stored. Lookup key is always the canonical XXX-YYYY.
         const normalizeCode = (raw) => {
            const cleaned = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cleaned.length === 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
            return cleaned; // shorter or longer → let lookup fail naturally
         };
         if (url.pathname.endsWith('/teams/join') && request.method === 'POST') {
            try {
               const { email, inviteCode } = await request.json();
               if (!email || !inviteCode) return err('email and inviteCode required');
               const teamId = await this.room.storage.get(`team-invite:${normalizeCode(inviteCode)}`);
               if (!teamId) return err('Invalid invite code', 404);
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               const e = lc(email);
               if (team.members.includes(e)) return json({ success: true, alreadyMember: true, team });
               if (team.members.length >= 200) return err('Team is at capacity', 403);
               const myTeams = (await this.room.storage.get(`user-teams:${e}`)) || [];
               if (myTeams.length >= 20) return err('You have reached the 20-team limit', 403);
               team.members.push(e);
               await this.room.storage.put(`team:${teamId}`, team);
               await addUserTeam(email, teamId);
               return json({ success: true, team });
            } catch (e) { return err('Failed to join team', 500); }
         }

         // POST /teams/leave — body: { email, teamId }
         if (url.pathname.endsWith('/teams/leave') && request.method === 'POST') {
            try {
               const { email, teamId } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               const e = lc(email);
               if (!team.members.includes(e)) return err('Not a member', 403);
               // Sole admin cannot leave — must promote someone first or disband.
               if (team.admins.includes(e) && team.admins.length === 1) {
                  return err('You are the only admin. Promote another member first or disband the team.', 403);
               }
               team.members = team.members.filter(m => m !== e);
               team.admins = team.admins.filter(m => m !== e);
               await this.room.storage.put(`team:${teamId}`, team);
               await removeUserTeam(email, teamId);
               // Keep team-progress key intact (historical record).
               return json({ success: true });
            } catch (e) { return err('Failed to leave team', 500); }
         }

         // POST /teams/promote — body: { email, teamId, targetEmail }
         if (url.pathname.endsWith('/teams/promote') && request.method === 'POST') {
            try {
               const { email, teamId, targetEmail } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               const t = lc(targetEmail);
               if (!team.members.includes(t)) return err('Target is not a member', 400);
               if (team.admins.includes(t)) return json({ success: true, alreadyAdmin: true });
               if (team.admins.length >= 8) return err('Max 8 admins per team', 403);
               team.admins.push(t);
               await this.room.storage.put(`team:${teamId}`, team);
               return json({ success: true, team });
            } catch (e) { return err('Failed to promote', 500); }
         }

         // POST /teams/demote — body: { email, teamId, targetEmail }
         if (url.pathname.endsWith('/teams/demote') && request.method === 'POST') {
            try {
               const { email, teamId, targetEmail } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               const t = lc(targetEmail);
               if (!team.admins.includes(t)) return json({ success: true, notAdmin: true });
               if (team.admins.length === 1) return err('Cannot demote the only admin', 403);
               team.admins = team.admins.filter(m => m !== t);
               await this.room.storage.put(`team:${teamId}`, team);
               return json({ success: true, team });
            } catch (e) { return err('Failed to demote', 500); }
         }

         // POST /teams/disband — body: { email, teamId } — only creator OR sole admin
         if (url.pathname.endsWith('/teams/disband') && request.method === 'POST') {
            try {
               const { email, teamId } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               if (team.createdBy !== lc(email) && team.admins.length > 1) {
                  return err('Only the creator (or sole admin) can disband', 403);
               }
               // Sweep all related keys
               for (const m of team.members) await removeUserTeam(m, teamId);
               if (team.inviteCode) await this.room.storage.delete(`team-invite:${team.inviteCode}`);
               const sweepPrefixes = [
                  `team-schedule:${teamId}`,
                  `team-progress:${teamId}:`,
                  `team-cheer:${teamId}:`,
                  `team-reflection:${teamId}:`,
                  `team-week-fruits:${teamId}:`,
                  `member-week-fruits:${teamId}:`,
                  `team-week-active-set:${teamId}:`,
                  `team-verse-done:${teamId}:`,
                  `team-read:${teamId}:`,
               ];
               for (const pfx of sweepPrefixes) {
                  const m = await this.room.storage.list({ prefix: pfx });
                  for (const k of m.keys()) await this.room.storage.delete(k);
               }
               await this.room.storage.delete(`team:${teamId}`);
               return json({ success: true });
            } catch (e) { return err('Failed to disband', 500); }
         }

         // GET /my-teams?email=<email>
         if (url.pathname.endsWith('/my-teams') && request.method === 'GET') {
            try {
               const email = url.searchParams.get('email');
               if (!email) return err('email required');
               const e = lc(email);
               const ids = (await this.room.storage.get(`user-teams:${e}`)) || [];
               const teams = [];
               for (const tid of ids) {
                  const t = await readTeam(tid);
                  if (!t) continue;
                  // Per-team unread count: cheers in this user's inbox
                  // with timestamp > their last team-read marker. Capped
                  // at 99 for badge display; UI rounds down to "99+".
                  const lastReadAt = (await this.room.storage.get(`team-read:${tid}:${e}`)) || '';
                  const inbox = (await this.room.storage.get(`team-cheer:${tid}:${e}`)) || [];
                  let unreadCount = 0;
                  for (const c of inbox) {
                     if (!c.at || c.at > lastReadAt) unreadCount++;
                     if (unreadCount >= 99) break;
                  }
                  teams.push({
                     id: t.id,
                     name: t.name,
                     description: t.description,
                     memberCount: (t.members || []).length,
                     isAdmin: (t.admins || []).includes(e),
                     createdBy: t.createdBy,
                     createdAt: t.createdAt,
                     unreadCount,
                     lastReadAt,
                  });
               }
               return json({ success: true, teams });
            } catch (e) { return err('Failed to fetch teams', 500); }
         }

         // POST /teams/mark-read — body: { email, teamId }
         // Stamps the user's last-read marker. Subsequent /my-teams
         // calls will return unreadCount=0 until new cheers arrive.
         if (url.pathname.endsWith('/teams/mark-read') && request.method === 'POST') {
            try {
               const { email, teamId } = await request.json();
               if (!email || !teamId) return err('email and teamId required');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               await this.room.storage.put(`team-read:${teamId}:${lc(email)}`, new Date().toISOString());
               return json({ success: true });
            } catch (e) { return err('Failed to mark read', 500); }
         }

         // GET /teams/schedule?id=<teamId>&email=<email>
         if (url.pathname.endsWith('/teams/schedule') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const prefix = `team-schedule:${teamId}::part:`;
               const map = await this.room.storage.list({ prefix });
               const chunks = [];
               for (const [key, val] of map.entries()) {
                  const m = key.slice(prefix.length).match(/^(\d+)\/(\d+)$/);
                  if (m) chunks[parseInt(m[1], 10)] = val;
               }
               if (chunks.length === 0 || chunks.some(c => c == null)) {
                  return json({ success: true, schedule: { teamId, items: [] } });
               }
               try {
                  const schedule = JSON.parse(chunks.join(''));
                  return json({ success: true, schedule });
               } catch {
                  return json({ success: true, schedule: { teamId, items: [] } });
               }
            } catch (e) { return err('Failed to fetch schedule', 500); }
         }

         // POST /teams/schedule — body: { email, teamId, schedule: { items: [...] } }
         if (url.pathname.endsWith('/teams/schedule') && request.method === 'POST') {
            try {
               const { email, teamId, schedule } = await request.json();
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isAdmin(team, email)) return err('Admin only', 403);
               const normalized = {
                  teamId,
                  updatedAt: new Date().toISOString(),
                  items: Array.isArray(schedule?.items) ? schedule.items : []
               };
               // Wipe old chunks first.
               const prefix = `team-schedule:${teamId}::part:`;
               const existing = await this.room.storage.list({ prefix });
               for (const k of existing.keys()) await this.room.storage.delete(k);
               const chunks = splitChunks(JSON.stringify(normalized));
               for (let i = 0; i < chunks.length; i++) {
                  await this.room.storage.put(`${prefix}${i}/${chunks.length}`, chunks[i]);
               }
               // Per-item one-time awards for the admin: verses listed and a
               // meaningful description. Idempotent on item id so resaves don't
               // re-award. Quality gate on description (> 20 chars) avoids
               // farming a single-character placeholder.
               for (const it of normalized.items) {
                  if (Array.isArray(it.verses) && it.verses.length > 0) {
                     await awardPoints({
                        email, teamId,
                        eventKey: `schedule-item-verses:${teamId}:${it.id}`,
                        points: 10, source: 'schedule-item-verses',
                     });
                  }
                  if (typeof it.description === 'string' && it.description.trim().length > 20) {
                     await awardPoints({
                        email, teamId,
                        eventKey: `schedule-item-desc:${teamId}:${it.id}`,
                        points: 5, source: 'schedule-item-desc',
                     });
                  }
               }
               return json({ success: true, schedule: normalized });
            } catch (e) { return err('Failed to save schedule', 500); }
         }

         // POST /teams/progress/mark — DEPRECATED.
         if (url.pathname.endsWith('/teams/progress/mark') && request.method === 'POST') {
            return err('Self-marking is no longer supported.', 410);
         }

         // POST /teams/verse-complete — body: { email, teamId, itemId, setId, verseIndex, mode }
         // Records that this user completed one specific verse of a daily
         // reading plan. The "per-day" model treats each verse as its own
         // completion; play (TTS) and campaign both count per the user's
         // explicit preference. Idempotent per (team, email, setId, index)
         // so re-completing the same verse doesn't double-award.
         if (url.pathname.endsWith('/teams/verse-complete') && request.method === 'POST') {
            try {
               const { email, teamId, itemId, setId, verseIndex, mode } = await request.json();
               if (!email || !teamId || !setId || typeof verseIndex !== 'number') {
                  return err('email, teamId, setId, verseIndex required');
               }
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const e = lc(email);
               const key = `team-verse-done:${teamId}:${e}:${setId}:${verseIndex}`;
               const existing = await this.room.storage.get(key);
               if (!existing) {
                  await this.room.storage.put(key, {
                     at: new Date().toISOString(),
                     mode: mode === 'play' ? 'play' : 'campaign',
                     itemId: itemId || '',
                  });
               }
               // Award once per verse — points-journal idempotency mirrors
               // the storage write above, but uses an explicit eventKey so
               // future refactors don't accidentally double-pay.
               const awarded = await awardPoints({
                  email, teamId,
                  eventKey: `verse-done:${teamId}:${setId}:${verseIndex}`,
                  points: 3, source: 'verse-done',
               });
               return json({ success: true, alreadyDone: !!existing, pointsAwarded: awarded });
            } catch (e) { return err('Failed to record verse completion', 500); }
         }

         // GET /teams/team-set-progress?id=<teamId>&email=<email>
         // Returns { setStatus: { setId: { email: { doneCount, totalCount,
         //   doneIndices, status } } } }
         //
         // The per-day reading model: each schedule item is a verse-by-verse
         // plan. doneIndices[] are the verse positions this user has
         // completed (via play OR campaign). status is derived for the
         // viewer's convenience: 'passed' = all days done, 'attempting' =
         // some done, 'not-started' = none.
         if (url.pathname.endsWith('/teams/team-set-progress') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);

               // Read schedule chunks to collect (itemId, setId, totalCount) tuples.
               const schedPrefix = `team-schedule:${teamId}::part:`;
               const schedMap = await this.room.storage.list({ prefix: schedPrefix });
               const chunks = [];
               for (const [k, v] of schedMap.entries()) {
                  const m = k.slice(schedPrefix.length).match(/^(\d+)\/(\d+)$/);
                  if (m) chunks[parseInt(m[1], 10)] = v;
               }
               let schedule = { items: [] };
               try { schedule = JSON.parse(chunks.join('')); } catch { /* keep default */ }
               const items = (schedule.items || []).filter(it => it.setId);

               const memberEmails = team.members || [];
               const setStatus = {};

               // For each schedule item, scan storage for per-verse completions.
               // Single prefix list per item keeps this cheap even with many
               // members. Could batch further if N items × M members grows.
               for (const it of items) {
                  const totalCount = it.totalCount || (Array.isArray(it.verses) ? it.verses.length : 0);
                  const perEmail = {};
                  for (const e of memberEmails) {
                     perEmail[e] = { status: 'not-started', doneCount: 0, totalCount, doneIndices: [], lastAt: '' };
                  }
                  const prefix = `team-verse-done:${teamId}:`;
                  const map = await this.room.storage.list({ prefix });
                  for (const [k, v] of map.entries()) {
                     // key = team-verse-done:<teamId>:<email>:<setId>:<verseIndex>
                     const tail = k.slice(prefix.length);
                     const parts = tail.split(':');
                     if (parts.length < 3) continue;
                     const memberEmail = parts[0];
                     const recSetId = parts.slice(1, parts.length - 1).join(':'); // setId may contain hyphens
                     const idx = parseInt(parts[parts.length - 1], 10);
                     if (recSetId !== it.setId) continue;
                     if (!perEmail[memberEmail]) continue;
                     if (!perEmail[memberEmail].doneIndices.includes(idx)) {
                        perEmail[memberEmail].doneIndices.push(idx);
                     }
                     if (v && v.at && v.at > perEmail[memberEmail].lastAt) perEmail[memberEmail].lastAt = v.at;
                  }
                  for (const e of memberEmails) {
                     const slot = perEmail[e];
                     slot.doneCount = slot.doneIndices.length;
                     slot.status = totalCount > 0 && slot.doneCount >= totalCount
                        ? 'passed'
                        : slot.doneCount > 0
                           ? 'attempting'
                           : 'not-started';
                  }
                  setStatus[it.setId] = perEmail;
               }

               return json({ success: true, setStatus });
            } catch (e) { return err('Failed to fetch set progress', 500); }
         }

         // GET /teams/progress?id=<teamId>&email=<email> — returns all members' progress
         if (url.pathname.endsWith('/teams/progress') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const prefix = `team-progress:${teamId}:`;
               const map = await this.room.storage.list({ prefix });
               const progress = {};
               for (const [key, val] of map.entries()) {
                  const memberEmail = key.slice(prefix.length);
                  progress[memberEmail] = val;
               }
               return json({ success: true, progress });
            } catch (e) { return err('Failed to fetch progress', 500); }
         }

         // POST /teams/cheer — body: { email, teamId, targetEmail, emoji, text? }
         // text is optional, max 140 chars. No profanity filter at MVP —
         // trust within a small invite-only team. Revisit if abuse appears.
         if (url.pathname.endsWith('/teams/cheer') && request.method === 'POST') {
            try {
               const { email, teamId, targetEmail, emoji, text } = await request.json();
               const ALLOWED = ['❤️', '🙏', '✨', '🌧️'];
               if (!ALLOWED.includes(emoji)) return err('Invalid emoji');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               if (!isMember(team, targetEmail)) return err('Target not a member', 400);
               const trimmedText = typeof text === 'string' ? text.trim().slice(0, 140) : '';
               const key = `team-cheer:${teamId}:${lc(targetEmail)}`;
               const inbox = (await this.room.storage.get(key)) || [];
               const entry = { from: lc(email), emoji, at: new Date().toISOString() };
               if (trimmedText) entry.text = trimmedText;
               inbox.unshift(entry);
               // Cap at 50 most recent — quiet pruning, no notification.
               if (inbox.length > 50) inbox.length = 50;
               await this.room.storage.put(key, inbox);
               // Fire-and-forget web push: find this recipient's push
               // subscriptions and hand them to /api/push-team-cheer. The
               // push endpoint pulls VAPID keys from env and uses web-push
               // npm — DO storage can't host that lib, so we proxy via
               // Vercel. Failure here MUST NOT block the cheer write.
               (async () => {
                  try {
                     const targetLc = lc(targetEmail);
                     const subsMap = await this.room.storage.list({ prefix: 'push:' });
                     const subs = [];
                     for (const v of subsMap.values()) {
                        if (v && v.email && lc(v.email) === targetLc) subs.push(v.subscription);
                     }
                     if (subs.length === 0) return;
                     // Sender's name for the notification — fall back to
                     // email local-part so it's never blank.
                     const senderRec = await this.room.storage.get(`user:${lc(email)}`);
                     const senderName = (senderRec && (senderRec.name || senderRec.skoolName)) || lc(email).split('@')[0];
                     const title = `🌧️ ${senderName} ${trimmedText ? '留言給你' : '送你一個鼓勵'}`;
                     const body = trimmedText
                        ? `${emoji} ${trimmedText}`
                        : `${emoji} 在「${team.name}」團裡為你打氣`;
                     await fetch('https://www.verserain.com/api/push-team-cheer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                           subscriptions: subs.slice(0, 10),
                           title, body,
                           url: 'https://www.verserain.com/',
                           tag: `team-cheer-${teamId}`,
                        }),
                     });
                  } catch { /* silent */ }
               })();
               // Award giver: text cheer scores higher (effort + meaning) but
               // smaller daily allowance than emoji quick-tap. Caps prevent
               // farming via spam to many recipients.
               let awarded = 0;
               if (trimmedText) {
                  awarded = await awardPoints({
                     email, teamId,
                     eventKey: 'cheer-text',
                     points: 5, source: 'cheer-text',
                     daily: { bucket: 'cheerText', cap: 5 },
                  });
               } else {
                  awarded = await awardPoints({
                     email, teamId,
                     eventKey: 'cheer-quick',
                     points: 1, source: 'cheer-quick',
                     daily: { bucket: 'cheerQuick', cap: 10 },
                  });
               }
               return json({ success: true, pointsAwarded: awarded });
            } catch (e) { return err('Failed to send cheer', 500); }
         }

         // GET /teams/cheers?id=<teamId>&email=<email> — inbox for current user
         if (url.pathname.endsWith('/teams/cheers') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const inbox = (await this.room.storage.get(`team-cheer:${teamId}:${lc(email)}`)) || [];
               // lastReadAt lets the UI glow only cheers newer than the
               // viewer's previous visit. Empty string = first time.
               const lastReadAt = (await this.room.storage.get(`team-read:${teamId}:${lc(email)}`)) || '';
               return json({ success: true, cheers: inbox, lastReadAt });
            } catch (e) { return err('Failed to fetch cheers', 500); }
         }

         // Reflections & prayer requests on a schedule item. Storage key:
         //   team-reflection:<teamId>:<itemId>:<rid>
         // Reactions live inline on each reflection doc (read-modify-write);
         // DO storage serializes ops per room so there's no race with cheers.
         const REFLECT_TYPES = ['reflection', 'prayer'];
         const newReflectionId = () => 'r_' + randId(8);

         // POST /teams/reflections/create — body: { email, teamId, itemId, type, text, verseRef? }
         if (url.pathname.endsWith('/teams/reflections/create') && request.method === 'POST') {
            try {
               const { email, teamId, itemId, type, text, verseRef } = await request.json();
               if (!email || !teamId || !itemId) return err('email, teamId, itemId required');
               if (!REFLECT_TYPES.includes(type)) return err('type must be reflection or prayer');
               const body = String(text || '').trim();
               if (!body) return err('text required');
               if (body.length > 1000) return err('text too long (max 1000)');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const id = newReflectionId();
               const doc = {
                  id,
                  teamId,
                  itemId: String(itemId),
                  author: lc(email),
                  type,
                  text: body.slice(0, 1000),
                  verseRef: typeof verseRef === 'string' ? verseRef.trim().slice(0, 30) : '',
                  at: new Date().toISOString(),
                  reactions: [],
               };
               await this.room.storage.put(`team-reflection:${teamId}:${doc.itemId}:${id}`, doc);
               // Award the author. Per (team, item, day) — same item written
               // multiple times in one day yields one points event;
               // discourages spamming short posts to farm 15-point hits.
               const awarded = await awardPoints({
                  email, teamId,
                  eventKey: `${type === 'prayer' ? 'prayer' : 'reflection'}:${teamId}:${doc.itemId}:${todayUTC()}`,
                  points: 15, source: type === 'prayer' ? 'prayer-create' : 'reflection-create',
               });
               return json({ success: true, reflection: doc, pointsAwarded: awarded });
            } catch (e) { return err('Failed to create reflection', 500); }
         }

         // GET /teams/reflections?id=<teamId>&email=<email>[&itemId=<itemId>]
         // Returns reflections newest-first; itemId scopes to one schedule item.
         if (url.pathname.endsWith('/teams/reflections') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const itemId = url.searchParams.get('itemId') || '';
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const prefix = itemId
                  ? `team-reflection:${teamId}:${itemId}:`
                  : `team-reflection:${teamId}:`;
               const map = await this.room.storage.list({ prefix });
               const reflections = Array.from(map.values())
                  .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
               // Resolve author display names for convenience.
               const authors = Array.from(new Set(reflections.map(r => r.author)));
               const displayNames = {};
               for (const a of authors) {
                  const u = await this.room.storage.get(`user:${a}`);
                  displayNames[a] = (u && (u.name || u.skoolName)) || a.split('@')[0];
               }
               return json({ success: true, reflections, displayNames });
            } catch (e) { return err('Failed to fetch reflections', 500); }
         }

         // POST /teams/reflections/delete — body: { email, teamId, itemId, reflectionId }
         // Author can always delete own; admin can delete any (moderation).
         if (url.pathname.endsWith('/teams/reflections/delete') && request.method === 'POST') {
            try {
               const { email, teamId, itemId, reflectionId } = await request.json();
               if (!email || !teamId || !itemId || !reflectionId) return err('email, teamId, itemId, reflectionId required');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               const key = `team-reflection:${teamId}:${itemId}:${reflectionId}`;
               const doc = await this.room.storage.get(key);
               if (!doc) return err('Not found', 404);
               const me = lc(email);
               const isAuthor = doc.author === me;
               if (!isAuthor && !isAdmin(team, email)) return err('Author or admin only', 403);
               await this.room.storage.delete(key);
               return json({ success: true });
            } catch (e) { return err('Failed to delete reflection', 500); }
         }

         // POST /teams/reflections/react — body: { email, teamId, itemId, reflectionId, emoji }
         // Toggles: existing (from, emoji) is removed; otherwise added. A user
         // can have multiple reactions with different emojis, but at most one
         // of each emoji per user — matches LINE/Slack style and prevents spam.
         if (url.pathname.endsWith('/teams/reflections/react') && request.method === 'POST') {
            try {
               const { email, teamId, itemId, reflectionId, emoji } = await request.json();
               const ALLOWED = ['❤️', '🙏', '✨', '🌧️'];
               if (!ALLOWED.includes(emoji)) return err('Invalid emoji');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const key = `team-reflection:${teamId}:${itemId}:${reflectionId}`;
               const doc = await this.room.storage.get(key);
               if (!doc) return err('Not found', 404);
               const me = lc(email);
               const existing = (doc.reactions || []).find(r => r.from === me && r.emoji === emoji);
               let awarded = 0;
               let authorAwarded = 0;
               if (existing) {
                  // Toggling off — no refund (prevents button-cycling for points).
                  doc.reactions = doc.reactions.filter(r => !(r.from === me && r.emoji === emoji));
               } else {
                  doc.reactions = [...(doc.reactions || []), { from: me, emoji, at: new Date().toISOString() }];
                  // Reactor gets daily-capped points.
                  awarded = await awardPoints({
                     email, teamId,
                     eventKey: 'reaction',
                     points: 2, source: 'reaction-give',
                     daily: { bucket: 'reaction', cap: 20 },
                  });
                  // Author gets a one-time impact point per unique reactor on
                  // this reflection — rewards depth (writers whose posts move
                  // others) without rewarding the reactor's emoji choice.
                  if (doc.author && doc.author !== me) {
                     authorAwarded = await awardPoints({
                        email: doc.author, teamId,
                        eventKey: `reflection-impact:${reflectionId}:${me}`,
                        points: 2, source: 'reflection-impact',
                     });
                  }
               }
               await this.room.storage.put(key, doc);
               return json({ success: true, reactions: doc.reactions, pointsAwarded: awarded, authorPointsAwarded: authorAwarded });
            } catch (e) { return err('Failed to react', 500); }
         }

         // GET /teams/stats?id=<teamId>&email=<email>
         // Returns derived stats used by the team-detail "果園" panel.
         // No leaderboard, no per-member breakdown beyond what the viewer
         // themselves contributed.
         if (url.pathname.endsWith('/teams/stats') && request.method === 'GET') {
            try {
               const teamId = url.searchParams.get('id');
               const email = url.searchParams.get('email');
               const team = await readTeam(teamId);
               if (!team) return err('Team not found', 404);
               if (!isMember(team, email)) return err('Not a member', 403);
               const wk = weekKeyUTC();
               const me = lc(email);
               const weekTotal = (await this.room.storage.get(`team-week-fruits:${teamId}:${wk}`)) || 0;
               const myWeek = (await this.room.storage.get(`member-week-fruits:${teamId}:${wk}:${me}`)) || 0;
               const myTotal = (await this.room.storage.get(`team-fruits:${me}`)) || 0;
               const activeSet = (await this.room.storage.get(`team-week-active-set:${teamId}:${wk}`)) || [];
               return json({
                  success: true,
                  weekKey: wk,
                  weekTotal, myWeek, myTotal,
                  activeMembers: activeSet.length,
                  memberCount: (team.members || []).length,
               });
            } catch (e) { return err('Failed to fetch stats', 500); }
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
    const hostWantsToPlay = url.searchParams.get("hostPlays") === '1';
    if (!this.state.matchType) {
      this.state.matchType = requestedMode === 'individual' ? 'individual' : 'team';
    }
    if (this.state.matchType === 'team' && requestedRole === 'host' && Number.isFinite(requestedTeamCount)) {
      this.setTeamCount(requestedTeamCount);
    } else if (!this.state.teams) {
      this.setTeamCount(this.state.teamCount || 9);
    }
    // Remember whether the team-room host opted to also compete (vs. pure teacher/controller).
    if (this.state.matchType === 'team' && requestedRole === 'host') {
      this.state.hostPlays = hostWantsToPlay;
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
      if (!this.state.hostPlays) {
        // Pure teacher/controller host — not counted as a player.
        console.log(`[PARTY] Room [${this.room.id}] - Teacher host connected: ${name} (${conn.id})`);
        this.broadcastState();
        return;
      }
      // Host opted to compete too — fall through to be registered as a player below
      // (they remain this.state.host, so they keep host controls like starting the game).
      console.log(`[PARTY] Room [${this.room.id}] - Playing host connected: ${name} (${conn.id})`);
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
    }
    // A playing host is in both players and host — mark host disconnected regardless.
    if (this.state.host === conn.id && this.state.matchType === 'team') {
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
