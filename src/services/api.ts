import { AppStorage as AsyncStorage } from './storageService';

import { calculateOfflinePrayerTimes } from './offlinePrayerService';
import { HIJRI_MONTHS_TR, RELIGIOUS_DAY_DEFS, ReligiousDay } from '../data/religiousDays';

const CACHE_KEY = 'PRAYER_TIMES_CACHE';

// Aladhan API Types
export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface DayData {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    gregorian: { date: string };
    hijri: {
      date: string;
      day: string;
      month: { en: string; ar: string };
      year: string;
    };
  };
}

export interface CachedData {
  month: number;
  year: number;
  latitude: number;
  longitude: number;
  method: number;
  data: DayData[];
}

export const autoDetectCalculationMethod = (latitude: number, longitude: number): number => {
  // 1. Turkey (Lat 35.5 - 42.5, Lng 25.0 - 45.0) -> Diyanet (13)
  if (latitude >= 35.5 && latitude <= 42.5 && longitude >= 25.0 && longitude <= 45.0) {
    return 13;
  }

  // 2. Italy (Lat 36.0 - 47.5, Lng 6.6 - 18.5) -> Muslim World League (3) [Standard for UCOII]
  if (latitude >= 36.0 && latitude <= 47.5 && longitude >= 6.6 && longitude <= 18.5) {
    return 3;
  }

  // 3. France (Lat 42.0 - 51.5, Lng -5.0 - 7.5) -> UOIF France (12)
  if (latitude >= 42.0 && latitude <= 51.5 && longitude >= -5.0 && longitude <= 7.5) {
    return 12;
  }

  // 4. Russia & Central Asia (Lat 47.0 - 75.0, Lng 33.0 - 180.0) -> Russia Spiritual Admin (14)
  if (latitude >= 47.0 && latitude <= 75.0 && longitude >= 33.0 && longitude <= 180.0) {
    return 14;
  }

  // 5. South Asia: India, Pakistan, Bangladesh, Afghanistan, Sri Lanka (Lat 5°N - 38°N, Lng 60°E - 95°E) -> Karachi (1)
  if (latitude >= 5.0 && latitude <= 38.0 && longitude >= 60.0 && longitude <= 95.0) {
    return 1;
  }

  // 6. North America: USA, Canada, Mexico (Lat 14°N - 75°N, Lng -170°W - -50°W) -> ISNA (2)
  if (latitude >= 14.0 && latitude <= 75.0 && longitude >= -170.0 && longitude <= -50.0) {
    return 2;
  }

  // 7. Saudi Arabia & Gulf (UAE, Qatar, Kuwait, Oman, Bahrain, Yemen) (Lat 12°N - 32°N, Lng 34°E - 60°E) -> Umm Al-Qura (4)
  if (latitude >= 12.0 && latitude <= 32.0 && longitude >= 34.0 && longitude <= 60.0) {
    return 4;
  }

  // 8. Egypt & North Africa (Sudan, Libya, Algeria, Morocco, Tunisia) (Lat 10°N - 37°N, Lng -17°W - 35°E) -> Egyptian General Authority (5)
  if (latitude >= 10.0 && latitude <= 37.0 && longitude >= -17.0 && longitude <= 35.0) {
    return 5;
  }

  // 9. Rest of World (Europe, UK, SE Asia, Australia, LatAm, Africa) -> Muslim World League (3)
  return 3;
};

export const getCachedPrayerTimes = async (): Promise<CachedData | null> => {
  try {
    const cachedString = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedString) {
      return JSON.parse(cachedString) as CachedData;
    }
  } catch (e) {
    console.warn('Error reading cached prayer times:', e);
  }
  return null;
};

// Tracks whether the most recent fetchPrayerTimes() call returned an on-device
// calculated estimate (network + cache both unavailable) rather than verified API data,
// so the UI can surface an "estimated" disclosure to the user.
let lastPrayerTimesWereEstimated = false;
export const wasLastPrayerTimesFetchEstimated = (): boolean => lastPrayerTimesWereEstimated;

