import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDayKey, recentDayKeys } from '../src/utils/dayKey.ts';

test('localDayKey pads month and day', () => {
  assert.equal(localDayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('recentDayKeys returns today first, then the previous days', () => {
  const keys = recentDayKeys(3, new Date(2026, 9, 2, 12));
  assert.deepEqual(keys, ['2026-10-02', '2026-10-01', '2026-09-30']);
});

test('recentDayKeys crosses month and year boundaries', () => {
  const keys = recentDayKeys(2, new Date(2026, 0, 1, 8));
  assert.deepEqual(keys, ['2026-01-01', '2025-12-31']);
});

test('recentDayKeys(7) covers exactly seven distinct days', () => {
  const keys = recentDayKeys(7, new Date(2026, 9, 21, 12));
  assert.equal(new Set(keys).size, 7);
  assert.equal(keys[0], '2026-10-21');
  assert.equal(keys[6], '2026-10-15');
});
