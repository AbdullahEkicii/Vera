import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWarnMinutes, getExactSoundFor, withMinutes } from '../src/utils/notifPrefs.ts';
import { accentForText, contrastRatio } from '../src/utils/theme.ts';

test('warn minutes default to the original 25 and reject out-of-range values', () => {
  assert.equal(getWarnMinutes({}), 25);
  assert.equal(getWarnMinutes({ warnMinutes: 10 }), 10);
  assert.equal(getWarnMinutes({ warnMinutes: 2 }), 25);
  assert.equal(getWarnMinutes({ warnMinutes: 90 }), 25);
});

test('per-prayer sound falls back to the global sound, then the default', () => {
  assert.equal(getExactSoundFor({ exactSound: 'allahu_akbar' }, 'fajr'), 'allahu_akbar');
  assert.equal(getExactSoundFor({ exactSound: 'allahu_akbar', sounds: { fajr: 'azizallah' } }, 'fajr'), 'azizallah');
  assert.equal(getExactSoundFor({ exactSound: 'allahu_akbar', sounds: { fajr: 'azizallah' } }, 'dhuhr'), 'allahu_akbar');
  assert.equal(getExactSoundFor({}, 'asr'), 'azizallah');
});

test('withMinutes swaps the 25 in translated strings, including Arabic-Indic digits', () => {
  assert.equal(withMinutes('-25dk', 10), '-10dk');
  assert.equal(withMinutes('25 minutes left until Fajr.', 15), '15 minutes left until Fajr.');
  assert.equal(withMinutes('بقي ٢٥ دقيقة', 5), 'بقي 5 دقيقة');
  assert.equal(withMinutes('no number', 10), 'no number');
});

test('accent colours reach 4.5:1 as text on both theme backgrounds', () => {
  const accents = ['#10B981', '#0EA5E9', '#F43F5E', '#F59E0B', '#8B5CF6', '#DC2626', '#4F46E5', '#0D9488', '#059669', '#475569'];
  for (const bg of ['#F0F4F8', '#0D1117']) {
    for (const accent of accents) {
      assert.ok(contrastRatio(accentForText(accent, bg), bg) >= 4.5, `${accent} on ${bg}`);
    }
  }
});