export interface PrayerOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export const DEFAULT_OFFSETS: PrayerOffsets = {
  fajr: 0,
  sunrise: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

export const getPrayerOffsets = async (): Promise<PrayerOffsets> => {
  try {
    const saved = await AsyncStorage.getItem('PRAYER_TIME_OFFSETS');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_OFFSETS;
};

export const savePrayerOffsets = async (offsets: PrayerOffsets): Promise<void> => {
  await AsyncStorage.setItem('PRAYER_TIME_OFFSETS', JSON.stringify(offsets));
};

export function applyOffsetsToTimings(timings: PrayerTimes, offsets: Partial<PrayerOffsets>): PrayerTimes {
  const addMinutes = (timeStr: string, minutes: number) => {
    if (!timeStr || !minutes) return timeStr;
    const clean = timeStr.split(' ')[0];
    const [h, m] = clean.split(':');
    let total = parseInt(h, 10) * 60 + parseInt(m, 10) + minutes;
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(newH)}:${pad(newM)}`;
  };

  return {
    ...timings,
    Fajr: addMinutes(timings.Fajr, offsets.fajr || 0),
    Sunrise: addMinutes(timings.Sunrise, offsets.sunrise || 0),
    Dhuhr: addMinutes(timings.Dhuhr, offsets.dhuhr || 0),
    Asr: addMinutes(timings.Asr, offsets.asr || 0),
    Maghrib: addMinutes(timings.Maghrib, offsets.maghrib || 0),
    Sunset: addMinutes(timings.Sunset, offsets.maghrib || 0),
    Isha: addMinutes(timings.Isha, offsets.isha || 0),
  };
}

export function applyOffsetsToData(data: DayData[], offsets: PrayerOffsets): DayData[] {
  if (
    !offsets.fajr &&
    !offsets.sunrise &&
    !offsets.dhuhr &&
    !offsets.asr &&
    !offsets.maghrib &&
    !offsets.isha
  ) {
    return data;
  }
  return data.map((d) => ({
    ...d,
    timings: applyOffsetsToTimings(d.timings, offsets),
  }));
}

// Active in-flight requests map to avoid duplicate concurrent network calls
const activePrayerRequests = new Map<string, Promise<DayData[]>>();

export const fetchPrayerTimes = async (latitude: number, longitude: number): Promise<DayData[]> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  const savedMethod = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
  const method = savedMethod ? parseInt(savedMethod, 10) : autoDetectCalculationMethod(latitude, longitude);
  const offsets = await getPrayerOffsets();

  // Deduplication Key (rounded to 2 decimal places to catch micro-GPS jitter)
  const reqKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}_${year}_${month}_${method}`;

  if (activePrayerRequests.has(reqKey)) {
    console.log('Sharing in-flight prayer times request:', reqKey);
    const inFlightData = await activePrayerRequests.get(reqKey)!;
    return applyOffsetsToData(inFlightData, offsets);
  }

  const fetchPromise = (async () => {
    try {
      // Check Cache
      const cachedString = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedString) {
      const cached: CachedData = JSON.parse(cachedString);
      // If cache matches the current month, year, approximate location, and method, return it
      const isSameLocation = 
        Math.abs(cached.latitude - latitude) < 0.1 && 
        Math.abs(cached.longitude - longitude) < 0.1;
      const isSameMethod = cached.method === method;

      if (cached.year === year && cached.month === month && isSameLocation && isSameMethod) {
        console.log('Returning cached prayer times');
        lastPrayerTimesWereEstimated = false;
        // Raw times: offsets are applied once, after the promise resolves below.
        return cached.data;
      }
    }

    // Fetch from Aladhan API (current month and next month for 30+ days coverage)
    const highLatParam = Math.abs(latitude) > 45 ? '&latitudeAdjustmentMethod=3' : '';
    console.log(`Fetching new prayer times from API using method ${method}... (highLat: ${Math.abs(latitude) > 45})`);
    const response = await fetch(
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}${highLatParam}`
    );

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const json = await response.json();
    let data: DayData[] = json.data || [];

    try {
      const nextMonthDate = new Date(year, month, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth() + 1;
      const nextResponse = await fetch(
        `https://api.aladhan.com/v1/calendar/${nextYear}/${nextMonth}?latitude=${latitude}&longitude=${longitude}&method=${method}${highLatParam}`
      );
      if (nextResponse.ok) {
        const nextJson = await nextResponse.json();
        if (nextJson.data && Array.isArray(nextJson.data)) {
          data = [...data, ...nextJson.data];
        }
      }
    } catch (e) {
      console.warn('Failed to fetch next month prayer times:', e);
    }

    // Save RAW (un-offsetted) data to Cache
      const cacheToSave: CachedData = {
        month,
        year,
        latitude,
        longitude,
        method,
        data,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheToSave));

      lastPrayerTimesWereEstimated = false;
      return data;
    } catch (error) {
      console.warn('Network fetch failed, attempting offline calculation fallback:', error);
      // Offline resilience: if network fails, attempt to return cached data or calculate on-device
      try {
        const fallbackCache = await AsyncStorage.getItem(CACHE_KEY);
        if (fallbackCache) {
          const cached: CachedData = JSON.parse(fallbackCache);
          if (cached.data && cached.data.length > 0) {
            console.log('Returning fallback offline cached prayer times');
            lastPrayerTimesWereEstimated = false;
            return cached.data;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback cache read error:', fallbackErr);
      }

      // Fallback: On-device mathematical calculation with adhan library
      console.log('Calculating instant on-device offline prayer times');
      lastPrayerTimesWereEstimated = true;
      return calculateOfflinePrayerTimes(latitude, longitude, method, 35);
    } finally {
      activePrayerRequests.delete(reqKey);
    }
  })();

