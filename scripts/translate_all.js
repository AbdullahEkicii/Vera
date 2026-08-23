const fs = require('fs');
const path = require('path');
const https = require('https');

const localesDir = path.join(__dirname, '..', 'src', 'localization');
const trPath = path.join(localesDir, 'tr.json');
const enPath = path.join(localesDir, 'en.json');

const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Maps our file codes to Google Translate language codes
const LANG_MAP = {
  ar: 'ar',
  bn: 'bn',
  cs: 'cs',
  da: 'da',
  de: 'de',
  es: 'es',
  fa: 'fa',
  fi: 'fi',
  fr: 'fr',
  ha: 'ha',
  hi: 'hi',
  hu: 'hu',
  id: 'id',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  ms: 'ms',
  nl: 'nl',
  no: 'no',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sq: 'sq',
  sv: 'sv',
  sw: 'sw',
  th: 'th',
  uk: 'uk',
  ur: 'ur',
  uz: 'uz',
  vi: 'vi',
  zh: 'zh-CN',
};

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

function translateSingle(text, targetLang) {
  return new Promise((resolve) => {
    // Protect {{variables}}
    const placeholders = [];
    let sanitized = text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
      const token = `__VAR_${placeholders.length}__`;
      placeholders.push({ token, original: match });
      return token;
    });

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(sanitized)}`;
    
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json && json[0] && Array.isArray(json[0])) {
            let result = json[0].map(s => s[0]).join('');
            // Restore placeholders
            for (const p of placeholders) {
              result = result.replace(new RegExp(p.token, 'g'), p.original);
            }
            resolve(result || text);
            return;
          }
        } catch (e) {}
        resolve(text);
      });
    });

    req.on('error', () => resolve(text));
    req.on('timeout', () => {
      req.destroy();
      resolve(text);
    });
  });
}

async function processLanguage(file) {
  const langCode = file.replace('.json', '');
  const targetGoogleLang = LANG_MAP[langCode];
  if (!targetGoogleLang) return;

  const filePath = path.join(localesDir, file);
  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const masterKeys = getLeafKeys(enData);
  let updatedCount = 0;

  for (const keyPath of masterKeys) {
    const enVal = getValueByPath(enData, keyPath);
    const currVal = getValueByPath(langData, keyPath);

    if (typeof enVal === 'string' && enVal.trim() !== '') {
      // Check if currVal is identical to English (or missing or empty)
      // Note: Skip short codes like "m", "h", "s", or prayer names if they are already standard
      const isUntranslated = currVal === undefined || currVal === enVal;
      
      // Don't re-translate if English is target or key is language code
      if (isUntranslated && langCode !== 'en') {
        const translated = await translateSingle(enVal, targetGoogleLang);
        if (translated && translated !== enVal) {
          setValueByPath(langData, keyPath, translated);
          updatedCount++;
        }
        // Micro throttle
        await new Promise(r => setTimeout(r, 15));
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(langData, null, 2) + '\n', 'utf8');
    console.log(`🌍 ${file} (${langCode}): Translated ${updatedCount} strings.`);
  } else {
    console.log(`✓ ${file} (${langCode}): Already fully translated.`);
  }
}

async function main() {
  console.log('🚀 Starting multi-language automated translation pass...');
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'tr.json' && f !== 'en.json');
  
  for (const file of files) {
    try {
      await processLanguage(file);
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }
  console.log('🎉 Multi-language translation pass completed successfully!');
}

main();
