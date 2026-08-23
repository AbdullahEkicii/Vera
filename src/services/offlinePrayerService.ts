import { Coordinates, CalculationMethod, PrayerTimes, CalculationParameters, Madhab, HighLatitudeRule } from 'adhan';
import { DayData } from './api';

/**
 * Maps app calculation method ID to Adhan JS CalculationMethod parameter
 * 1: Karachi (Karachi)
 * 2: ISNA (NorthAmerica)
 * 3: MWL (MuslimWorldLeague)
 * 4: Umm Al-Qura (UmmAlQura)
 * 5: Egyptian (Egyptian)
 * 12: France (UOIF / 12 degrees)
 * 13: Diyanet (Turkey Diyanet / 18 deg Fajr, 17 deg Isha)
 * 14: Russia (Spiritual Administration of Muslims of Russia)
 */
export function getAdhanCalculationParams(methodId: number): CalculationParameters {
  switch (methodId) {
    case 1: // Karachi
      return CalculationMethod.Karachi();
    case 2: // ISNA
      return CalculationMethod.NorthAmerica();
    case 3: // MWL
      return CalculationMethod.MuslimWorldLeague();
    case 4: // Umm Al Qura
      return CalculationMethod.UmmAlQura();
    case 5: // Egypt
      return CalculationMethod.Egyptian();
    case 12: // France
      return CalculationMethod.Other(); // Custom 12 deg
    case 13: // Diyanet
      {
        const params = CalculationMethod.Turkey();
        return params;
      }
    case 14: // Russia
      return CalculationMethod.MuslimWorldLeague(); // 18 deg Fajr, 17 deg Isha
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function formatTime24(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Generate 30 days of offline prayer times in Aladhan API format (DayData[])
 */
export function calculateOfflinePrayerTimes(
  latitude: number,
  longitude: number,
  methodId: number = 13,
  daysCount: number = 35
): DayData[] {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getAdhanCalculationParams(methodId);

  // Set high latitude rule if beyond 48 degrees
  if (Math.abs(latitude) > 48) {
    params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  }

  const result: DayData[] = [];
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start from beginning of current month

  for (let i = 0; i < daysCount; i++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + i);

    const prayerTimes = new PrayerTimes(coordinates, targetDate, params);

    const dayStr = pad(targetDate.getDate());
    const monthStr = pad(targetDate.getMonth() + 1);
    const yearStr = targetDate.getFullYear().toString();
    const dateFormatted = `${dayStr}-${monthStr}-${yearStr}`;

    result.push({
      timings: {
        Fajr: formatTime24(prayerTimes.fajr),
        Sunrise: formatTime24(prayerTimes.sunrise),
        Dhuhr: formatTime24(prayerTimes.dhuhr),
        Asr: formatTime24(prayerTimes.asr),
        Sunset: formatTime24(prayerTimes.maghrib),
        Maghrib: formatTime24(prayerTimes.maghrib),
        Isha: formatTime24(prayerTimes.isha),
        Imsak: formatTime24(new Date(prayerTimes.fajr.getTime() - 10 * 60 * 1000)), // 10 min before Fajr
        Midnight: formatTime24(new Date(prayerTimes.maghrib.getTime() + (prayerTimes.fajr.getTime() - prayerTimes.maghrib.getTime()) / 2)),
      },
      date: {
        readable: `${dayStr} ${monthStr} ${yearStr}`,
        timestamp: Math.floor(targetDate.getTime() / 1000).toString(),
        gregorian: { date: dateFormatted },
        hijri: {
          date: dateFormatted,
          day: dayStr,
          month: { en: 'Hijri', ar: 'هجري' },
          year: '1447',
        },
      },
    });
  }

  return result;
}
