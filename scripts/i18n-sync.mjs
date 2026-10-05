// Keeps the 36 locale files in step with the code.
//
//   node scripts/i18n-sync.mjs todo    # write scripts/i18n-work/todo/<lang>.json
//   node scripts/i18n-sync.mjs merge   # apply scripts/i18n-work/done/<lang>.json
//   node scripts/i18n-sync.mjs check   # report what is still missing
//
// `todo` first adds keys that the code uses with a Turkish default (t('a.b', 'Metin'))
// to tr.json, then lists for every other language the keys it lacks compared to
// tr.json, with the Turkish and English text as the translation source. A translator
// (human or model) fills done/<lang>.json with { "key": "translation" }, and `merge`
// writes them in after checking that {{placeholders}} match the source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const LOC = path.join(SRC, 'localization');
const WORK = path.join(ROOT, 'scripts', 'i18n-work');

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

/**
 * Sets a dotted key, creating missing containers with the same shape as `template`
 * (tr.json): arrays such as tasbih.dailyDhikrs stay arrays for
 * t(key, { returnObjects: true }), numeric object keys such as content.esma.1 stay objects.
 */
const setPath = (obj, keyPath, value, template) => {
  const parts = keyPath.split('.');
  let node = obj;
  let tpl = template;
  for (const p of parts.slice(0, -1)) {
    tpl = tpl?.[p];
    if (typeof node[p] !== 'object' || node[p] === null) node[p] = Array.isArray(tpl) ? [] : {};
    node = node[p];
  }
  node[parts.at(-1)] = value;
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'localization' ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });

/** Keys used as t('key', 'default') literals in src/, with their default text. */
function usedKeys() {
  const used = new Map();
  const re = /\bt\(\s*(['"`])([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\1\s*(?:,\s*(['"])((?:\\.|(?!\3).)*)\3)?/g;
  for (const file of walk(SRC)) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(re)) {
      const def = (m[4] ?? '').replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
      if (!used.has(m[2]) || (!used.get(m[2]).def && def)) used.set(m[2], { def, file: path.relative(ROOT, file) });
    }
  }
  return used;
}

const placeholders = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');

const readLocale = (lang) => JSON.parse(fs.readFileSync(path.join(LOC, `${lang}.json`), 'utf8'));
const writeLocale = (lang, json) => fs.writeFileSync(path.join(LOC, `${lang}.json`), JSON.stringify(json, null, 2) + '\n');
const languages = fs.readdirSync(LOC).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

const mode = process.argv[2] ?? 'check';

if (mode === 'todo' || mode === 'check') {
  const tr = readLocale('tr');
  const used = usedKeys();
  let added = 0;
  const noDefault = [];
  for (const [key, { def, file }] of used) {
    if (key in flatten(tr.translation)) continue;
    if (!def) { noDefault.push(`${key}  (${file})`); continue; }
    if (mode === 'todo') setPath(tr.translation, key, def, tr.translation);
    added++;
  }
  if (mode === 'todo') writeLocale('tr', tr);
  console.log(`${mode === 'todo' ? 'added to' : 'missing from'} tr.json from code defaults: ${added}`);
  if (noDefault.length) console.log(`used without a default and missing from tr.json (${noDefault.length}):\n  ${noDefault.join('\n  ')}`);

  const trFlat = flatten(tr.translation);
  const enFlat = flatten(readLocale('en').translation);
  if (mode === 'todo') fs.mkdirSync(path.join(WORK, 'todo'), { recursive: true });
  let total = 0;
  for (const lang of languages.filter((l) => l !== 'tr')) {
    const have = flatten(readLocale(lang).translation);
    const todo = {};
    for (const [key, trText] of Object.entries(trFlat)) {
      if (key in have) continue;
      todo[key] = lang === 'en' || !(key in enFlat) ? { tr: trText } : { tr: trText, en: enFlat[key] };
    }
    const n = Object.keys(todo).length;
    total += n;
    if (mode === 'todo') {
      const file = path.join(WORK, 'todo', `${lang}.json`);
      if (n) fs.writeFileSync(file, JSON.stringify(todo, null, 2) + '\n');
      else if (fs.existsSync(file)) fs.rmSync(file);
    }
    if (n) process.stdout.write(`${lang}:${n} `);
  }
  console.log(`\n${total} missing translations across ${languages.length - 1} languages`);
}

if (mode === 'merge') {
  const trJson = readLocale('tr');
  const trFlat = flatten(trJson.translation);
  const doneDir = path.join(WORK, 'done');
  let merged = 0;
  const problems = [];
  for (const f of fs.existsSync(doneDir) ? fs.readdirSync(doneDir).filter((x) => x.endsWith('.json')) : []) {
    const lang = f.replace('.json', '');
    const done = JSON.parse(fs.readFileSync(path.join(doneDir, f), 'utf8'));
    const json = readLocale(lang);
    for (const [key, value] of Object.entries(done)) {
      if (!(key in trFlat)) { problems.push(`${lang}: unknown key ${key}`); continue; }
      // Numbers and booleans (e.g. tasbih.dailyDhikrs.0.target) are not text: keep the source value.
      if (typeof trFlat[key] !== 'string') {
        setPath(json.translation, key, trFlat[key], trJson.translation);
        merged++;
        continue;
      }
      if (typeof value !== 'string' || !value.trim()) { problems.push(`${lang}: empty ${key}`); continue; }
      if (placeholders(value) !== placeholders(trFlat[key])) {
        problems.push(`${lang}: placeholder mismatch in ${key}: "${value}"`);
        continue;
      }
      setPath(json.translation, key, value, trJson.translation);
      merged++;
    }
    // Non-text values (numbers, booleans) aren't translated: fill any the language lacks from tr.json.
    const have = flatten(json.translation);
    for (const [key, value] of Object.entries(trFlat)) {
      if (typeof value !== 'string' && !(key in have)) {
        setPath(json.translation, key, value, trJson.translation);
        merged++;
      }
    }
    writeLocale(lang, json);
  }
  console.log(`merged ${merged} translations`);
  if (problems.length) console.log(`skipped ${problems.length}:\n  ${problems.join('\n  ')}`);
}
