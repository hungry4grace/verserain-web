// 地 (dì / de) for the speech engine. Run: node --test src/lib/speechText.test.mjs
import assert from 'node:assert';
import { test } from 'node:test';
import { fixChineseHeteronymsForSpeech, toSpeechText } from './speechText.js';

const f = fixChineseHeteronymsForSpeech;

test('noun 地 becomes 第 so the engine says dì', () => {
  assert.strictEqual(f('謙卑的人必承受地土為業'), '謙卑的人必承受第土為業');
  assert.strictEqual(f('起初神創造天地'), '起初神創造天第');
  assert.strictEqual(f('願你的旨意行在地上，如同行在天上'), '願你的旨意行在第上，如同行在天上');
  assert.strictEqual(f('全地都要向耶和華歡呼'), '全第都要向耶和華歡呼');
  assert.strictEqual(f('直到地極'), '直到第極');
  assert.strictEqual(f('遍地，都'), '遍第，都');
  assert.strictEqual(f('一切地極和海上遠處的人'), '一切第極和海上遠處的人'); // 地極 wins over 切地
});

test('adverbial 地 after reduplication or 然/切 stays 地 (engine says de)', () => {
  assert.strictEqual(f('平平安安地去吧'), '平平安安地去吧');
  assert.strictEqual(f('你們白白地得來，也要白白地捨去'), '你們白白地得來，也要白白地捨去');
  assert.strictEqual(f('我要切切地尋求你'), '我要切切地尋求你');
  assert.strictEqual(f('心也大大地驚惶'), '心也大大地驚惶');
  assert.strictEqual(f('他必暗暗地保守我'), '他必暗暗地保守我');
  assert.strictEqual(f('忽然地來到'), '忽然地來到');
});

test('mixed sentence and simplified text', () => {
  assert.strictEqual(f('他們歡歡喜喜地回到地上'), '他們歡歡喜喜地回到第上');
  assert.strictEqual(f('谦卑的人必承受地土为业'), '谦卑的人必承受第土为业');
});

test('toSpeechText only touches Chinese', () => {
  assert.strictEqual(toSpeechText('承受地土', 'zh-TW'), '承受第土');
  assert.strictEqual(toSpeechText('承受地土', 'zh-CN'), '承受第土');
  assert.strictEqual(toSpeechText('inherit the land', 'en-US'), 'inherit the land');
  assert.strictEqual(toSpeechText('', 'zh-TW'), '');
});
