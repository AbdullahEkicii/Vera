import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_PHASE_COUNT,
  FEED_NOTIFICATION_TYPE,
  NOTIFY_LANGUAGES,
  SPACED_PHASE_END,
  buildNotifyMessage,
  isQuietHour,
  nextNotifyDelayMs,
  notificationCopy,
  shouldNotifyNow,
} from '../functions/notifyCore.js';
import { LANGUAGE_COUNTRIES } from '../functions/autoPublishCore.js';

const DAY = 24 * 60 * 60 * 1000;
const at = (hourIstanbul: number) => Date.UTC(2026, 10, 6, hourIstanbul - 3, 0);

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test('first notifications are at most one a day', () => {
  for (let sent = 0; sent < DAILY_PHASE_COUNT; sent += 1) {
    assert.equal(nextNotifyDelayMs(sent, sequence([0.9])), DAY);
  }
});

test('then every 2 or 3 days until the 15th', () => {
  assert.equal(nextNotifyDelayMs(DAILY_PHASE_COUNT, sequence([0])), 2 * DAY);
  assert.equal(nextNotifyDelayMs(DAILY_PHASE_COUNT, sequence([0.99])), 3 * DAY);
  assert.equal(nextNotifyDelayMs(SPACED_PHASE_END - 1, sequence([0.4])), 2 * DAY);
  assert.equal(nextNotifyDelayMs(SPACED_PHASE_END - 1, sequence([0.5])), 3 * DAY);
});

test('after the 15th it is once a week', () => {
  assert.equal(nextNotifyDelayMs(SPACED_PHASE_END, sequence([0])), 7 * DAY);
  assert.equal(nextNotifyDelayMs(40, sequence([0.5])), 7 * DAY);
});

test('quiet hours block sends between 23:00 and 08:00 Istanbul time', () => {
  assert.equal(isQuietHour(at(23)), true);
  assert.equal(isQuietHour(at(2)), true);
  assert.equal(isQuietHour(at(7)), true);
  assert.equal(isQuietHour(at(8)), false);
  assert.equal(isQuietHour(at(20)), false);
});

test('a send waits for the cadence and quiet hours', () => {
  const state = { sentCount: 1, nextAllowedMs: at(20) };
  assert.equal(shouldNotifyNow({ state, now: at(19) }), false);
  assert.equal(shouldNotifyNow({ state, now: at(20) }), true);
  assert.equal(shouldNotifyNow({ state: { ...state, nextAllowedMs: 0 }, now: at(2) }), false);
  assert.equal(shouldNotifyNow({ state: null, now: at(12) }), true);
});

test('each template has its own copy in Turkish and English', () => {
  const tr = ['prayer.fullday', 'dhikr.milestone', 'hatim.completed', 'achievement'].map(
    (t) => notificationCopy('tr', t).body
  );
  assert.equal(new Set(tr).size, 4);
  assert.match(notificationCopy('tr', 'prayer.fullday').body, /5\/5/);
  assert.equal(notificationCopy('en', 'prayer.fullday').title, 'Community feed');
});

test('every app language has copy for every template', () => {
  for (const lang of NOTIFY_LANGUAGES) {
    for (const template of ['prayer.fullday', 'dhikr.milestone', 'hatim.completed', 'achievement']) {
      const { title, body } = notificationCopy(lang, template);
      assert.ok(title.length > 0 && body.length > 0, `${lang}/${template}`);
    }
  }
  assert.equal(NOTIFY_LANGUAGES.length, Object.keys(LANGUAGE_COUNTRIES).length);
});

test('the message targets the language topic and opens the daily feed when tapped', () => {
  const message = buildNotifyMessage('tr', 'prayer.fullday');
  assert.equal(message.topic, 'lang_tr');
  assert.equal(message.data.type, FEED_NOTIFICATION_TYPE);
  assert.equal(message.data.view, 'today');
  assert.equal(message.android.notification.channelId, 'ezan_campaign_notifications');
});
