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
import it from './it.json';
import nl from './nl.json';
import uz from './uz.json';
import hi from './hi.json';
import sq from './sq.json';
import zh from './zh.json';
import cs from './cs.json';
import da from './da.json';
import fi from './fi.json';
import hu from './hu.json';
import ja from './ja.json';
import ko from './ko.json';
import no from './no.json';
import pl from './pl.json';
import pt from './pt.json';
import ro from './ro.json';
import sk from './sk.json';
import sv from './sv.json';
import th from './th.json';
import uk from './uk.json';
import vi from './vi.json';

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
  it,
  nl,
  uz,
  hi,
  sq,
  zh,
  cs,
  da,
  fi,
  hu,
  ja,
  ko,
  no,
  pl,
  pt,
  ro,
  sk,
  sv,
  th,
  uk,
  vi,
};

// Robust Auto-detection of system language
// Normalizes regional codes (e.g., 'tr-TR' -> 'tr', 'zh-Hans' -> 'zh')
const getInitialLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const rawCode = (locales[0].languageCode || '').toLowerCase();
      // 1. Direct match
      if (rawCode && resources[rawCode as keyof typeof resources]) {
        return rawCode;
      }
      // 2. Base code (e.g. 'tr-TR' -> 'tr')
      const baseCode = rawCode.split(/[-_]/)[0];
      if (baseCode && resources[baseCode as keyof typeof resources]) {
        return baseCode;
      }
      // 3. Fallback from languageTag
      const tag = (locales[0].languageTag || '').toLowerCase().split(/[-_]/)[0];
      if (tag && resources[tag as keyof typeof resources]) {
        return tag;
      }
    }
  } catch (e) {
    console.warn('[i18n] Error detecting system language:', e);
  }
  return 'en';
};

const defaultLanguage = getInitialLanguage();

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
