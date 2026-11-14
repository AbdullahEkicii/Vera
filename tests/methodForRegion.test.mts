import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendMethod } from '../src/utils/methodForRegion.ts';

test('Turkey always gets Diyanet, whatever the phone language', () => {
  assert.equal(recommendMethod('TR', '', 'tr'), 13);
  assert.equal(recommendMethod('TR', '', 'en'), 13);
  assert.equal(recommendMethod('', 'Europe/Istanbul', 'en'), 13);
});

test('Turkish speakers in Europe default to Diyanet, including France', () => {
  for (const code of ['DE', 'NL', 'GB', 'AT', 'BE', 'SE', 'FR']) assert.equal(recommendMethod(code, '', 'tr'), 13, code);
});

test('other Europeans keep the regional default', () => {
  assert.equal(recommendMethod('DE', '', 'de'), 3);
  assert.equal(recommendMethod('FR', '', 'fr'), 12);
  assert.equal(recommendMethod('GB', '', 'en'), 3);
});

test('Turkish language elsewhere follows the local authority', () => {
  assert.equal(recommendMethod('SA', '', 'tr'), 4);
  assert.equal(recommendMethod('US', '', 'tr'), 2);
});

test('regional defaults are unchanged', () => {
  assert.equal(recommendMethod('PK', '', 'en'), 1);
  assert.equal(recommendMethod('ID', '', 'id'), 20);
  assert.equal(recommendMethod('EG', '', 'ar'), 5);
});
