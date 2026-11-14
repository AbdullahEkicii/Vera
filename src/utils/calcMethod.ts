import * as Localization from 'expo-localization';
import * as Location from 'expo-location';
import { AppStorage } from '../services/storageService';
import { autoDetectCalculationMethod } from '../services/api';
import { recommendMethod } from './methodForRegion';

export interface MethodInfo {
  id: number;
  key: string;
  defaultName: string;
}

export const CALCULATION_METHODS: Record<number, MethodInfo> = {
  13: { id: 13, key: 'settings.methods.diyanet', defaultName: 'Diyanet İşleri (Türkiye)' },
  3:  { id: 3,  key: 'settings.methods.mwl',     defaultName: 'Müslüman Dünya Birliği (MWL)' },
  4:  { id: 4,  key: 'settings.methods.ummAlQura', defaultName: 'Umm Al-Qura (Mekke)' },
  5:  { id: 5,  key: 'settings.methods.egypt',   defaultName: 'Mısır Genel Otoritesi' },
  2:  { id: 2,  key: 'settings.methods.isna',    defaultName: 'ISNA (Kuzey Amerika)' },
  1:  { id: 1,  key: 'settings.methods.karachi', defaultName: 'Karaçi (Pakistan & Hindistan)' },
  12: { id: 12, key: 'settings.methods.france',  defaultName: 'Fransa (UOIF)' },
  14: { id: 14, key: 'settings.methods.russia',  defaultName: 'Rusya & Orta Asya' },
  20: { id: 20, key: 'settings.methods.kemenag', defaultName: 'Endonezya (Kemenag)' },
  17: { id: 17, key: 'settings.methods.jakim',   defaultName: 'Malezya (JAKIM)' },
  11: { id: 11, key: 'settings.methods.muis',    defaultName: 'Singapur (MUIS)' },
  7:  { id: 7,  key: 'settings.methods.tehran',  defaultName: 'İran (Tahran Üniversitesi)' },
};

// Fajr / Isha twilight definitions per method, shown under the method name so a newcomer can
// tell the options apart without knowing the authorities. Numbers need no translation.
export const METHOD_ANGLES: Record<number, { fajr: string; isha: string }> = {
  13: { fajr: '18°', isha: '17°' },
  3: { fajr: '18°', isha: '17°' },
  4: { fajr: '18.5°', isha: "+90′" },
  5: { fajr: '19.5°', isha: '17.5°' },
  2: { fajr: '15°', isha: '15°' },
  1: { fajr: '18°', isha: '18°' },
  12: { fajr: '12°', isha: '12°' },
  14: { fajr: '16°', isha: '15°' },
  20: { fajr: '20°', isha: '18°' },
  17: { fajr: '20°', isha: '18°' },
  11: { fajr: '20°', isha: '18°' },
  7: { fajr: '17.7°', isha: '14°' },
};

/** Set once the user picks a method in Settings; location changes then stop overriding it. */
export const METHOD_USER_SET_KEY = 'PRAYER_METHOD_USER_SET';

/**
 * Returns the recommended prayer calculation method based on ISO country code or device timezone.
 * Without arguments it reads the device region, timezone and language.
 */
export function getRecommendedCalculationMethod(countryCode?: string, timeZone?: string): number {
  return recommendMethod(
    countryCode || Localization.getLocales()[0]?.regionCode || '',
    timeZone || Localization.getCalendars()[0]?.timeZone || '',
    Localization.getLocales()[0]?.languageCode || '',
  );
}

/**
 * Keeps the calculation method in step with where the user actually is. Called when the
 * location changes (a city picked, or a GPS fix in a new country). A method the user picked
 * themselves in Settings is never overridden.
 */
export async function updateMethodForLocation(latitude: number, longitude: number, countryCode?: string): Promise<void> {
  try {
    if ((await AppStorage.getItem(METHOD_USER_SET_KEY)) === 'true') return;

    let code = countryCode;
    if (!code) {
      try {
        const results = await Promise.race([
          Location.reverseGeocodeAsync({ latitude, longitude }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('geocode timeout')), 4000)),
        ]);
        code = results?.[0]?.isoCountryCode || undefined;
      } catch {
        // offline / no geocoder: fall back to the coordinate boxes below
      }
    }

    const method = code ? getRecommendedCalculationMethod(code, '') : autoDetectCalculationMethod(latitude, longitude);
    await AppStorage.setItem('PRAYER_CALCULATION_METHOD', String(method));
  } catch {
    // best effort: the previous method keeps working
  }
}
