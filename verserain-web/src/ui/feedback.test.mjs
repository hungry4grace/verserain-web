// node --test src/ui/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessToastKind, toastDuration, toast, confirmDialog, _bindToastHost, _bindDialogHost } from './feedback.js';

test('kind is guessed from zh / en text', () => {
  assert.equal(guessToastKind('上傳失敗:timeout'), 'error');
  assert.equal(guessToastKind('Upload failed: timeout'), 'error');
  assert.equal(guessToastKind('已複製代碼'), 'success');
  assert.equal(guessToastKind('背景音樂已上傳 ✓'), 'success');
  assert.equal(guessToastKind('今天的聆聽分數已經滿 20 節了'), 'info');
});

test('errors stay longer, long messages stay longer, within bounds', () => {
  assert.equal(toastDuration('短', 'info'), 3000);
  assert.equal(toastDuration('短', 'error'), 4500);
  assert.equal(toastDuration('x'.repeat(500), 'info'), 7000);
});

test('a toast shown before the host mounts is delivered on bind; null dismisses', () => {
  toast.error('boom');
  const seen = [];
  const unbind = _bindToastHost((item) => seen.push(item));
  assert.equal(seen[0].kind, 'error');
  assert.equal(seen[0].message, 'boom');
  toast(null);
  assert.equal(seen[1], null);
  toast('已儲存');
  assert.equal(seen[2].kind, 'success');
  unbind();
});

test('confirmDialog resolves with the host answer', async () => {
  const unbind = _bindDialogHost((item) => item.resolve(item.danger === true));
  assert.equal(await confirmDialog({ message: 'Delete?', danger: true }), true);
  assert.equal(await confirmDialog({ message: 'Go?' }), false);
  unbind();
});
