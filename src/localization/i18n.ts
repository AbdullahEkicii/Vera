import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import { AppStorage } from '../services/storageService';
import { applyLayoutDirection, isRtlLanguage } from '../utils/rtl';

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

export function normalizeSupportedLanguage(code?: string | null): string | null {
  if (!code) return null;
  const raw = code.trim().toLowerCase();
  if (SUPPORTED_LANGS.includes(raw)) return raw;
  const base = raw.split(/[-_]/)[0];
  if (base && SUPPORTED_LANGS.includes(base)) return base;
  return null;
}

/**
 * Loads a language (if needed) and switches i18next to it. Resolves to true when the layout
 * direction has to change (to or from right-to-left): that only applies after a runtime reload.
 */
export async function changeAppLanguage(lang: string): Promise<boolean> {
  const normalized = normalizeSupportedLanguage(lang) ?? 'en';
  ensureLanguageLoaded(normalized);
  if (i18n.language !== normalized) {
    await i18n.changeLanguage(normalized);
  }
  return applyLayoutDirection(normalized);
}

// Robust Auto-detection of system language
// Normalizes regional codes (e.g., 'tr-TR' -> 'tr', 'zh-Hans' -> 'zh')
export const getSystemLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      for (const locale of locales) {
        const fromCode = normalizeSupportedLanguage(locale.languageCode);
        if (fromCode) return fromCode;
        const fromTag = normalizeSupportedLanguage(locale.languageTag);
        if (fromTag) return fromTag;
      }
    }
  } catch (e) {
    console.warn('[i18n] Error detecting system language:', e);
  }
  return 'en';
};

export const hasExplicitLanguage = (): boolean => {
  try {
    const saved = AppStorage.getString('APP_LANG');
    return !!normalizeSupportedLanguage(saved);
  } catch {
    return false;
  }
};

/** Re-reads the device locale when the user has not pinned an in-app language. */
export async function syncSystemLanguage(): Promise<{ language: string; needsReload: boolean }> {
  const saved = normalizeSupportedLanguage(AppStorage.getString('APP_LANG'));
  const target = saved ?? getSystemLanguage();
  const needsReload = await changeAppLanguage(target);
  return { language: target, needsReload };
}

/** Clears the manual language override so the app tracks the device language again. */
export async function resetToSystemLanguage(): Promise<boolean> {
  await AppStorage.removeItem('APP_LANG');
  return changeAppLanguage(getSystemLanguage());
}

const savedLanguage = (() => {
  try {
    return normalizeSupportedLanguage(AppStorage.getString('APP_LANG'));
  } catch {
    return null;
  }
})();

const defaultLanguage = savedLanguage ?? getSystemLanguage();
// Native layout direction follows the active language from startup on.
applyLayoutDirection(defaultLanguage);
export const isLayoutDirectionMismatch = (): boolean =>
  I18nManager.isRTL !== isRtlLanguage(i18n.language || defaultLanguage);

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
