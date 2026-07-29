// Run: node --test src/lib/bibleTextMarkup.test.mjs
import assert from 'node:assert';
import { test } from 'node:test';
import { stripBollsMarkup } from './bibleTextMarkup.js';

test("Strong's numbers are removed with their contents", () => {
  // Real bolls payload for Psalm 25:12 (KJV).
  const raw = 'What man<S>376</S> is he that feareth<S>3373</S> the LORD<S>3068</S>? him shall he teach<S>3384</S> in the way<S>1870</S> that he shall choose<S>977</S>.';
  assert.strictEqual(
    stripBollsMarkup(raw),
    'What man is he that feareth the LORD? him shall he teach in the way that he shall choose.'
  );
});

test('the regression this guards: numbers must not survive as bare digits', () => {
  const out = stripBollsMarkup('the meek<S>6035</S> shall inherit<S>3423</S> the earth<S>776</S>.');
  assert.ok(!/\d/.test(out), `digits leaked: ${out}`);
  assert.strictEqual(out, 'the meek shall inherit the earth.');
});

test('translator notes appended after the verse are dropped', () => {
  assert.strictEqual(
    stripBollsMarkup('His soul shall dwell at ease; and his seed shall inherit the earth. dwell: Heb. lodge in goodness'),
    'His soul shall dwell at ease; and his seed shall inherit the earth.'
  );
  assert.strictEqual(
    stripBollsMarkup('He healeth the broken in heart, and bindeth up their wounds. wounds: Heb. griefs'),
    'He healeth the broken in heart, and bindeth up their wounds.'
  );
  assert.strictEqual(
    stripBollsMarkup('with his stripes we are healed. wounded: or, tormented stripes: Heb. bruise'),
    'with his stripes we are healed.'
  );
});

test('a real mid-verse colon is NOT treated as a note marker', () => {
  const text = 'he was bruised for our iniquities: the chastisement of our peace was upon him.';
  assert.strictEqual(stripBollsMarkup(text), text);
});

test('<i> keeps its contents — those are words of the verse', () => {
  assert.strictEqual(stripBollsMarkup('太初有<i>道</i>，道與神同在'), '太初有道，道與神同在');
});

test('<br> becomes a space; whitespace before punctuation is tidied', () => {
  assert.strictEqual(stripBollsMarkup('first line<br>second line'), 'first line second line');
  assert.strictEqual(stripBollsMarkup('a word <i></i> , and more'), 'a word, and more');
});

test('Hebrew caesura (a run of non-breaking spaces) survives as a double space', () => {
  // Real bolls HAC payload for Psalm 37:27 —   runs mark the Masoretic break.
  const raw = 'כז  סור מרע ועשה-טוב    ושכן לעולם';
  const out = stripBollsMarkup(raw);
  assert.strictEqual(out, 'כז  סור מרע ועשה-טוב  ושכן לעולם');
  assert.strictEqual(out.split(/\s{2,}/).length, 3, 'two structural gaps should remain detectable');
});

test('ordinary single spaces are never widened into a false boundary', () => {
  assert.strictEqual(stripBollsMarkup('יהוה רעי לא אחסר'), 'יהוה רעי לא אחסר');
  assert.strictEqual(stripBollsMarkup('Trust in the LORD'), 'Trust in the LORD');
});

test('empty / null input is safe', () => {
  for (const v of ['', null, undefined]) assert.strictEqual(stripBollsMarkup(v), '');
});
