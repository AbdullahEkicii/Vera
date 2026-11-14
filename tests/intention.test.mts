import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTENTION_MAX_LENGTH, isIntentionCurrent, nextMondayAt, sanitizeIntention, weekKey } from '../src/utils/intention.ts';

test('sanitizes whitespace and caps the length', () => {
  assert.equal(sanitizeIntention('  bu   hafta\n\tsabır  '), 'bu hafta sabır');
  assert.equal(sanitizeIntention('   '), '');
  assert.equal(sanitizeIntention('a'.repeat(500)).length, INTENTION_MAX_LENGTH);
});

test('week key is the Monday that starts the week', () => {
  // 2027-02-10 is a Wednesday; its week starts Monday 2027-02-08.
  assert.equal(weekKey(new Date(2027, 1, 10, 15)), '2027-02-08');
  assert.equal(weekKey(new Date(2027, 1, 8, 0, 5)), '2027-02-08');
  // Sunday belongs to the week that started the Monday before.
  assert.equal(weekKey(new Date(2027, 1, 14, 23)), '2027-02-08');
  assert.equal(weekKey(new Date(2027, 1, 15, 0, 1)), '2027-02-15');
});

test('next Monday is strictly in the future', () => {
  const wednesday = new Date(2027, 1, 10, 12);
  assert.equal(nextMondayAt(wednesday, 9, 0).getTime(), new Date(2027, 1, 15, 9, 0).getTime());
  // Monday after 09:00 moves to the following week.
  const mondayLate = new Date(2027, 1, 8, 10);
  assert.equal(nextMondayAt(mondayLate, 9, 0).getTime(), new Date(2027, 1, 15, 9, 0).getTime());
  // Monday before 09:00 is still today.
  const mondayEarly = new Date(2027, 1, 8, 7);
  assert.equal(nextMondayAt(mondayEarly, 9, 0).getTime(), new Date(2027, 1, 8, 9, 0).getTime());
});

test('an intention only counts for the week it was written in', () => {
  const now = new Date(2027, 1, 10);
  assert.equal(isIntentionCurrent({ week: '2027-02-08', text: 'sabır' }, now), true);
  assert.equal(isIntentionCurrent({ week: '2027-02-01', text: 'sabır' }, now), false);
  assert.equal(isIntentionCurrent({ week: '2027-02-08', text: '' }, now), false);
  assert.equal(isIntentionCurrent(null, now), false);
});
