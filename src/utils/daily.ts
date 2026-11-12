import { AppStorage as AsyncStorage } from '../services/storageService';
import dailyContentTr from '../data/dailyContent_tr.json';
import dailyContentEn from '../data/dailyContent_en.json';

export interface DailyItem {
  verse: string;
  verseSource: string;
  hadith: string;
  hadithSource: string;
  quote: string;
  quoteSource: string;
  /** True when the text was machine-translated at runtime (UI should label it). */
  machineTranslated?: boolean;
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

const TRANSLATE_TIMEOUT_MS = 8000;

/** Returns the translated text, or null when translation was skipped or failed. */
const translateText = async (text: string, targetLang: string, sourceLang: string = 'en'): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const lang = targetLang.split('-')[0].toLowerCase();
    if (lang === sourceLang || !text) return null;
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;
    const json = await response.json();
    const out = json[0].map((item: any) => item[0]).join('');
    return out || null;
  } catch (e) {
    console.error('Translation error:', e);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function getDailyContent(language: string): Promise<DailyItem> {
  const targetLang = language.split('-')[0].toLowerCase();
  const now = new Date();
  // Local date parts (not toISOString, which is UTC) so content rolls over at local midnight.
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const dateKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`; // e.g. "2026-07-10"
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
    const [verse, hadith, quote] = await Promise.all([
      translateText(baseItemEn.verse, targetLang, customSources.verse),
      translateText(baseItemEn.hadith, targetLang, customSources.hadith),
      translateText(baseItemEn.quote, targetLang, customSources.quote),
    ]);
    const anyTranslated = verse !== null || hadith !== null || quote !== null;

    const translatedItem: DailyItem = {
      verse: verse ?? baseItemEn.verse,
      verseSource: baseItemEn.verseSource,
      hadith: hadith ?? baseItemEn.hadith,
      hadithSource: baseItemEn.hadithSource,
      quote: quote ?? baseItemEn.quote,
      quoteSource: baseItemEn.quoteSource,
      machineTranslated: anyTranslated,
    };

    // Cache only real translations so a failed/offline run is retried instead of stuck in English all day.
    if (anyTranslated) {
      await AsyncStorage.setItem(fullCacheKey, JSON.stringify(translatedItem)).catch(() => {});
    }
    return translatedItem;
  } catch (err) {
    console.error('Translation failed, falling back to base English:', err);
    return baseItemEn;
  }
}
