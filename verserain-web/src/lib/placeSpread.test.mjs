import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spreadPoints } from './placeSpread.js';

const SIZE = 30;
const overlappingPairs = (ps) => {
  const out = [];
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (Math.abs(ps[i].x - ps[j].x) < SIZE && Math.abs(ps[i].y - ps[j].y) < SIZE) out.push([i, j]);
  }
  return out;
};

test('a lone point stays where it is', () => {
  const { positions, groups } = spreadPoints([{ x: 10, y: 20 }]);
  assert.deepEqual(positions, [{ x: 10, y: 20, moved: false }]);
  assert.equal(groups.length, 0);
});

test('two identical points are split side by side without overlapping', () => {
  const { positions, groups } = spreadPoints([{ x: 100, y: 100 }, { x: 100, y: 100 }]);
  assert.ok(positions.every(p => p.moved));
  assert.ok(Math.abs(positions[0].y - positions[1].y) < 1e-9, 'same row');
  assert.deepEqual(overlappingPairs(positions), []);
  assert.deepEqual(groups, [{ x: 100, y: 100, members: [0, 1] }]);
});

test('far-apart points are untouched', () => {
  const pts = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 200 }];
  const { positions, groups } = spreadPoints(pts);
  assert.ok(positions.every(p => !p.moved));
  assert.equal(groups.length, 0);
});

for (const n of [3, 4, 5, 6, 7, 12, 30, 60]) {
  test(`${n} stacked points never overlap as squares`, () => {
    const pts = Array.from({ length: n }, (_, i) => ({ x: 50 + (i % 3), y: 50 }));
    const { positions } = spreadPoints(pts);
    assert.deepEqual(overlappingPairs(positions), []);
  });
}

test('a spread-out group that would cover a neighbour absorbs it', () => {
  // Four stacked icons plus one 45 px away: the ring would land on it.
  const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 45, y: -12 }];
  const { positions } = spreadPoints(pts);
  assert.deepEqual(overlappingPairs(positions), []);
});

test('random crowds never overlap', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let round = 0; round < 20; round++) {
    const pts = Array.from({ length: 25 }, () => ({ x: rand() * 200, y: rand() * 200 }));
    const { positions } = spreadPoints(pts);
    assert.deepEqual(overlappingPairs(positions), [], `round ${round}`);
  }
});
