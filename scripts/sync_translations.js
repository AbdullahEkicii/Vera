const fs = require('fs');
const path = require('path');

/**
 * Sync Translations Script
 * Usage: npm run sync-i18n
 *
 * This script reads `tr.json` as the master reference.
 * Any missing keys in other language files (e.g. `en.json`, `de.json`, `ru.json`)
 * are automatically detected, synced, and added with proper nested structure.
 */

const localesDir = path.join(__dirname, '..', 'src', 'localization');
const trPath = path.join(localesDir, 'tr.json');
const enPath = path.join(localesDir, 'en.json');

if (!fs.existsSync(trPath)) {
  console.error('Master tr.json file not found!');
  process.exit(1);
}

const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));
const enData = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};

function getValueByPath(obj, pathArr) {
  let curr = obj;
  for (const key of pathArr) {
    if (curr && typeof curr === 'object' && key in curr) {
      curr = curr[key];
    } else {
      return undefined;
    }
  }
  return curr;
}

function setValueByPath(obj, pathArr, value) {
  let curr = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    if (!curr[key] || typeof curr[key] !== 'object' || Array.isArray(curr[key])) {
      curr[key] = {};
    }
    curr = curr[key];
  }
  curr[pathArr[pathArr.length - 1]] = value;
}

function getLeafKeys(obj, currentPath = []) {
  let keys = [];
  for (const key in obj) {
    const newPath = [...currentPath, key];
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getLeafKeys(obj[key], newPath));
    } else {
      keys.push(newPath);
    }
  }
  return keys;
}

const masterKeys = getLeafKeys(trData);

fs.readdirSync(localesDir).forEach(file => {
  if (!file.endsWith('.json') || file === 'tr.json') return;

  const filePath = path.join(localesDir, file);
  const langCode = file.replace('.json', '');

  try {
    const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let addedCount = 0;

    for (const keyPath of masterKeys) {
      const existingVal = getValueByPath(langData, keyPath);
      if (existingVal === undefined) {
        // Missing key in this language!
        // 1. Try to get value from en.json (if lang is not 'en')
        let fallbackVal = getValueByPath(enData, keyPath);
        // 2. If not found in en.json, use tr.json value
        if (fallbackVal === undefined) {
          fallbackVal = getValueByPath(trData, keyPath);
        }

        setValueByPath(langData, keyPath, fallbackVal);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(langData, null, 2) + '\n', 'utf8');
      console.log(`✅ ${file} (${langCode}): Synced ${addedCount} missing keys.`);
    } else {
      console.log(`✓ ${file} (${langCode}): Up to date.`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err);
  }
});

console.log('\n🎉 Localization sync completed successfully!');
