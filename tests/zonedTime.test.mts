import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zonedWallTimeToEpoch,
  getZonedDate,
  computeDayEpochs,
  addCalendarDays,
  parseClock,
} from '../src/utils/zonedTime.ts';

const iso = (ms: number) => new Date(ms).toISOString();

test('Istanbul is UTC+3 all year', () => {
  assert.equal(iso(zonedWallTimeToEpoch(2026, 10, 15, 5, 12, 'Europe/Istanbul')), '2026-10-15T02:12:00.000Z');
});

test('New York follows DST (EDT before Nov 1, EST after)', () => {
  assert.equal(iso(zonedWallTimeToEpoch(2026, 10, 15, 5, 12, 'America/New_York')), '2026-10-15T09:12:00.000Z');
  assert.equal(iso(zonedWallTimeToEpoch(2026, 11, 5, 5, 12, 'America/New_York')), '2026-11-05T10:12:00.000Z');
});

test('half-hour offset zone (Kolkata)', () => {
  assert.equal(iso(zonedWallTimeToEpoch(2026, 10, 15, 5, 12, 'Asia/Kolkata')), '2026-10-14T23:42:00.000Z');
});

test('invalid zone does not throw', () => {
  assert.doesNotThrow(() => zonedWallTimeToEpoch(2026, 10, 15, 5, 12, 'Not/AZone'));
});

test('zoned calendar date can differ from the UTC date', () => {
  assert.deepEqual(getZonedDate(Date.UTC(2026, 9, 14, 22, 30), 'Europe/Istanbul'), { y: 2026, mo: 10, d: 15 });
});

test('isha after local midnight lands on the next calendar day', () => {
  const e = computeDayEpochs(
    { fajr: '03:10', sunrise: '05:00', dhuhr: '13:10', asr: '17:30', maghrib: '21:40', isha: '00:25' },
    { y: 2026, mo: 6, d: 20 },
    'Europe/London',
  );
  assert.equal(iso(e.isha), '2026-06-20T23:25:00.000Z');
  assert.ok(e.isha > e.maghrib);
});

test('calendar day arithmetic crosses year end', () => {
  assert.deepEqual(addCalendarDays({ y: 2026, mo: 12, d: 31 }, 1), { y: 2027, mo: 1, d: 1 });
});

test('parseClock accepts suffixes and rejects empty input', () => {
  assert.deepEqual(parseClock('05:12 (+03)'), [5, 12]);
  assert.equal(parseClock(''), null);
  assert.equal(parseClock(undefined), null);
});
