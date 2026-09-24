import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReferralCode, REFERRAL_CODE_RE } from './referralCode.js';

test('share link from the referral QR → code, case preserved', () => {
  assert.equal(extractReferralCode('https://verserain.com/?ref=dvyBA6Q3pe&lang=zh'), 'dvyBA6Q3pe');
  assert.equal(extractReferralCode('https://www.verserain.com/?lang=en&ref=dvyBA6Q3pe'), 'dvyBA6Q3pe');
  assert.equal(extractReferralCode('https://verserain.com/?ref=dvyBA6Q3pe#map'), 'dvyBA6Q3pe', 'hash after the query');
  assert.equal(extractReferralCode('/?ref=dvyBA6Q3pe'), 'dvyBA6Q3pe', 'relative link');
});

test('bare code, whitespace trimmed, case kept', () => {
  assert.equal(extractReferralCode('dvyBA6Q3pe'), 'dvyBA6Q3pe');
  assert.equal(extractReferralCode('  dvyBA6Q3pe \n'), 'dvyBA6Q3pe');
  assert.ok(REFERRAL_CODE_RE.test('ABCDEFGHJK'));
});

test('anything else → null', () => {
  assert.equal(extractReferralCode(''), null);
  assert.equal(extractReferralCode(null), null);
  assert.equal(extractReferralCode('https://www.verserain.com/#verify/ABCD2345'), null, 'a voucher QR is not a referral code');
  assert.equal(extractReferralCode('https://verserain.com/?ref=short'), null, 'link with a bad ref');
  assert.equal(extractReferralCode('dvyBA6Q3p'), null, '9 chars');
  assert.equal(extractReferralCode('dvyBA6Q3peX'), null, '11 chars');
  assert.equal(extractReferralCode('dvyBA0Q3pe'), null, '0 is not in the alphabet');
  assert.equal(extractReferralCode('dvyBAOQ3pe'), null, 'O is not in the alphabet');
  assert.equal(extractReferralCode('dvyBA1Q3pe'), null, '1 is not in the alphabet');
  assert.equal(extractReferralCode('dvyBAIQ3pe'), null, 'I is not in the alphabet');
  assert.equal(extractReferralCode('dvyBAlQ3pe'), null, 'l is not in the alphabet');
});
