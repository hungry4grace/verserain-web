import assert from 'node:assert';
import { planReadback } from './voiceReadback.js';

const OPTS = { reviewMs: 3000, normalMs: 250 };
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

console.log('voice-mode readback plan:');

test('mid block: speak, mute mic, restart mic after, quick advance', () => {
  const p = planReadback({ text: '太初有道' }, { ...OPTS, isFinalBlock: false, hasSpeakText: true });
  assert.strictEqual(p.text, '太初有道');
  assert.strictEqual(p.shouldSpeak, true);
  assert.strictEqual(p.muteRecognition, true, 'must mute mic so TTS is not heard as input');
  assert.strictEqual(p.restartRecognitionAfter, true);
  assert.strictEqual(p.advanceDelayMs, 250);
});

test('final block: speak, mute mic, do NOT restart mic, long review delay', () => {
  const p = planReadback({ text: '道就是神' }, { ...OPTS, isFinalBlock: true, hasSpeakText: true });
  assert.strictEqual(p.shouldSpeak, true);
  assert.strictEqual(p.muteRecognition, true);
  assert.strictEqual(p.restartRecognitionAfter, false, 'game over — keep mic off');
  assert.strictEqual(p.advanceDelayMs, 3000);
});

test('accepts plain-string block', () => {
  const p = planReadback('神愛世人', { ...OPTS, isFinalBlock: false, hasSpeakText: true });
  assert.strictEqual(p.text, '神愛世人');
  assert.strictEqual(p.shouldSpeak, true);
});

test('no TTS available: do not speak, do not mute, still advance', () => {
  const p = planReadback({ text: '太初有道' }, { ...OPTS, isFinalBlock: false, hasSpeakText: false });
  assert.strictEqual(p.shouldSpeak, false);
  assert.strictEqual(p.muteRecognition, false);
  assert.strictEqual(p.restartRecognitionAfter, false);
  assert.strictEqual(p.advanceDelayMs, 250);
});

test('empty block text: do not speak, still advance', () => {
  const p = planReadback({ text: '' }, { ...OPTS, isFinalBlock: false, hasSpeakText: true });
  assert.strictEqual(p.shouldSpeak, false);
  assert.strictEqual(p.advanceDelayMs, 250);
});

test('empty final block: no speak but long review delay still applies', () => {
  const p = planReadback('', { ...OPTS, isFinalBlock: true, hasSpeakText: true });
  assert.strictEqual(p.shouldSpeak, false);
  assert.strictEqual(p.advanceDelayMs, 3000);
});

console.log(`\n${passed} assertions passed.`);
