import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// i18n only reads the "translation" namespace. A block merged at the file root is never found, and the
// UI then falls back to a hardcoded default or prints the raw key. These tests keep that from happening.

const load = (lang: string) =>
  JSON.parse(readFileSync(new URL(`../src/localization/${lang}.json`, import.meta.url), 'utf8')) as Record<string, any>;

// Keep in step with RAMADAN_PREP_COUNT and RAMADAN_DAILY_COUNT in src/components/RamadanCard.tsx.
const PREP_COUNT = 4;
const DAILY_COUNT = 8;

for (const lang of ['en', 'tr']) {
  const json = load(lang);
  const t = json.translation;

  test(`${lang}: only the translation namespace sits at the root`, () => {
    assert.deepEqual(Object.keys(json), ['translation']);
  });

  test(`${lang}: Ramadan card has the lists the component reads`, () => {
    const card = t.ramadan?.card;
    assert.ok(card, 'ramadan.card is missing');
    assert.equal(typeof card.beforeTitle, 'string');
    assert.equal(typeof card.duringTitle, 'string');
    assert.ok(Array.isArray(card.prep) && card.prep.length === PREP_COUNT, 'prep must be an array of 4 strings');
    assert.ok(Array.isArray(card.daily) && card.daily.length === DAILY_COUNT, 'daily must be an array of 8 strings');
    for (const line of [...card.prep, ...card.daily]) assert.ok(typeof line === 'string' && line.length > 0);
  });

  test(`${lang}: community ring, dua, intention and benim blocks are reachable`, () => {
    assert.equal(typeof t.community?.ring?.title, 'string');
    assert.equal(typeof t.community?.dua?.heading, 'string');
    assert.equal(typeof t.intention?.title, 'string');
    assert.equal(typeof t.benim?.title, 'string');
  });
}
