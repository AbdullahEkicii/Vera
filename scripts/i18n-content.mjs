// Copies the Turkish/English text that lives in data files into `content.*` keys of
// src/localization/tr.json and en.json, so every other language can translate it.
//
//   node scripts/i18n-content.mjs
//
// Run it after editing any of the SOURCES below, then `node scripts/i18n-sync.mjs todo`
// to see what the other languages are missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOC = path.join(ROOT, 'src', 'localization');

// Quran verses, hadith and dua meanings are deliberately left out: their meaning must
// come from a vetted translation, never from machine translation.
const SOURCES = [
  { file: 'src/data/hajjUmrah.ts', ns: 'hajj', fields: ['title', 'desc', 'label'] },
  { file: 'src/data/religiousDays.ts', ns: 'religiousDays', fields: ['name', 'description'] },
  { file: 'src/data/esmaulhusna.ts', ns: 'esma', fields: [''] },
  { file: 'src/data/duas.ts', ns: 'duas', fields: ['title', 'occasion'] },
  { file: 'src/services/achievementService.ts', ns: 'achievements', fields: ['title', 'desc'] },
  { file: 'src/services/quranAudioService.ts', ns: 'reciters', fields: ['name'] },
  { file: 'src/components/GreetingCardModal.tsx', ns: 'greetingTemplates', fields: ['title', 'message'] },
  { file: 'src/components/QuranPrayersModal.tsx', ns: 'quranPrayers', fields: ['title'], idFromKey: true },
  { file: 'src/app/(tabs)/index.tsx', ns: 'tabs', fields: ['label'] },
  { file: 'src/app/achievements.tsx', ns: 'achievementCategories', fields: [''], idFromKey: true },
];

// Keys built at runtime (`greeting.theme.${id}`, `achievements.progress.${unit}`) that
// no data file spells out in both languages.
const MANUAL = {
  'greeting.theme.gold': ['Altın Hat', 'Golden Line'],
  'greeting.theme.emerald': ['Zümrüt Kubbe', 'Emerald Dome'],
  'greeting.theme.navy': ['Gece Mavisi', 'Midnight Blue'],
  'greeting.theme.crimson': ['Gül & Yakut', 'Rose & Ruby'],
  'achievements.progress.days': ['{{current}} / {{total}} gün', '{{current}} / {{total}} days'],
  'achievements.progress.prayers': ['{{current}} / {{total}} vakit', '{{current}} / {{total}} prayers'],
  'achievements.progress.dhikr': ['{{current}} / {{total}} zikir', '{{current}} / {{total}} dhikr'],
  'achievements.progress.khatm': ['{{current}} / {{total}} hatim', '{{current}} / {{total}} khatm'],
  'achievements.progress.kaza': ['{{current}} / {{total}} kaza', '{{current}} / {{total}} make-up prayers'],
};

/** Reads a JS string literal starting at `i` (quote char at s[i]); returns [value, endIndex]. */
function readString(s, i) {
  const q = s[i];
  let out = '';
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') {
      const n = s[++j];
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
    } else if (c === q) {
      return [out, j + 1];
    } else if (q === '`' && c === '$' && s[j + 1] === '{') {
      return [null, j]; // template with interpolation: not static text
    } else {
      out += c;
    }
  }
  return [null, s.length];
}

/**
 * Walks the file in order, remembering the last `id:` seen, and collects
 * `<field>TR` / `<field>EN` (or `<field>_tr` / `tr`) string properties under it.
 */
function extract(source, fields, idFromKey) {
  const items = new Map();
  let currentId = null;
  const re = /\b(id|[a-zA-Z]*?)(TR|EN|_tr|_en|tr|en)?\s*:\s*(['"`]|\d+)/g;
  // Objects keyed by name (`start: { titleTR: ... }`) instead of an `id` field.
  const keyed = idFromKey ? [...source.matchAll(/\b(\w+)\s*:\s*\{/g)].map((k) => [k.index, k[1]]) : [];
  let m;
  while ((m = re.exec(source))) {
    for (const [at, name] of keyed) if (at < m.index) currentId = name;
    const [, base, lang, start] = m;
    const valueStart = m.index + m[0].length - start.length;
    if (base === 'id' && !lang) {
      currentId = /\d/.test(start[0]) ? start : readString(source, valueStart)[0];
      continue;
    }
    if (!lang || !currentId || !/['"`]/.test(start)) continue;
    const field = base.replace(/_$/, '');
    if (!fields.includes(field)) continue;
    const [value, end] = readString(source, valueStart);
    re.lastIndex = end;
    if (value == null) continue;
    const key = field ? `${currentId}.${field}` : String(currentId);
    const entry = items.get(key) ?? {};
    entry[/tr/i.test(lang) ? 'tr' : 'en'] = value;
    items.set(key, entry);
  }
  return items;
}

const setPath = (obj, keyPath, value) => {
  const parts = keyPath.split('.');
  let node = obj;
  for (const p of parts.slice(0, -1)) node = node[p] = typeof node[p] === 'object' && node[p] ? node[p] : {};
  node[parts.at(-1)] = value;
};

const files = { tr: path.join(LOC, 'tr.json'), en: path.join(LOC, 'en.json') };
const json = Object.fromEntries(Object.entries(files).map(([l, f]) => [l, JSON.parse(fs.readFileSync(f, 'utf8'))]));

let total = 0;
for (const { file, ns, fields, idFromKey } of SOURCES) {
  const items = extract(fs.readFileSync(path.join(ROOT, file), 'utf8'), fields, idFromKey);
  for (const [key, { tr, en }] of items) {
    for (const [lang, value] of [['tr', tr ?? en], ['en', en ?? tr]]) {
      if (value != null) setPath(json[lang].translation, `content.${ns}.${key}`, value);
    }
    total++;
  }
  console.log(`${ns.padEnd(18)} ${items.size} entries  (${file})`);
}

const { HIJRI_MONTHS_TR, HIJRI_MONTHS_EN } = await import('../src/data/religiousDays.ts');
HIJRI_MONTHS_TR.forEach((name, i) => {
  setPath(json.tr.translation, `content.hijriMonths.${i + 1}`, name);
  setPath(json.en.translation, `content.hijriMonths.${i + 1}`, HIJRI_MONTHS_EN[i]);
});
console.log(`${'hijriMonths'.padEnd(18)} ${HIJRI_MONTHS_TR.length} entries  (src/data/religiousDays.ts)`);

for (const [key, [tr, en]] of Object.entries(MANUAL)) {
  setPath(json.tr.translation, key, tr);
  setPath(json.en.translation, key, en);
}
console.log(`${'manual'.padEnd(18)} ${Object.keys(MANUAL).length} entries`);

for (const [lang, file] of Object.entries(files)) {
  fs.writeFileSync(file, JSON.stringify(json[lang], null, 2) + '\n');
}
console.log(`\n${total} content entries written to tr.json and en.json`);
