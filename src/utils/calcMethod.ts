import * as Localization from 'expo-localization';

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
};

/**
 * Returns the recommended prayer calculation method based on ISO country code or device timezone.
 */
export function getRecommendedCalculationMethod(countryCode?: string, timeZone?: string): number {
  const code = (countryCode || Localization.getLocales()[0]?.regionCode || '').toUpperCase();
  const tz = (timeZone || Localization.getCalendars()[0]?.timeZone || '').toLowerCase();

  // Turkey
  if (code === 'TR' || tz.includes('istanbul') || tz.includes('ankara')) {
    return 13; // Diyanet
  }

  // Saudi Arabia & Gulf
  if (['SA', 'AE', 'QA', 'KW', 'OM', 'BH', 'YE'].includes(code) || tz.includes('riyadh') || tz.includes('dubai') || tz.includes('qatar')) {
    return 4; // Umm Al-Qura
  }

  // Egypt, Sudan, Libya, Levant
  if (['EG', 'SD', 'LY', 'SY', 'JO', 'LB', 'PS'].includes(code) || tz.includes('cairo') || tz.includes('damascus') || tz.includes('beirut') || tz.includes('jerusalem') || tz.includes('amman')) {
    return 5; // Egyptian General Authority
  }

  // Pakistan, India, Bangladesh, Afghanistan
  if (['PK', 'IN', 'BD', 'AF'].includes(code) || tz.includes('karachi') || tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('dhaka') || tz.includes('kabul')) {
    return 1; // Karachi
  }

  // North America (USA, Canada)
  if (['US', 'CA'].includes(code) || tz.includes('america') || tz.includes('new_york') || tz.includes('chicago') || tz.includes('los_angeles') || tz.includes('toronto')) {
    return 2; // ISNA
  }

  // France
  if (code === 'FR' || tz.includes('paris')) {
    return 12; // UOIF
  }

  // Russia & Central Asia
  if (['RU', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AZ'].includes(code) || tz.includes('moscow') || tz.includes('tashkent') || tz.includes('almaty') || tz.includes('baku')) {
    return 14; // Russia
  }

  // Default international standard for Europe, Southeast Asia & rest of the world
  return 3; // Muslim World League (MWL)
}
