import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractVoucherCode } from './voucherCode.js';

test('deep link from the voucher QR → code', () => {
  assert.equal(extractVoucherCode('https://www.verserain.com/#verify/ABCD2345'), 'ABCD2345');
  assert.equal(extractVoucherCode('https://verserain.com/?lang=zh#verify/abcd2345'), 'ABCD2345', 'lowercase is normalised');
  assert.equal(extractVoucherCode('#verify/ABCD2345'), 'ABCD2345');
  assert.equal(extractVoucherCode('https://verserain.com/#verify/ABCD2345?x=1'), 'ABCD2345', 'trailing query ignored');
});

test('bare code, tolerating spacing / dashes / case', () => {
  assert.equal(extractVoucherCode('ABCD2345'), 'ABCD2345');
  assert.equal(extractVoucherCode(' abcd-2345 '), 'ABCD2345');
  assert.equal(extractVoucherCode('ABCD 2345'), 'ABCD2345');
});

test('anything else → null', () => {
  assert.equal(extractVoucherCode(''), null);
  assert.equal(extractVoucherCode(null), null);
  assert.equal(extractVoucherCode('https://verserain.com/?ref=dvyBA6Q3pe'), null, 'a referral QR is not a voucher');
  assert.equal(extractVoucherCode('ABCD234'), null, '7 chars');
  assert.equal(extractVoucherCode('ABCD23456'), null, '9 chars');
  assert.equal(extractVoucherCode('https://verserain.com/#verify/ABCD23456'), null, '9-char deep link is not a code');
});
