import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryFlag } from '../src/utils/communityText.ts';

test('countryFlag builds the flag from regional indicator symbols', () => {
  assert.equal(countryFlag('TR'), '🇹🇷');
  assert.equal(countryFlag('US'), '🇺🇸');
});

test('countryFlag returns empty for missing or malformed codes', () => {
  assert.equal(countryFlag(undefined), '');
  assert.equal(countryFlag(''), '');
  assert.equal(countryFlag('tr'), '');
  assert.equal(countryFlag('TUR'), '');
});