  activePrayerRequests.set(reqKey, fetchPromise);
  const rawData = await fetchPromise;
  return applyOffsetsToData(rawData, offsets);
};

const ramadanCache = new Map<string, { hijriYear: number; days: DayData[] }>();

/**
 * The upcoming (or current) Ramadan for a location: every day of Hijri month 9 with
 * its timings, from the API's Hijri calendar. Dates come from the Hijri calendar
 * itself (Diyanet's when the Diyanet method is used) instead of a hardcoded list.
 */
export const fetchRamadanCalendar = async (
  latitude: number,
  longitude: number
): Promise<{ hijriYear: number; days: DayData[] }> => {
  const savedMethod = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
  const method = savedMethod ? parseInt(savedMethod, 10) : autoDetectCalculationMethod(latitude, longitude);
  const calendarMethod = method === 13 ? 'DIYANET' : 'HJCoSA';
  const offsets = await getPrayerOffsets();

  const now = new Date();
  const today = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const gToH = await fetch(`https://api.aladhan.com/v1/gToH/${today}?calendarMethod=${calendarMethod}`);
  if (!gToH.ok) throw new Error(`gToH failed: ${gToH.status}`);
  const hijri = (await gToH.json()).data.hijri;
  const hijriMonth = Number(hijri.month.number);
  // Past Ramadan this Hijri year: show next year's. During Ramadan: this one.
  const hijriYear = Number(hijri.year) + (hijriMonth > 9 ? 1 : 0);

  const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}_${hijriYear}_${method}`;
  const cached = ramadanCache.get(cacheKey);
  if (cached) return { hijriYear, days: applyOffsetsToData(cached.days, offsets) };

  const highLatParam = Math.abs(latitude) > 45 ? '&latitudeAdjustmentMethod=3' : '';
  const res = await fetch(
    `https://api.aladhan.com/v1/hijriCalendar/${hijriYear}/9?latitude=${latitude}&longitude=${longitude}&method=${method}&calendarMethod=${calendarMethod}${highLatParam}`
  );
  if (!res.ok) throw new Error(`hijriCalendar failed: ${res.status}`);
  const days: DayData[] = (await res.json()).data || [];
  ramadanCache.set(cacheKey, { hijriYear, days });
  return { hijriYear, days: applyOffsetsToData(days, offsets) };
};

