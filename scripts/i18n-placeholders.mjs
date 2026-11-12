// Fails (exit 1) when a locale renames, drops or adds a {{placeholder}} compared to en.json.
// A renamed variable is never substituted by i18next, so the user sees the raw {{...}} text
// (this shipped once in push notifications and the home screen).
//
//   node scripts/i18n-placeholders.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'localization');

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
};

const names = (s) => (s.match(/{{\s*[^}]+?\s*}}/g) || []).map((x) => x.replace(/[{}\s]/g, '')).sort().join(',');
const load = (file) => flatten(JSON.parse(fs.readFileSync(path.join(LOC, file), 'utf8')).translation);

const en = load('en.json');
let problems = 0;

for (const file of fs.readdirSync(LOC).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const loc = load(file);
  for (const [key, source] of Object.entries(en)) {
    if (loc[key] === undefined) continue;
    if (names(source) !== names(loc[key])) {
      problems++;
      console.log(`${file}  ${key}\n  en:  ${source}\n  ${file.replace('.json', '')}:  ${loc[key]}`);
    }
  }
}

if (problems) {
  console.error(`\n${problems} placeholder mismatch(es).`);
  process.exit(1);
}
console.log('All locale placeholders match en.json.');
