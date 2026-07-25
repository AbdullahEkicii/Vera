import AsyncStorage from '@react-native-async-storage/async-storage';
import dailyContentTr from '../data/dailyContent_tr.json';
import dailyContentEn from '../data/dailyContent_en.json';
import { getQueuedContentForToday } from '../services/contentQueue';

export interface DailyItem {
  verse: string;
  verseSource: string;
  hadith: string;
  hadithSource: string;
  quote: string;
  quoteSource: string;
}

const translateText = async (text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> => {
  try {
    const lang = targetLang.split('-')[0].toLowerCase();
    if (lang === sourceLang || !text) return text;
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!response.ok) return text;
    const json = await response.json();
    return json[0].map((item: any) => item[0]).join('');
  } catch (e) {
    console.error('Translation error:', e);
    return text;
  }
};

export async function getDailyContent(language: string): Promise<DailyItem> {
  // Get current day of the year (0 - 365)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const langKey = language.startsWith('tr') ? 'tr' : 'en';
  const contentArray = langKey === 'tr' ? dailyContentTr : dailyContentEn;

  // 1. Pick a base item from the JSON array based on the day
  let baseItemEn = { ...(dailyContentEn[dayOfYear % dailyContentEn.length] as DailyItem) };
  let baseItemTr = { ...(dailyContentTr[dayOfYear % dailyContentTr.length] as DailyItem) };

  // 2. Fetch Queued Content from Firestore for Today
  const [queuedVerse, queuedHadith, queuedQuote] = await Promise.all([
    getQueuedContentForToday('verse'),
    getQueuedContentForToday('hadith'),
    getQueuedContentForToday('quote'),
  ]);

  // Keep track of which fields are custom and their source languages
  const customSources = {
    verse: 'en',
    hadith: 'en',
    quote: 'en',
  };

  if (queuedVerse) {
    baseItemEn.verse = queuedVerse.text;
    baseItemEn.verseSource = queuedVerse.source;
    baseItemTr.verse = queuedVerse.text;
    baseItemTr.verseSource = queuedVerse.source;
    customSources.verse = queuedVerse.language;
  }
  if (queuedHadith) {
    baseItemEn.hadith = queuedHadith.text;
    baseItemEn.hadithSource = queuedHadith.source;
    baseItemTr.hadith = queuedHadith.text;
    baseItemTr.hadithSource = queuedHadith.source;
    customSources.hadith = queuedHadith.language;
  }
  if (queuedQuote) {
    baseItemEn.quote = queuedQuote.text;
    baseItemEn.quoteSource = queuedQuote.source;
    baseItemTr.quote = queuedQuote.text;
    baseItemTr.quoteSource = queuedQuote.source;
    customSources.quote = queuedQuote.language;
  }

  const targetLang = language.split('-')[0].toLowerCase();
  
  // If target is EN and no custom TR items are present, or TR, return base
  if (targetLang === 'tr') return baseItemTr;
  if (targetLang === 'en' && !queuedVerse && !queuedHadith && !queuedQuote) return baseItemEn;

  const dateKey = now.toISOString().split('T')[0]; // e.g. "2026-07-10"
  const cacheKey = `DAILY_TRANS_${dateKey}_${targetLang}`;

  try {
    const cachedString = await AsyncStorage.getItem(cacheKey);
    if (cachedString) {
      return JSON.parse(cachedString) as DailyItem;
    }
  } catch (err) {
    console.error('Translation cache load error:', err);
  }

  try {
    const translatedItem: DailyItem = {
      verse: await translateText(baseItemEn.verse, targetLang, customSources.verse),
      verseSource: baseItemEn.verseSource,
      hadith: await translateText(baseItemEn.hadith, targetLang, customSources.hadith),
      hadithSource: baseItemEn.hadithSource,
      quote: await translateText(baseItemEn.quote, targetLang, customSources.quote),
      quoteSource: baseItemEn.quoteSource,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(translatedItem));
    return translatedItem;
  } catch (err) {
    console.error('Translation failed, falling back:', err);
    return targetLang === 'tr' ? baseItemTr : baseItemEn;
  }
}
