import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import tr from './tr.json';

// Only the fallback language (en) and the app's primary market language (tr) are
// bundled eagerly. The other 32 languages are ~1MB of JSON combined — parsing all
// of them at startup when only one is ever active wastes cold-start time and RAM.
// They're lazily `require()`'d (and registered via addResourceBundle) the first time
// they're actually needed: at detected-language resolution below, or when the user
// switches language in Settings.
const resources = { en, tr };

const LANGUAGE_LOADERS: Record<string, () => { translation: Record<string, unknown> }> = {
  ar: () => require('./ar.json'),
  es: () => require('./es.json'),
  fr: () => require('./fr.json'),
  id: () => require('./id.json'),
  ur: () => require('./ur.json'),
  fa: () => require('./fa.json'),
  ru: () => require('./ru.json'),
  bn: () => require('./bn.json'),
  ms: () => require('./ms.json'),
  ha: () => require('./ha.json'),
  sw: () => require('./sw.json'),
  de: () => require('./de.json'),
  it: () => require('./it.json'),
  nl: () => require('./nl.json'),
  uz: () => require('./uz.json'),
  hi: () => require('./hi.json'),
  sq: () => require('./sq.json'),
  zh: () => require('./zh.json'),
  cs: () => require('./cs.json'),
  da: () => require('./da.json'),
  fi: () => require('./fi.json'),
  hu: () => require('./hu.json'),
  ja: () => require('./ja.json'),
  ko: () => require('./ko.json'),
  no: () => require('./no.json'),
  pl: () => require('./pl.json'),
  pt: () => require('./pt.json'),
  ro: () => require('./ro.json'),
  sk: () => require('./sk.json'),
  sv: () => require('./sv.json'),
  th: () => require('./th.json'),
  uk: () => require('./uk.json'),
  vi: () => require('./vi.json'),
};

const SUPPORTED_LANGS = ['en', 'tr', ...Object.keys(LANGUAGE_LOADERS)];
const loadedLanguages = new Set<string>(['en', 'tr']);

/** Lazily loads and registers a language's translation bundle if not already loaded. */
export function ensureLanguageLoaded(lang: string): boolean {
  if (loadedLanguages.has(lang)) return true;
  const loader = LANGUAGE_LOADERS[lang];
  if (!loader) return false;
  // i18next only gains addResourceBundle once init() has run; the startup language
  // is passed to init() directly instead (see below).
  if (!i18n.isInitialized) return false;
  const bundle = loader();
  i18n.addResourceBundle(lang, 'translation', bundle.translation, true, true);
  loadedLanguages.add(lang);
  return true;
}

/** Loads a language (if needed) and switches i18next to it. */
export async function changeAppLanguage(lang: string): Promise<void> {
  ensureLanguageLoaded(lang);
  await i18n.changeLanguage(lang);
}

// Robust Auto-detection of system language
// Normalizes regional codes (e.g., 'tr-TR' -> 'tr', 'zh-Hans' -> 'zh')
const getInitialLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const rawCode = (locales[0].languageCode || '').toLowerCase();
      // 1. Direct match
      if (rawCode && SUPPORTED_LANGS.includes(rawCode)) {
        return rawCode;
      }
      // 2. Base code (e.g. 'tr-TR' -> 'tr')
      const baseCode = rawCode.split(/[-_]/)[0];
      if (baseCode && SUPPORTED_LANGS.includes(baseCode)) {
        return baseCode;
      }
      // 3. Fallback from languageTag
      const tag = (locales[0].languageTag || '').toLowerCase().split(/[-_]/)[0];
      if (tag && SUPPORTED_LANGS.includes(tag)) {
        return tag;
      }
    }
  } catch (e) {
    console.warn('[i18n] Error detecting system language:', e);
  }
  return 'en';
};

const defaultLanguage = getInitialLanguage();

// The device language's bundle must be part of the init() resources: calling
// addResourceBundle before init() throws ("undefined is not a function") and crashed
// the app on launch for every device language other than en/tr.
const initialLoader = LANGUAGE_LOADERS[defaultLanguage];
const initialResources: Record<string, { translation: Record<string, unknown> }> = { ...resources };
if (initialLoader) {
  initialResources[defaultLanguage] = initialLoader();
  loadedLanguages.add(defaultLanguage);
}

i18n
  .use(initReactI18next)
  .init({
    resources: initialResources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
