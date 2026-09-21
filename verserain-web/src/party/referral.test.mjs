import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvents, pickInviter, ipMatchAllowed, TOUCH_TTL_MS } from './referral.js';

const A = 'AAAAAAAAAA', B = 'BBBBBBBBBB', C = 'CCCCCCCCCC';
const DAY = 24 * 3600 * 1000;
const now = Date.parse('2026-09-22T00:00:00Z');

test('normalizeEvents sorts, dedupes per inviter (earliest wins), drops expired and bad codes', () => {
  const out = normalizeEvents([
    { inviter: C, kind: 'room', at: now - 5 * DAY },
    { inviter: A, kind: 'link', at: now - 10 * DAY },
    { inviter: A, kind: 'room', at: now - 2 * DAY },          // later duplicate of A → dropped
    { inviter: B, kind: 'link', at: now - 100 * DAY },        // expired
    { inviter: 'bad code', kind: 'link', at: now - 1 * DAY }, // invalid
    { inviter: C, kind: 'weird', at: now - 4 * DAY },         // later duplicate of C
  ], now);
  assert.deepEqual(out.map(e => [e.inviter, e.kind]), [[A, 'link'], [C, 'room']]);
});

test('pickInviter returns the earliest in-window touch that is not one of the account codes', () => {
  const events = [
    { inviter: B, kind: 'link', at: now - 20 * DAY },
    { inviter: A, kind: 'room', at: now - 30 * DAY },
  ];
  assert.equal(pickInviter(events, { now }).inviter, A);
  assert.equal(pickInviter(events, { now, ownCodes: [A, undefined, ''] }).inviter, B);
  assert.equal(pickInviter(events, { now, ownCodes: [A, B] }), null);
  assert.equal(pickInviter([], { now }), null);
  assert.equal(pickInviter([{ inviter: A, kind: 'link', at: now - TOUCH_TTL_MS - 1 }], { now }), null);
});

test('ipMatchAllowed only for new or recently created accounts', () => {
  assert.equal(ipMatchAllowed(null, now), true);
  assert.equal(ipMatchAllowed({ createdAt: new Date(now - 10 * DAY).toISOString() }, now), true);
  assert.equal(ipMatchAllowed({ createdAt: new Date(now - 200 * DAY).toISOString() }, now), false);
  assert.equal(ipMatchAllowed({}, now), false);
});
