import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countActiveDaysInWindow } from '../src/utils/streak.ts';

const today = new Date(2026, 9, 21, 12, 0, 0); // local noon, 21 Oct 2026

const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key;
};

test('counts days with at least one prayer inside the window', () => {
  const logs = {
    [day(0)]: { date: day(0), fajr: true, dhuhr: false },
    [day(2)]: { date: day(2), isha: true },
    [day(5)]: { date: day(5), asr: true },
  };
  assert.equal(countActiveDaysInWindow(logs, 7, today), 3);
});

test('a broken streak does not zero the window count', () => {
  // Yesterday is empty, so a streak would be 1 (today only), but the week still shows 2 active days.
  const logs = {
    [day(0)]: { date: day(0), fajr: true },
    [day(3)]: { date: day(3), dhuhr: true },
  };
  assert.equal(countActiveDaysInWindow(logs, 7, today), 2);
});

test('days with only unchecked prayers do not count', () => {
  const logs = { [day(1)]: { date: day(1), fajr: false, dhuhr: false } };
  assert.equal(countActiveDaysInWindow(logs, 7, today), 0);
});

test('days older than the window are ignored', () => {
  const logs = { [day(7)]: { date: day(7), fajr: true } };
  assert.equal(countActiveDaysInWindow(logs, 7, today), 0);
});
