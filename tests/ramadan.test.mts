import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDaysBetween, parseDdMmYyyy, pickDailyIndex, ramadanPhase } from '../src/utils/ramadan.ts';

test('parses the API date format DD-MM-YYYY as a local day', () => {
  const date = parseDdMmYyyy('08-02-2027');
  assert.ok(date);
  assert.equal(date.getFullYear(), 2027);
  assert.equal(date.getMonth(), 1);
  assert.equal(date.getDate(), 8);
  assert.equal(parseDdMmYyyy('2027-02-08'), null);
  assert.equal(parseDdMmYyyy(undefined), null);
  assert.equal(parseDdMmYyyy('31-02-2027')?.getMonth(), 2, 'overflowing days roll into the next month');
});

test('counts calendar days, ignoring the time of day', () => {
  const a = new Date(2027, 1, 1, 23, 59);
  const b = new Date(2027, 1, 8, 0, 1);
  assert.equal(calendarDaysBetween(a, b), 7);
  assert.equal(calendarDaysBetween(b, a), -7);
});

test('counts down to the first day, then shows the day of the month', () => {
  const start = new Date(2027, 1, 8);
  assert.deepEqual(ramadanPhase(new Date(2027, 1, 1, 12), start, 30), { kind: 'before', daysLeft: 7 });
  assert.deepEqual(ramadanPhase(new Date(2027, 1, 8, 9), start, 30), { kind: 'during', day: 1, total: 30 });
  assert.deepEqual(ramadanPhase(new Date(2027, 2, 9), start, 30), { kind: 'during', day: 30, total: 30 });
  assert.deepEqual(ramadanPhase(new Date(2027, 2, 10), start, 30), { kind: 'after' });
});

test('a 29-day month ends one day earlier', () => {
  const start = new Date(2027, 1, 8);
  assert.deepEqual(ramadanPhase(new Date(2027, 2, 8), start, 29), { kind: 'during', day: 29, total: 29 });
  assert.deepEqual(ramadanPhase(new Date(2027, 2, 9), start, 29), { kind: 'after' });
});

test('daily index is stable within a day and stays in range', () => {
  const day = new Date(2027, 1, 10, 8);
  assert.equal(pickDailyIndex(day, 8), pickDailyIndex(new Date(2027, 1, 10, 23), 8));
  for (let d = 0; d < 400; d += 1) {
    const index = pickDailyIndex(new Date(2027, 0, 1 + d), 8);
    assert.ok(index >= 0 && index < 8);
  }
  assert.equal(pickDailyIndex(day, 0), 0);
});