// The API rate-limits bursts (429/5xx on ~20 parallel calls), so callers go one at a
// time and transient failures are retried with a short backoff.
const hToG = async (day: number, month: number, year: number, calendarMethod: string): Promise<Date> => {
  const url = `https://api.aladhan.com/v1/hToG/${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}?calendarMethod=${calendarMethod}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const [dd, mm, yyyy] = (await res.json()).data.gregorian.date.split('-').map(Number);
      return new Date(yyyy, mm - 1, dd);
    }
    // 429 is rate limiting: worth several retries. A 500 is usually a date outside the
    // calendar's table (Diyanet stops after Sha'ban 1449), so retry it only once.
    const maxAttempts = res.status === 429 ? 4 : res.status >= 500 ? 2 : 1;
    if (attempt >= maxAttempts) throw new Error(`hToG failed: ${res.status}`);
    await new Promise((r) => setTimeout(r, 700 * attempt));
  }
};

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const computeReligiousDaysForYear = async (
  hijriYear: number,
  calendarMethod: string
): Promise<{ days: ReligiousDay[]; complete: boolean }> => {
  // Days within a Hijri month advance one Gregorian day at a time, so only each
  // month's first day needs a lookup: 7 sequential calls instead of 10 parallel ones.
  const monthStarts = new Map<number, Date>();
  let complete = true;
  for (const month of new Set(RELIGIOUS_DAY_DEFS.map((d) => d.hijriMonth))) {
    try {
      monthStarts.set(month, await hToG(1, month, hijriYear, calendarMethod));
    } catch {
      // A month missing from the chosen calendar's table (e.g. Diyanet beyond
      // Sha'ban 1449) falls back to the general Hijri calendar instead of failing
      // the whole list; if that also fails, only that month's days are skipped.
      complete = false;
      try {
        if (calendarMethod !== 'HJCoSA') monthStarts.set(month, await hToG(1, month, hijriYear, 'HJCoSA'));
      } catch {}
    }
  }

  const days = RELIGIOUS_DAY_DEFS.filter((def) => monthStarts.has(def.hijriMonth)).map((def) => {
      const base = addDays(monthStarts.get(def.hijriMonth)!, def.hijriDay - 1);
      let date = base;
      let hijriDay = def.hijriDay;
      if (def.kind === 'night') {
        date = addDays(base, -1);
      } else if (def.kind === 'regaip') {
        const toFriday = (5 - base.getDay() + 7) % 7; // first Friday of Rajab
        hijriDay = def.hijriDay + toFriday;
        date = addDays(base, toFriday - 1); // the Thursday night before it
      }
      const monthTR = HIJRI_MONTHS_TR[def.hijriMonth - 1];
      const isNewYear = def.id === 'hijri-new-year';
      return {
        id: `${def.id}-${hijriYear}`,
        nameTR: isNewYear ? `${def.nameTR} (${hijriYear})` : def.nameTR,
        nameEN: isNewYear ? `${def.nameEN} (${hijriYear} AH)` : def.nameEN,
        gregorianDate: toIsoDate(date),
        hijriDate: `${hijriDay} ${monthTR} ${hijriYear}`,
        hijriDay,
        hijriMonth: def.hijriMonth,
        hijriYear,
        descriptionTR: def.descriptionTR,
        descriptionEN: def.descriptionEN,
      };
  });
  return { days, complete };
};

/**
 * Religious days and kandil nights for the next 12 months, derived from the Hijri
 * calendar (Diyanet's when the Diyanet method is selected). A Hijri year's dates
 * never change, so each year is computed once and kept on device.
 */
export const fetchReligiousDays = async (): Promise<ReligiousDay[]> => {
  const savedMethod = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
  const calendarMethod = !savedMethod || parseInt(savedMethod, 10) === 13 ? 'DIYANET' : 'HJCoSA';

  const now = new Date();
  const today = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const gToH = await fetch(`https://api.aladhan.com/v1/gToH/${today}?calendarMethod=${calendarMethod}`);
  if (!gToH.ok) throw new Error(`gToH failed: ${gToH.status}`);
  const currentHijriYear = Number((await gToH.json()).data.hijri.year);

  const perYear: ReligiousDay[][] = [];
  for (const year of [currentHijriYear, currentHijriYear + 1]) {
    const key = `RELIGIOUS_DAYS_${calendarMethod}_${year}_V2`;
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      const entry: { days: ReligiousDay[]; complete: boolean; savedAt: number } = JSON.parse(saved);
      // A complete year never changes; a partial one is retried after a week.
      if (entry.complete || Date.now() - entry.savedAt < 7 * 24 * 60 * 60 * 1000) {
        perYear.push(entry.days);
        continue;
      }
    }
    const { days, complete } = await computeReligiousDaysForYear(year, calendarMethod);
    await AsyncStorage.setItem(key, JSON.stringify({ days, complete, savedAt: Date.now() }));
    perYear.push(days);
  }

  const todayIso = toIsoDate(now);
  const horizonIso = toIsoDate(addDays(now, 366));
  return perYear
    .flat()
    .filter((d) => d.gregorianDate >= todayIso && d.gregorianDate <= horizonIso)
    .sort((a, b) => a.gregorianDate.localeCompare(b.gregorianDate));
};

