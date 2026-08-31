import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAXIMUM_LENGTH,
  DEFAULT_TARGET_LENGTH,
  defaultProtectedTerms,
  mergePassageSegmentations,
  normalizeScriptureText,
  segmentScripture,
  validateSegmentation,
  visibleLength
} from '../src/index.js';

test('defaults express an adjustable eight-character preference', () => {
  assert.equal(DEFAULT_TARGET_LENGTH, 8);
  assert.equal(DEFAULT_MAXIMUM_LENGTH, 10);
});

test('translation labels and marked editorial notes are not game text', () => {
  const result = normalizeScriptureText(
    '【和合本 CUV】\n眾人應當彼此扶持（或作：彼此幫助）。'
  );
  assert.equal(result.displayText, '眾人應當彼此扶持。');
  assert.equal(result.nonScriptureMetadataRemoved, true);
});

test('ordinary parenthetical text remains while a leading Psalm heading is removed', () => {
  assert.equal(
    normalizeScriptureText('眾人說（這是大衛所寫）也未可知。').displayText,
    '眾人說（這是大衛所寫）也未可知。'
  );
  const heading = normalizeScriptureText('（大衛的詩，交與伶長。）眾人當一同歌唱。');
  assert.equal(heading.displayText, '眾人當一同歌唱。');
  assert.equal(heading.superscriptionRemoved, true);
});

test('editorial-note-only and placeholder text are valid omissions', () => {
  for (const source of ['（有古卷加：此處另有一句。）', 'a']) {
    const result = segmentScripture(source);
    assert.equal(result.displayText, '');
    assert.deepEqual(result.fragments, []);
    assert.equal(result.healthState, 'VALID');
  }
});

test('authored punctuation outranks the length target', () => {
  const source = '願善意行在地上，如同行在心中。';
  const result = segmentScripture(source);
  assert.deepEqual(result.fragments, ['願善意行在地上，', '如同行在心中。']);
  assert.equal(result.fragments.join(''), source);
  assert.equal(result.healthState, 'VALID');
});

test('protected names are never split internally', () => {
  const source = '亞伯拉罕帶著以撒前往耶路撒冷，眾人隨後抵達。';
  const result = segmentScripture(source);
  const offsets = new Set(result.boundaryOffsets.slice(0, -1));
  for (const term of ['亞伯拉罕', '以撒', '耶路撒冷']) {
    const start = source.indexOf(term);
    for (let offset = start + 1; offset < start + term.length; offset += 1) {
      assert.equal(offsets.has(offset), false, `${term} split at ${offset}`);
    }
  }
  assert.equal(result.fragments.join(''), source);
});

test('long transliterated names may become standalone memory units', () => {
  const first = segmentScripture('王召提革拉．毘列色前來，眾人等候。');
  assert.ok(first.fragments.includes('提革拉．毘列色'));
  assert.equal(first.fragments.join(''), first.displayText);

  const second = segmentScripture('眾人落在古珊‧利薩田的手中。');
  assert.ok(second.fragments.some((fragment) => fragment.includes('古珊‧利薩田')));
  assert.equal(second.fragments.join(''), second.displayText);
});

test('genealogy-like text keeps complete names and original separators', () => {
  const source = '亞伯拉罕生以撒，以撒生雅各；雅各的兒子也在其中。';
  const result = segmentScripture(source);
  assert.equal(result.fragments.join(''), source);
  assert.ok(result.fragments.some((fragment) => /[，；]/u.test(fragment)));
  for (const name of ['亞伯拉罕', '以撒', '雅各']) {
    assert.ok(result.fragments.some((fragment) => fragment.includes(name)));
  }
});

test('semantic connectors are not stranded at an internal boundary', () => {
  const result = segmentScripture('眾人都很疲倦，然而他們仍然彼此扶持。');
  assert.equal(result.fragments.join(''), result.displayText);
  assert.ok(result.fragments.slice(0, -1).every((fragment) => !/然而[，,。；;：:]?$/u.test(fragment)));
  assert.ok(result.fragments.slice(1).every((fragment) => !/^的/u.test(fragment)));
});

test('a result never begins a later fragment with punctuation', () => {
  const source = '仁愛是長久忍耐，又願意扶持別人；眾人都得安慰。';
  const result = segmentScripture(source);
  assert.equal(result.fragments.join(''), source);
  assert.ok(result.fragments.slice(1).every((fragment) => !/^[，、。；：！？]/u.test(fragment)));
});

test('target length can change without becoming a hard character cutter', () => {
  const source = '耶路撒冷城中的眾人彼此問安並一同前行。';
  const result = segmentScripture(source, { targetLength: 6 });
  assert.equal(result.targetLength, 6);
  assert.equal(result.fragments.join(''), source);
  assert.ok(result.fragments.some((fragment) => fragment.includes('耶路撒冷')));
  assert.notEqual(result.healthState, 'NEEDS_REPAIR');
});

test('an approved exception is accepted only when exact reconstruction remains valid', () => {
  const source = '第一個完整片段，第二個完整片段。';
  const approved = segmentScripture(source, {
    approvedFragments: ['第一個完整片段，', '第二個完整片段。']
  });
  assert.equal(approved.healthState, 'VALID');
  assert.ok(approved.issues.includes('APPROVED_SEGMENTATION'));

  const damaged = segmentScripture(source, {
    approvedFragments: ['第一個完整片段，', '文字被改寫。']
  });
  assert.equal(damaged.healthState, 'NEEDS_REPAIR');
  assert.ok(damaged.issues.includes('EXACT_REASSEMBLY_FAILED'));
});

test('validation rejects a protected-term internal cut', () => {
  const source = '尼布甲尼撒王來到城中。';
  const validation = validateSegmentation({
    text: source,
    fragments: ['尼布甲', '尼撒王來到城中。'],
    boundaryOffsets: [3, source.length],
    protectedTerms: defaultProtectedTerms()
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('PROTECTED_TERM_SPLIT'));
});

test('an indivisible protected expression may remain long and is reported', () => {
  const source = '甲乙丙丁戊己庚辛壬癸子丑寅卯';
  const result = segmentScripture(source, {
    protectedTerms: [{ term: source, category: 'PHRASE' }]
  });
  assert.deepEqual(result.fragments, [source]);
  assert.equal(result.healthState, 'VALID_LONG');
  assert.equal(result.confidence, 'MEDIUM');
  assert.equal(result.voiceReady, false);
  assert.ok(result.issues.includes('LONG_FRAGMENT_EXCEPTION'));
  assert.ok(visibleLength(result.fragments[0]) > result.maximumLength);
});

test('a colon may join a short continuation across verse records', () => {
  assert.deepEqual(mergePassageSegmentations([
    { fragments: ['有人宣告：'] },
    { fragments: ['你們當回轉。', '眾人都聽見。'] }
  ]), ['有人宣告：你們當回轉。', '眾人都聽見。']);
});
