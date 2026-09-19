// Admin whitelist for the Vercel API routes. Mirrors isTrustedAdminEmail in
// src/party/server.js — keep the two lists in sync.
export const ADMIN_EMAILS = [
  'samhsiung@gmail.com',
  'davidhwang1125@gmail.com',
  'hsiungsam@gmail.com',
  'hungry4grace@gmail.com',
  'verserain.admin@gmail.com',
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}
