// Hermes on Android has no Intl.DisplayNames, so country names fall back to bare codes. The polyfill and
// the region names for the app's own languages (each ~150 KB; the full set is ~70 MB) are loaded inside
// try/catch: if the engine cannot run them, the app still starts and shows country codes.
if (typeof Intl.DisplayNames === 'undefined') {
  try {
    require('@formatjs/intl-displaynames/polyfill-force.js');
    require('@formatjs/intl-displaynames/locale-data/ar.js');
    require('@formatjs/intl-displaynames/locale-data/bn.js');
    require('@formatjs/intl-displaynames/locale-data/cs.js');
    require('@formatjs/intl-displaynames/locale-data/da.js');
    require('@formatjs/intl-displaynames/locale-data/de.js');
    require('@formatjs/intl-displaynames/locale-data/en.js');
    require('@formatjs/intl-displaynames/locale-data/es.js');
    require('@formatjs/intl-displaynames/locale-data/fa.js');
    require('@formatjs/intl-displaynames/locale-data/fi.js');
    require('@formatjs/intl-displaynames/locale-data/fr.js');
    require('@formatjs/intl-displaynames/locale-data/ha.js');
    require('@formatjs/intl-displaynames/locale-data/hi.js');
    require('@formatjs/intl-displaynames/locale-data/hu.js');
    require('@formatjs/intl-displaynames/locale-data/id.js');
    require('@formatjs/intl-displaynames/locale-data/it.js');
    require('@formatjs/intl-displaynames/locale-data/ja.js');
    require('@formatjs/intl-displaynames/locale-data/ko.js');
    require('@formatjs/intl-displaynames/locale-data/ms.js');
    require('@formatjs/intl-displaynames/locale-data/nl.js');
    require('@formatjs/intl-displaynames/locale-data/no.js');
    require('@formatjs/intl-displaynames/locale-data/pl.js');
    require('@formatjs/intl-displaynames/locale-data/pt.js');
    require('@formatjs/intl-displaynames/locale-data/ro.js');
    require('@formatjs/intl-displaynames/locale-data/ru.js');
    require('@formatjs/intl-displaynames/locale-data/sk.js');
    require('@formatjs/intl-displaynames/locale-data/sq.js');
    require('@formatjs/intl-displaynames/locale-data/sv.js');
    require('@formatjs/intl-displaynames/locale-data/sw.js');
    require('@formatjs/intl-displaynames/locale-data/th.js');
    require('@formatjs/intl-displaynames/locale-data/tr.js');
    require('@formatjs/intl-displaynames/locale-data/uk.js');
    require('@formatjs/intl-displaynames/locale-data/ur.js');
    require('@formatjs/intl-displaynames/locale-data/uz.js');
    require('@formatjs/intl-displaynames/locale-data/vi.js');
    require('@formatjs/intl-displaynames/locale-data/zh.js');
  } catch {
    // Keep the country-code fallback.
  }
}