// Helper function to extract cleanly formatted times for today
export const getTodayPrayerTimes = (data: DayData[]) => {
  const date = new Date();
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearStr = date.getFullYear();
  const todayFormatted = `${dayStr}-${monthStr}-${yearStr}`; // DD-MM-YYYY

  const todayData = data.find((d) => d.date.gregorian.date === todayFormatted);
  
  if (!todayData) return null;

  // Clean times (Aladhan returns '04:30 (EEST)', we need '04:30')
  const cleanTime = (time: string) => time.split(' ')[0];

  return {
    fajr: cleanTime(todayData.timings.Fajr),
    sunrise: cleanTime(todayData.timings.Sunrise),
    dhuhr: cleanTime(todayData.timings.Dhuhr),
    asr: cleanTime(todayData.timings.Asr),
    maghrib: cleanTime(todayData.timings.Maghrib),
    isha: cleanTime(todayData.timings.Isha),
    hijri: todayData.date.hijri,
    gregorian: todayData.date.gregorian,
  };
};

// Weather integration using Open-Meteo with 20-minute in-memory cache
export interface WeatherData {
  temp: number;
  code: number;
}

interface WeatherCacheEntry<T> {
  data: T;
  timestamp: number;
  latitude: number;
  longitude: number;
}

const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
let _weatherCache: WeatherCacheEntry<WeatherData> | null = null;
let _detailedWeatherCache: WeatherCacheEntry<DetailedWeatherData> | null = null;

export const fetchWeather = async (latitude: number, longitude: number): Promise<WeatherData | null> => {
  // Check 20-min cache
  if (
    _weatherCache &&
    Date.now() - _weatherCache.timestamp < WEATHER_CACHE_TTL_MS &&
    Math.abs(_weatherCache.latitude - latitude) < 0.05 &&
    Math.abs(_weatherCache.longitude - longitude) < 0.05
  ) {
    return _weatherCache.data;
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
    );
    if (!response.ok) return null;
    const json = await response.json();
    const result = {
      temp: Math.round(json.current.temperature_2m),
      code: json.current.weather_code,
    };
    _weatherCache = {
      data: result,
      timestamp: Date.now(),
      latitude,
      longitude,
    };
    return result;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return _weatherCache?.data || null;
  }
};

export const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if ([1, 2, 3].includes(code)) return '🌤️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
};

/** Feather icon name for a WMO weather code (same ranges as getWeatherEmoji). */
export const getWeatherIcon = (code: number): string => {
  if (code === 0) return 'sun';
  if ([1, 2, 3, 45, 48].includes(code)) return 'cloud';
  if ([51, 53, 55].includes(code)) return 'cloud-drizzle';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'cloud-rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'cloud-snow';
  if ([95, 96, 99].includes(code)) return 'cloud-lightning';
  return 'thermometer';
};

// Weather Forecast Interface and Fetching
export interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

export interface HourlyForecast {
  time: string; // e.g. "14:00"
  temp: number;
  code: number;
  pop: number; // precipitation probability %
}

