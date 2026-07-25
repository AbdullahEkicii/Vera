const fs = require('fs');
const path = require('path');
console.log('Starting...');
const locDir = path.join('c:/react_projects/ezan-app/src/localization');
const files = fs.readdirSync(locDir).filter(f => f.endsWith('.json'));

const baseEn = {
  verseBody: 'Click to read the verse of the day!',
  hadithBody: 'Click to read the hadith of the day!',
  quoteBody: 'Click to read the quote of the day!'
};

const baseTr = {
  verseBody: 'Günün ayetini okumak için týklayýn!',
  hadithBody: 'Günün hadisini okumak için týklayýn!',
  quoteBody: 'Günün sözünü okumak için týklayýn!'
};

async function translateText(text, targetLang) {
  try {
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text));
    const json = await res.json();
    return json[0].map(item => item[0]).join('');
  } catch (e) {
    console.error('Translation failed for', targetLang, text);
    return text;
  }
}

async function run() {
  for (const file of files) {
    const lang = file.split('.')[0];
    const filePath = path.join(locDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.daily) data.daily = {};

    if (lang === 'en') {
      data.daily.verseBody = baseEn.verseBody;
      data.daily.hadithBody = baseEn.hadithBody;
      data.daily.quoteBody = baseEn.quoteBody;
    } else if (lang === 'tr') {
      data.daily.verseBody = baseTr.verseBody;
      data.daily.hadithBody = baseTr.hadithBody;
      data.daily.quoteBody = baseTr.quoteBody;
    } else {
      console.log('Translating for', lang);
      data.daily.verseBody = await translateText(baseEn.verseBody, lang);
      data.daily.hadithBody = await translateText(baseEn.hadithBody, lang);
      data.daily.quoteBody = await translateText(baseEn.quoteBody, lang);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Updated', file);
  }
}

run().catch(console.error);
