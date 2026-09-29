import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId, youtubeBgmId } from './youtube.js';

const ID = '_-Au8saszWY';

test('parseYouTubeId reads every common link shape', () => {
  for (const link of [
    `https://youtu.be/${ID}?si=n7wwqpIvW-aObzS1`,
    `youtu.be/${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}&list=RD${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  ${ID}  `,
  ]) assert.equal(parseYouTubeId(link), ID, link);
});

test('parseYouTubeId rejects anything that is not a video link', () => {
  for (const bad of ['', 'hello', 'https://example.com/watch?v=' + ID, 'https://www.youtube.com/', 'https://www.youtube.com/watch?v=short', 'https://youtu.be/']) {
    assert.equal(parseYouTubeId(bad), '', bad);
  }
});

test('youtubeBgmId reads the stored choice', () => {
  assert.equal(youtubeBgmId(`youtube:${ID}`), ID);
  assert.equal(youtubeBgmId('youtube:'), '');
  assert.equal(youtubeBgmId('preset:rest'), '');
  assert.equal(youtubeBgmId(undefined), '');
});
