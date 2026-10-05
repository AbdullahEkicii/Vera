import AsyncStorage from '@react-native-async-storage/async-storage';
import dailyContentTr from '../data/dailyContent_tr.json';
import dailyContentEn from '../data/dailyContent_en.json';

export interface DailyItem {
  verse: string;
  verseSource: string;
  hadith: string;
  hadithSource: string;
  quote: string;
  quoteSource: string;
}

/**
 * Returns instant synchronous base content for the day without any network delay.
 */
export function getInstantDailyContent(language: string): DailyItem {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const isTr = language.startsWith('tr');
  const contentArray = isTr ? dailyContentTr : dailyContentEn;
  return { ...(contentArray[dayOfYear % contentArray.length] as DailyItem) };
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
  const targetLang = language.split('-')[0].toLowerCase();
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0]; // e.g. "2026-07-10"
  const fullCacheKey = `DAILY_FULL_${dateKey}_${targetLang}`;

  // 1. Check persistent AsyncStorage cache first
  try {
    const cachedString = await AsyncStorage.getItem(fullCacheKey);
    if (cachedString) {
      return JSON.parse(cachedString) as DailyItem;
    }
  } catch {}

  // 2. Pick base items for today
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const baseItemEn = { ...(dailyContentEn[dayOfYear % dailyContentEn.length] as DailyItem) };
  const baseItemTr = { ...(dailyContentTr[dayOfYear % dailyContentTr.length] as DailyItem) };
  const customSources = { verse: 'en', hadith: 'en', quote: 'en' };

  // 3. Turkish and English come straight from the bundled content
  if (targetLang === 'tr') {
    return baseItemTr;
  }
  if (targetLang === 'en') {
    return baseItemEn;
  }

  // 6. Automatic Translation for other 34+ Languages (Arabic, German, French, Russian, etc.)
  try {
    const translatedItem: DailyItem = {
      verse: await translateText(baseItemEn.verse, targetLang, customSources.verse),
      verseSource: baseItemEn.verseSource,
      hadith: await translateText(baseItemEn.hadith, targetLang, customSources.hadith),
      hadithSource: baseItemEn.hadithSource,
      quote: await translateText(baseItemEn.quote, targetLang, customSources.quote),
      quoteSource: baseItemEn.quoteSource,
    };

    // Cache the translated content persistently so translation only runs ONCE per day!
    await AsyncStorage.setItem(fullCacheKey, JSON.stringify(translatedItem)).catch(() => {});
    return translatedItem;
  } catch (err) {
    console.error('Translation failed, falling back to base English:', err);
    return baseItemEn;
  }
}
