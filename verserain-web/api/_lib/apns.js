import http2 from 'node:http2';
import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

// Shared helper: send an APNs alert to every iOS device token a user has
// registered under their personalCode (see api/save-apns-code.js). Signs the
// ES256 provider JWT with Node's built-in crypto (dsaEncoding 'ieee-p1363' =
// the raw r||s form APNs/JOSE expects) — no extra dependency, no jose.
//
// Requires the same secrets the daily-push cron uses, but set in Vercel:
//   APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY (PEM), optional APNS_BUNDLE_ID.
// Fails soft: missing env / empty inbox is a no-op, never an error.

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeProviderJwt(teamId, keyId, privateKeyPem) {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signingInput = `${header}.${claims}`;
  const sig = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

export async function sendReferralApns(code, { title, body, url, collapseId } = {}) {
  if (!code || !title || !body) return { sent: 0 };

  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKeyPem = process.env.APNS_PRIVATE_KEY;
  const bundleId = process.env.APNS_BUNDLE_ID || 'com.hopeofglory.verserain';
  const apnsHost = process.env.APNS_HOST || 'https://api.push.apple.com';
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!teamId || !keyId || !privateKeyPem || !redisUrl || !redisToken) return { sent: 0, mocked: true };

  const redis = new Redis({ url: redisUrl, token: redisToken });
  let tokens = [];
  try { tokens = (await redis.smembers(`apnstokens:${code}`)) || []; } catch { return { sent: 0 }; }
  if (!tokens.length) return { sent: 0 };

  let jwt;
  try { jwt = makeProviderJwt(teamId, keyId, privateKeyPem); } catch { return { sent: 0 }; }
  const payload = JSON.stringify({
    aps: { alert: { title, body: body.length > 200 ? body.slice(0, 200) + '…' : body }, sound: 'default', 'thread-id': 'referral' },
    url: url || 'https://www.verserain.com/',
  });

  const client = http2.connect(apnsHost);
  client.on('error', () => {});

  const sendOne = (token) => new Promise((resolve) => {
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 6 * 60 * 60),
      'apns-collapse-id': collapseId || '',
      'content-type': 'application/json',
    });
    let status = 0; let respBody = '';
    req.on('response', (h) => { status = h[':status']; });
    req.on('data', (c) => { respBody += c; });
    req.on('end', () => resolve({ token, status, respBody }));
    req.on('error', () => resolve({ token, status: 0, respBody: '' }));
    req.setTimeout(10000, () => { req.close(); resolve({ token, status: 0, respBody: 'timeout' }); });
    req.end(payload);
  });

  let sent = 0;
  const dead = [];
  const results = await Promise.all(tokens.map(sendOne));
  for (const r of results) {
    if (r.status === 200) { sent++; continue; }
    let reason = '';
    try { reason = JSON.parse(r.respBody)?.reason || ''; } catch { /* not json */ }
    if (r.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered') dead.push(r.token);
  }
  try { client.close(); } catch { /* ignore */ }
  if (dead.length) { try { await redis.srem(`apnstokens:${code}`, ...dead); } catch { /* ignore */ } }
  return { sent, dead: dead.length };
}
