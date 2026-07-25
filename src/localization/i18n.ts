import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import tr from './tr.json';
import ar from './ar.json';
import es from './es.json';
import fr from './fr.json';
import id from './id.json';
import ur from './ur.json';
import fa from './fa.json';
import ru from './ru.json';
import bn from './bn.json';
import ms from './ms.json';
import ha from './ha.json';
import sw from './sw.json';
import de from './de.json';

const resources = {
  en,
  tr,
  ar,
  es,
  fr,
  id,
  ur,
  fa,
  ru,
  bn,
  ms,
  ha,
  sw,
  de,
};

// Auto-detect the system language
// Expo 50+ uses Localization.getLocales() instead of Localization.locale
const locales = Localization.getLocales();
const systemLanguage = locales.length > 0 ? locales[0].languageCode : 'en';

// Fallback to 'en' if the system language is not supported
const defaultLanguage = systemLanguage && resources[systemLanguage as keyof typeof resources] ? systemLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
