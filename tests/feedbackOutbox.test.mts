import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTBOX_MAX,
  OUTBOX_MAX_AGE_MS,
  createEntry,
  enqueue,
  flushOutbox,
  newFeedbackId,
  parseOutbox,
  sanitizeDiag,
  type FeedbackEntry,
  type SendOutcome,
} from '../src/utils/feedbackOutbox.ts';
import { buildArchiveDoc, formatFeedbackNotice } from '../functions/feedbackCore.js';

const base = { message: '  Osmaniye vakitleri  ', language: 'tr', platform: 'android', osVersion: '14', appVersion: '1.0.36' };
const entry = (over: Partial<FeedbackEntry> = {}): FeedbackEntry => ({ ...createEntry(base, 1000), ...over });

test('ids match the Firestore rule pattern and differ between submissions', () => {
  const a = newFeedbackId(1_700_000_000_000);
  const b = newFeedbackId(1_700_000_000_000);
  assert.match(a, /^[A-Za-z0-9_-]{8,64}$/);
  assert.notEqual(a, b);
});

test('createEntry trims and bounds the message', () => {
  assert.equal(createEntry(base).message, 'Osmaniye vakitleri');
  assert.equal(createEntry({ ...base, message: 'x'.repeat(5000) }).message.length, 2000);
});

test('sanitizeDiag keeps only small primitives and at most 12 keys', () => {
  const raw: Record<string, unknown> = { method: 13, tz: 'Europe/Istanbul', obj: { a: 1 }, nan: NaN, 'bad key': 1, ok: true };
  for (let i = 0; i < 20; i += 1) raw[`k${i}`] = i;
  const out = sanitizeDiag(raw);
  assert.equal(out.method, 13);
  assert.equal(out.tz, 'Europe/Istanbul');
  assert.equal(out.ok, true);
  assert.ok(!('obj' in out) && !('nan' in out) && !('bad key' in out));
  assert.ok(Object.keys(out).length <= 12);
  assert.equal((sanitizeDiag({ s: 'x'.repeat(100) }).s as string).length, 40);
});

test('enqueue never stores the same id twice and caps the outbox', () => {
  const e = entry({ id: 'fb_same_000000000000' });
  assert.equal(enqueue(enqueue([], e), e).length, 1);
  let list: FeedbackEntry[] = [];
  for (let i = 0; i < OUTBOX_MAX + 5; i += 1) list = enqueue(list, entry({ id: `fb_${i}_000000000000` }));
  assert.equal(list.length, OUTBOX_MAX);
  assert.equal(list[list.length - 1].id, `fb_${OUTBOX_MAX + 4}_000000000000`);
});

test('parseOutbox survives corrupt storage', () => {
  assert.deepEqual(parseOutbox(null), []);
  assert.deepEqual(parseOutbox('{not json'), []);
  assert.deepEqual(parseOutbox('{"a":1}'), []);
  assert.equal(parseOutbox(JSON.stringify([entry(), { nope: 1 }])).length, 1);
});

const run = (list: FeedbackEntry[], outcome: SendOutcome, now = 2000) => flushOutbox(list, async () => outcome, now);

test('a confirmed send leaves the outbox', async () => {
  const r = await run([entry()], 'sent');
  assert.equal(r.remaining.length, 0);
  assert.equal(r.sent.length, 1);
});

test('an offline attempt keeps the entry and marks it maybe delivered', async () => {
  const r = await run([entry()], 'unknown');
  assert.equal(r.remaining.length, 1);
  assert.equal(r.remaining[0].attempts, 1);
  assert.equal(r.remaining[0].maybeDelivered, true);
});

test('denied after an unknown attempt means the first write landed: delivered, not duplicated', async () => {
  const r = await run([entry({ maybeDelivered: true, attempts: 1 })], 'denied');
  assert.equal(r.remaining.length, 0);
  assert.equal(r.sent.length, 1);
});

test('denied on a first attempt is a real rejection and is kept, not lost', async () => {
  const r = await run([entry()], 'denied');
  assert.equal(r.remaining.length, 1);
  assert.equal(r.remaining[0].maybeDelivered, false);
});

test('entries older than the max age are dropped', async () => {
  const r = await run([entry({ queuedAt: 0 })], 'unknown', OUTBOX_MAX_AGE_MS + 1);
  assert.equal(r.remaining.length, 0);
  assert.equal(r.sent.length, 0);
});

test('one failing entry does not block the others', async () => {
  const a = entry({ id: 'fb_a_000000000000' });
  const b = entry({ id: 'fb_b_000000000000' });
  const r = await flushOutbox([a, b], async (e) => (e.id === a.id ? 'unknown' : 'sent'), 2000);
  assert.deepEqual(r.sent, [b.id]);
  assert.deepEqual(r.remaining.map((e) => e.id), [a.id]);
});

test('archive copy is unhandled and keeps the original text', () => {
  const doc = buildArchiveDoc('fb_x', { message: 'merhaba', platform: 'android', diag: { method: 13 } }, new Date(0));
  assert.equal(doc.handled, false);
  assert.equal(doc.message, 'merhaba');
  assert.equal(doc.sourceId, 'fb_x');
});

test('notice carries the message, diagnostics and id, and fits Telegram', () => {
  const long = formatFeedbackNotice('fb_x', { message: 'a'.repeat(9000), platform: 'android', appVersion: '1.0.36', diag: { method: 13, tz: 'Europe/Istanbul' } });
  assert.ok(long.length <= 4000);
  const short = formatFeedbackNotice('fb_x', { message: 'Osmaniye', platform: 'android', diag: { method: 13 } });
  assert.match(short, /Osmaniye/);
  assert.match(short, /method=13/);
  assert.match(short, /id: fb_x/);
});
