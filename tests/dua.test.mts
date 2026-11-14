import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DUA_CATEGORIES,
  DUA_LIFETIME_MS,
  canAmen,
  computeDuaExpiresAtMs,
  duaAge,
  isDuaActive,
  isDuaCategory,
} from '../src/utils/duaRules.ts';

test('exactly the six fixed categories are accepted', () => {
  assert.deepEqual([...DUA_CATEGORIES], ['health', 'family', 'exam', 'provision', 'guidance', 'bereavement']);
  for (const key of DUA_CATEGORIES) assert.equal(isDuaCategory(key), true);
  assert.equal(isDuaCategory('Sağlık'), false);
  assert.equal(isDuaCategory('free text'), false);
  assert.equal(isDuaCategory(undefined), false);
});

test('a request expires exactly seven days after creation', () => {
  const created = Date.UTC(2026, 10, 1, 12, 0, 0);
  assert.equal(DUA_LIFETIME_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(computeDuaExpiresAtMs(created) - created, 7 * 24 * 60 * 60 * 1000);
});

test('a request is active until its expiry instant, not after', () => {
  const expiresAt = 1_000_000;
  assert.equal(isDuaActive(expiresAt, expiresAt - 1), true);
  assert.equal(isDuaActive(expiresAt, expiresAt), false);
  assert.equal(isDuaActive(expiresAt, expiresAt + 1), false);
});

test('nobody can amin their own request', () => {
  assert.equal(canAmen('uid-a', 'uid-a', false), false);
  assert.equal(canAmen('uid-a', 'uid-b', false), true);
});

test('an amin is allowed at most once and needs a signed-in viewer', () => {
  assert.equal(canAmen('uid-a', 'uid-b', true), false);
  assert.equal(canAmen('uid-a', null, false), false);
  assert.equal(canAmen('uid-a', undefined, false), false);
  assert.equal(canAmen('uid-a', '', false), false);
});

test('relative age picks the largest whole unit', () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  assert.deepEqual(duaAge(now - 30 * 1000, now), { unit: 'now', count: 0 });
  assert.deepEqual(duaAge(now - 5 * minute, now), { unit: 'minutes', count: 5 });
  assert.deepEqual(duaAge(now - 2 * hour - 10 * minute, now), { unit: 'hours', count: 2 });
  assert.deepEqual(duaAge(now - 3 * day, now), { unit: 'days', count: 3 });
  assert.deepEqual(duaAge(now + 5 * minute, now), { unit: 'now', count: 0 });
});
