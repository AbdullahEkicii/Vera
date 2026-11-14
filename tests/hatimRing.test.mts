import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RING_PART_COUNT,
  allowedRingActions,
  isValidJuz,
  ringPartDocId,
  summarizeRing,
  type RingPart,
} from '../src/utils/hatimRing.ts';

const open = (juz: number): RingPart => ({ juz, status: 'open', claimedBy: null });
const claimed = (juz: number, by: string): RingPart => ({ juz, status: 'claimed', claimedBy: by });
const done = (juz: number, by: string): RingPart => ({ juz, status: 'done', claimedBy: by });

test('part ids are zero-padded so they sort in reading order', () => {
  assert.equal(ringPartDocId(1), '01');
  assert.equal(ringPartDocId(30), '30');
  assert.throws(() => ringPartDocId(0));
  assert.throws(() => ringPartDocId(31));
  assert.equal(isValidJuz(1.5), false);
});

test('summary counts only what the documents say', () => {
  const parts: RingPart[] = [done(1, 'me'), done(2, 'other'), claimed(3, 'me'), claimed(4, 'other'), open(5)];
  const summary = summarizeRing(parts, 'me');
  assert.equal(summary.doneCount, 2);
  assert.equal(summary.claimedCount, 2);
  assert.equal(summary.openCount, RING_PART_COUNT - 4);
  assert.equal(summary.mine, 3);
  assert.deepEqual(summary.mineDone, [1]);
  assert.equal(summary.complete, false);
});

test('missing parts count as open and duplicates are counted once', () => {
  const summary = summarizeRing([open(1), open(1), done(2, 'x')], 'me');
  assert.equal(summary.doneCount, 1);
  assert.equal(summary.openCount, RING_PART_COUNT - 1);
});

test('the ring is complete only when all 30 parts are done', () => {
  const all = Array.from({ length: RING_PART_COUNT }, (_, i) => done(i + 1, 'x'));
  assert.equal(summarizeRing(all, null).complete, true);
  assert.equal(summarizeRing(all.slice(1), null).complete, false);
});

test('one active claim per viewer', () => {
  assert.deepEqual(allowedRingActions(open(7), 'me', null), ['claim']);
  assert.deepEqual(allowedRingActions(open(7), 'me', 3), []);
});

test('only the claimant can finish or release a part', () => {
  assert.deepEqual(allowedRingActions(claimed(3, 'me'), 'me', 3), ['finish', 'release']);
  assert.deepEqual(allowedRingActions(claimed(3, 'other'), 'me', null), []);
  assert.deepEqual(allowedRingActions(done(3, 'me'), 'me', null), []);
});

test('no actions without a signed-in viewer', () => {
  assert.deepEqual(allowedRingActions(open(1), null, null), []);
});
