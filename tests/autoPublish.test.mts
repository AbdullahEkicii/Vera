import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_AUTHOR_UID,
  EXTRA_DELAY_MS,
  LANGUAGE_COUNTRIES,
  MIN_DAILY_POSTS,
  TEMPLATE_WEIGHTS,
  buildAutoPost,
  buildDayPlan,
  dueSlots,
  pickWeighted,
  publisherDayKey,
  publisherTimeMs,
} from '../functions/autoPublishCore.js';
import { COMMUNITY_TEMPLATES } from '../src/utils/community.ts';

const DAY = '2026-11-06';

// Deterministic sequence in [0, 1) so each test is reproducible.
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test('the day key follows Istanbul time, not UTC', () => {
  // 2026-11-05 22:30 UTC is already 2026-11-06 01:30 in Istanbul.
  assert.equal(publisherDayKey(Date.UTC(2026, 10, 5, 22, 30)), '2026-11-06');
  assert.equal(publisherDayKey(Date.UTC(2026, 10, 5, 20, 30)), '2026-11-05');
});

test('base posts land between 08:00 and 22:00 Istanbul time', () => {
  const plan = buildDayPlan(DAY, sequence([0, 0.999]));
  assert.equal(plan.baseSlots.length, MIN_DAILY_POSTS);
  assert.equal(plan.baseSlots[0].at, publisherTimeMs(DAY, 8, 0));
  const last = plan.baseSlots[1].at;
  assert.ok(last >= publisherTimeMs(DAY, 8, 0));
  assert.ok(last < publisherTimeMs(DAY, 22, 0));
});

test('with no real posts only the minimum base posts are due', () => {
  const plan = buildDayPlan(DAY, sequence([0.5]));
  const now = publisherTimeMs(DAY, 23, 0);
  const due = dueSlots({ plan, realPostTimes: [], now });
  assert.deepEqual(
    due.map((s) => s.id),
    ['base-0', 'base-1']
  );
});

test('every 3 real posts add one automatic post, one hour after the third', () => {
  const plan = { dayKey: DAY, baseSlots: [], publishedSlots: [] };
  const t0 = publisherTimeMs(DAY, 9, 0);
  const real = [t0, t0 + 1000, t0 + 2000, t0 + 3000, t0 + 4000, t0 + 5000];

  // Two real posts: nothing yet.
  assert.deepEqual(dueSlots({ plan, realPostTimes: real.slice(0, 2), now: t0 + 60 * 60 * 1000 }), []);

  // Third real post at t0+2000 -> extra-1 due at t0+2000+1h.
  const afterThird = t0 + 2000 + EXTRA_DELAY_MS;
  assert.equal(dueSlots({ plan, realPostTimes: real.slice(0, 3), now: afterThird - 1 }).length, 0);
  const due = dueSlots({ plan, realPostTimes: real.slice(0, 3), now: afterThird });
  assert.deepEqual(due.map((s) => s.id), ['extra-1']);

  // Six real posts -> two extras.
  const sixDue = dueSlots({ plan, realPostTimes: real, now: t0 + 10 * 60 * 60 * 1000 });
  assert.deepEqual(sixDue.map((s) => s.id), ['extra-1', 'extra-2']);
});

test('slots already published are never due again', () => {
  const plan = buildDayPlan(DAY, sequence([0.5]));
  plan.publishedSlots = ['base-0', 'base-1'];
  const due = dueSlots({ plan, realPostTimes: [], now: publisherTimeMs(DAY, 23, 0) });
  assert.deepEqual(due, []);
});

test('the full-day prayer post is the most likely template', () => {
  const top = Object.entries(TEMPLATE_WEIGHTS).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top, 'prayer.fullday');
  assert.equal(pickWeighted(TEMPLATE_WEIGHTS, sequence([0])), 'prayer.fullday');
});

test('every generated post passes the same allowlist the client uses', async () => {
  const { isValidPostPayload } = await import('../src/utils/community.ts');
  const rnd = sequence([0.13, 0.57, 0.91, 0.02, 0.44, 0.73, 0.28, 0.86, 0.61]);
  for (let i = 0; i < 200; i += 1) {
    const post = buildAutoPost({ id: `base-${i}`, at: 0 }, DAY, rnd);
    assert.ok((COMMUNITY_TEMPLATES as readonly string[]).includes(post.templateKey));
    assert.equal(isValidPostPayload(post.templateKey, post.params), true, JSON.stringify(post.params));
    assert.equal(post.authorUid, AUTO_AUTHOR_UID);
    assert.equal(post.status, 'visible');
    assert.deepEqual(post.reactionCounts, {});
    assert.ok(Object.keys(LANGUAGE_COUNTRIES).includes(post.lang));
    assert.ok(/^[A-Z]{2}$/.test(post.params.country ?? ''));
  }
});

test('country always comes from a language the app ships', () => {
  for (const [lang, countries] of Object.entries(LANGUAGE_COUNTRIES)) {
    assert.ok(countries.length > 0, lang);
    for (const c of countries) assert.match(c, /^[A-Z]{2}$/);
  }
});
