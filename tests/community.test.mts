import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  regionFromLocale,
  isValidPostPayload,
  isAllowedEmoji,
  reactionDocId,
  COMMUNITY_EMOJIS,
} from '../src/utils/community.ts';

test('region comes from the locale, not the language', () => {
  assert.equal(regionFromLocale('tr-TR'), 'TR');
  assert.equal(regionFromLocale('en_US'), 'US');
  assert.equal(regionFromLocale('zh-Hant-TW'), 'TW');
  assert.equal(regionFromLocale('en'), null);
  assert.equal(regionFromLocale(undefined), null);
});

test('accepts allowlisted templates with known params', () => {
  assert.equal(isValidPostPayload('hatim.completed', {}), true);
  assert.equal(isValidPostPayload('dhikr.milestone', { count: 1000, country: 'TR' }), true);
  assert.equal(isValidPostPayload('achievement', { title: 'prayer_streak_7' }), true);
});

test('rejects unknown templates and free text fields', () => {
  assert.equal(isValidPostPayload('free.text', {}), false);
  assert.equal(isValidPostPayload('hatim.completed', { message: 'merhaba' } as any), false);
});

test('rejects out-of-range counts and malformed countries', () => {
  assert.equal(isValidPostPayload('dhikr.milestone', { count: 0 }), false);
  assert.equal(isValidPostPayload('dhikr.milestone', { count: 1.5 }), false);
  assert.equal(isValidPostPayload('dhikr.milestone', { count: 2_000_000 }), false);
  assert.equal(isValidPostPayload('dhikr.milestone', { country: 'turkey' }), false);
});

test('rejects overlong titles', () => {
  assert.equal(isValidPostPayload('achievement', { title: 'x'.repeat(61) }), false);
});

test('only the five reaction emojis are allowed', () => {
  assert.equal(COMMUNITY_EMOJIS.length, 5);
  for (const emoji of COMMUNITY_EMOJIS) assert.equal(isAllowedEmoji(emoji), true);
  assert.equal(isAllowedEmoji('😈'), false);
});

test('reaction doc id is stable per user and emoji', () => {
  assert.equal(reactionDocId('abc', '🤲'), 'abc_0');
  assert.equal(reactionDocId('abc', '🤲'), reactionDocId('abc', '🤲'));
  assert.notEqual(reactionDocId('abc', '🤲'), reactionDocId('abc', '❤️'));
});

import { hatimPromptKey, filterBlockedAuthors } from '../src/utils/community.ts';

test('hatim prompt key changes with each completed hatim', () => {
  assert.equal(hatimPromptKey(1), 'hatim.completed:1');
  assert.notEqual(hatimPromptKey(1), hatimPromptKey(2));
});

test('blocked authors are removed from the feed', () => {
  const posts = [{ id: 'a', authorUid: 'u1' }, { id: 'b', authorUid: 'u2' }];
  assert.deepEqual(filterBlockedAuthors(posts, ['u2']).map((p) => p.id), ['a']);
  assert.equal(filterBlockedAuthors(posts, []).length, 2);
});