export interface DetailedWeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  uvIndex: number;
  code: number;
  sunrise: string;
  sunset: string;
  hourly: HourlyForecast[];
  daily: ForecastDay[];
}

export const fetchWeatherForecast = async (latitude: number, longitude: number): Promise<ForecastDay[]> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    if (!response.ok) return [];
    const json = await response.json();
    const daily = json.daily;
    const list: ForecastDay[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      list.push({
        date: daily.time[i],
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        code: daily.weather_code[i],
      });
    }
    return list;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return [];
  }
};

export const fetchDetailedWeather = async (latitude: number, longitude: number): Promise<DetailedWeatherData | null> => {
  // Check 20-min cache
  if (
    _detailedWeatherCache &&
    Date.now() - _detailedWeatherCache.timestamp < WEATHER_CACHE_TTL_MS &&
    Math.abs(_detailedWeatherCache.latitude - latitude) < 0.05 &&
    Math.abs(_detailedWeatherCache.longitude - longitude) < 0.05
  ) {
    return _detailedWeatherCache.data;
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`
    );
    if (!response.ok) return null;
    const json = await response.json();
    const current = json.current || {};
    const daily = json.daily || {};
    const hourly = json.hourly || {};

    const dailyList: ForecastDay[] = [];
    if (daily.time && Array.isArray(daily.time)) {
      for (let i = 0; i < daily.time.length; i++) {
        dailyList.push({
          date: daily.time[i],
          maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
          minTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
          code: daily.weather_code?.[i] ?? 0,
        });
      }
    }

    const hourlyList: HourlyForecast[] = [];
    if (hourly.time && Array.isArray(hourly.time)) {
      const now = new Date();
      const currentHour = now.getHours();
      // Find start hour
      const todayDatePrefix = now.toISOString().split('T')[0];
      let startIndex = hourly.time.findIndex((t: string) => t.startsWith(`${todayDatePrefix}T${String(currentHour).padStart(2, '0')}`));
      if (startIndex === -1) startIndex = 0;

      for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
        const timeStr = hourly.time[i];
        const hourPart = timeStr.includes('T') ? timeStr.split('T')[1].slice(0, 5) : timeStr;
        hourlyList.push({
          time: hourPart,
          temp: Math.round(hourly.temperature_2m?.[i] ?? 0),
          code: hourly.weather_code?.[i] ?? 0,
          pop: Math.round(hourly.precipitation_probability?.[i] ?? 0),
        });
      }
    }

    const sunriseStr = daily.sunrise?.[0] ? daily.sunrise[0].split('T')[1]?.slice(0, 5) : '--:--';
    const sunsetStr = daily.sunset?.[0] ? daily.sunset[0].split('T')[1]?.slice(0, 5) : '--:--';

    const detailedResult: DetailedWeatherData = {
      temp: Math.round(current.temperature_2m ?? 0),
      feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      pressure: Math.round(current.surface_pressure ?? 1013),
      uvIndex: Math.round(current.uv_index ?? daily.uv_index_max?.[0] ?? 0),
      code: current.weather_code ?? 0,
      sunrise: sunriseStr,
      sunset: sunsetStr,
      hourly: hourlyList,
      daily: dailyList,
    };

    _detailedWeatherCache = {
      data: detailedResult,
      timestamp: Date.now(),
      latitude,
      longitude,
    };

    return detailedResult;
  } catch (error) {
    console.error('Error fetching detailed weather:', error);
    return _detailedWeatherCache?.data || null;
  }
};

// Multilingual weather description for all 34 supported languages
export const getWeatherDescription = (code: number, lang: string): string => {
  const cleanLang = lang.split('-')[0].toLowerCase();
  
  const translations: Record<string, Record<string, string>> = {
    en: { sunny: 'Sunny', cloudy: 'Cloudy', foggy: 'Foggy', rainy: 'Rainy', snowy: 'Snowy', stormy: 'Stormy', unknown: 'Unknown' },
    tr: { sunny: 'Güneşli', cloudy: 'Bulutlu', foggy: 'Sisli', rainy: 'Yağmurlu', snowy: 'Karlı', stormy: 'Fırtınalı', unknown: 'Bilinmeyen' },
    ar: { sunny: 'مشمس', cloudy: 'غائم', foggy: 'ضبابي', rainy: 'ممطر', snowy: 'ثلجي', stormy: 'عاصف', unknown: 'غير معروف' },
    es: { sunny: 'Soleado', cloudy: 'Nublado', foggy: 'Neblinoso', rainy: 'Lluvioso', snowy: 'Nevado', stormy: 'Tormentoso', unknown: 'Desconocido' },
    fr: { sunny: 'Ensoleillé', cloudy: 'Nuageux', foggy: 'Brouillard', rainy: 'Pluvieux', snowy: 'Neigeux', stormy: 'Orageux', unknown: 'Inconnu' },
    id: { sunny: 'Cerah', cloudy: 'Berawan', foggy: 'Berkabut', rainy: 'Hujan', snowy: 'Bersalju', stormy: 'Badai', unknown: 'Tidak diketahui' },
    ur: { sunny: 'دھوپ', cloudy: 'ابر آلود', foggy: 'دھندلا', rainy: 'بارش', snowy: 'برف باری', stormy: 'طوفانی', unknown: 'نامعلوم' },
    fa: { sunny: 'آفتابی', cloudy: 'ابری', foggy: 'مه آلود', rainy: 'بارانی', snowy: 'برفی', stormy: 'طوفانی', unknown: 'نامشخص' },
    ru: { sunny: 'Ясно', cloudy: 'Облачно', foggy: 'Туманно', rainy: 'Дождливо', snowy: 'Снежно', stormy: 'Гроза', unknown: 'Неизвестно' },
    bn: { sunny: 'রৌদ্রোজ্জ্বল', cloudy: 'মেঘলা', foggy: 'কুয়াশাচ্ছন্ন', rainy: 'বৃষ্টি', snowy: 'বরফাবৃত', stormy: 'ঝড়ো', unknown: 'অজানা' },
    ms: { sunny: 'Cerah', cloudy: 'Berawan', foggy: 'Berkabut', rainy: 'Hujan', snowy: 'Bersalju', stormy: 'Ribut', unknown: 'Tidak diketahui' },
    ha: { sunny: 'Rana', cloudy: 'Girmak', foggy: 'Haushi', rainy: 'Ruwa', snowy: 'Kankara', stormy: 'Hadari', unknown: 'Ba a sani ba' },
    sw: { sunny: 'Jua', cloudy: 'Mawingu', foggy: 'Ukungu', rainy: 'Mvua', snowy: 'Theluji', stormy: 'Dhoruba', unknown: 'Haijulikani' },
    de: { sunny: 'Sonnig', cloudy: 'Bewölkt', foggy: 'Nebelig', rainy: 'Regnerisch', snowy: 'Schneebedeckt', stormy: 'Stürmisch', unknown: 'Unbekannt' },
    zh: { sunny: '晴天', cloudy: '多云', foggy: '有雾', rainy: '有雨', snowy: '有雪', stormy: '暴风雨', unknown: '未知' },
    it: { sunny: 'Soleggiato', cloudy: 'Nuvoloso', foggy: 'Nebbioso', rainy: 'Piovoso', snowy: 'Nevoso', stormy: 'Temporalesco', unknown: 'Sconosciuto' },
    nl: { sunny: 'Zonnig', cloudy: 'Bewolkt', foggy: 'Mistig', rainy: 'Regenachtig', snowy: 'Sneeuwachtig', stormy: 'Stormachtig', unknown: 'Onbekend' },
    uz: { sunny: 'Quyoshli', cloudy: 'Bulutli', foggy: 'Tumanli', rainy: 'Yomgʻirli', snowy: 'Qorli', stormy: 'Boʻronli', unknown: 'Nomaʻlum' },
    hi: { sunny: 'धूप', cloudy: 'बादल', foggy: 'कोहरा', rainy: 'बारिश', snowy: 'बर्फ़', stormy: 'तूफ़ानी', unknown: 'अज्ञात' },
    sq: { sunny: 'Me diell', cloudy: 'Vranët', foggy: 'Mjegullt', rainy: 'Me shi', snowy: 'Me borë', stormy: 'Stuhi', unknown: 'I panjohur' },
    cs: { sunny: 'Slunečno', cloudy: 'Zataženo', foggy: 'Mlha', rainy: 'Deštivo', snowy: 'Sněžení', stormy: 'Bouřka', unknown: 'Neznámé' },
    da: { sunny: 'Solrigt', cloudy: 'Skyet', foggy: 'Tåget', rainy: 'Regnfuldt', snowy: 'Snevejr', stormy: 'Stormfuldt', unknown: 'Ukendt' },
    fi: { sunny: 'Aurinkoista', cloudy: 'Pilvistä', foggy: 'Sumuista', rainy: 'Sateista', snowy: 'Luminen', stormy: 'Myrskyinen', unknown: 'Tuntematon' },
    hu: { sunny: 'Napos', cloudy: 'Felhős', foggy: 'Ködös', rainy: 'Esős', snowy: 'Havas', stormy: 'Viharos', unknown: 'Ismeretlen' },
    ja: { sunny: '晴れ', cloudy: '曇り', foggy: '霧', rainy: '雨', snowy: '雪', stormy: '嵐', unknown: '不明' },
    ko: { sunny: '맑음', cloudy: '흐림', foggy: '안개', rainy: '비', snowy: '눈', stormy: '폭풍', unknown: '알 수 없음' },
    no: { sunny: 'Solrikt', cloudy: 'Skyet', foggy: 'Tåkete', rainy: 'Regnfullt', snowy: 'Snø', stormy: 'Stormfullt', unknown: 'Ukjent' },
    pl: { sunny: 'Słonecznie', cloudy: 'Pochmurno', foggy: 'Mgliście', rainy: 'Deszczowo', snowy: 'Śnieżnie', stormy: 'Burzowo', unknown: 'Nieznane' },
    pt: { sunny: 'Ensolarado', cloudy: 'Nublado', foggy: 'Nebuloso', rainy: 'Chuvoso', snowy: 'Nevado', stormy: 'Tempestuoso', unknown: 'Desconhecido' },
    ro: { sunny: 'Însorit', cloudy: 'Înnorat', foggy: 'Ceață', rainy: 'Ploios', snowy: 'Ninsoare', stormy: 'Furtunos', unknown: 'Necunoscut' },
    sk: { sunny: 'Slnečno', cloudy: 'Oblačno', foggy: 'Hmla', rainy: 'Daždivo', snowy: 'Sneženie', stormy: 'Búrka', unknown: 'Neznáme' },
    sv: { sunny: 'Soligt', cloudy: 'Molnigt', foggy: 'Dimmigt', rainy: 'Regnigt', snowy: 'Snöigt', stormy: 'Stormigt', unknown: 'Okänt' },
    th: { sunny: 'แดดออก', cloudy: 'มีเมฆมาก', foggy: 'มีหมอก', rainy: 'ฝนตก', snowy: 'หิมะตก', stormy: 'พายุ', unknown: 'ไม่ทราบ' },
    uk: { sunny: 'Сонячно', cloudy: 'Хмарно', foggy: 'Туманно', rainy: 'Дощово', snowy: 'Сніжно', stormy: 'Штормово', unknown: 'Невідомо' },
    vi: { sunny: 'Nắng', cloudy: 'Nhiều mây', foggy: 'Sương mù', rainy: 'Mưa', snowy: 'Tuyết', stormy: 'Bão', unknown: 'Không xác định' },
  };

  const dict = translations[cleanLang] || translations.en;
  
  if (code === 0) return dict.sunny;
  if ([1, 2, 3].includes(code)) return dict.cloudy;
  if ([45, 48].includes(code)) return dict.foggy;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return dict.rainy;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return dict.snowy;
  if ([95, 96, 99].includes(code)) return dict.stormy;
  return dict.unknown;
};
