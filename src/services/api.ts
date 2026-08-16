import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Turkey (Lat 35.5 - 42.5, Lng 25.0 - 45.0) -> Diyanet (13)
  if (latitude >= 35.5 && latitude <= 42.5 && longitude >= 25.0 && longitude <= 45.0) {
    return 13;
  }

  // Russia & CIS Countries (Lat 43.0 - 75.0, Lng 25.0 - 180.0) -> Russia Spiritual Admin (14)
  if (latitude >= 43.0 && latitude <= 75.0 && longitude >= 25.0 && longitude <= 180.0) {
    return 14;
  }

  // South Asia: India, Bangladesh, Pakistan, Afghanistan, Sri Lanka (Lng 60°E - 95°E, Lat 5°N - 38°N) -> Karachi (1)
  if (latitude >= 5.0 && latitude <= 38.0 && longitude >= 60.0 && longitude <= 95.0) {
    return 1;
  }

  // France & French territories (Lat 41.0 - 51.5, Lng -5.0 - 9.5) -> UOIF France (12)
  if (latitude >= 41.0 && latitude <= 51.5 && longitude >= -5.0 && longitude <= 9.5) {
    return 12;
  }

  // North America: USA / Canada / Mexico (Lng -170°W to -50°W, Lat 14°N to 75°N) -> ISNA (2)
  if (latitude >= 14.0 && latitude <= 75.0 && longitude >= -170.0 && longitude <= -50.0) {
    return 2;
  }

  // Saudi Arabia & Gulf States (UAE, Qatar, Kuwait, Oman, Yemen) -> Umm Al-Qura (4)
  if (latitude >= 12.0 && latitude <= 32.0 && longitude >= 34.0 && longitude <= 60.0) {
    return 4;
  }

  // Egypt & North Africa (Sudan, Libya, Algeria, Morocco, Tunisia) -> Egyptian General Authority (5)
  if (latitude >= 10.0 && latitude <= 37.0 && longitude >= -17.0 && longitude <= 35.0) {
    return 5;
  }

  // Italy, UK, Germany, Spain, Southeast Asia, Rest of World -> Muslim World League (3)
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

export const fetchPrayerTimes = async (latitude: number, longitude: number): Promise<DayData[]> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  try {
    // Get current calculation method or auto-detect based on location
    const savedMethod = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
    const method = savedMethod ? parseInt(savedMethod, 10) : autoDetectCalculationMethod(latitude, longitude);

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

    // Save to Cache
    const cacheToSave: CachedData = {
      month,
      year,
      latitude,
      longitude,
      method,
      data,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheToSave));

    return data;
  } catch (error) {
    console.error('Error fetching prayer times, attempting offline fallback:', error);
    // Offline resilience: if network fails, attempt to return any cached data
    try {
      const fallbackCache = await AsyncStorage.getItem(CACHE_KEY);
      if (fallbackCache) {
        const cached: CachedData = JSON.parse(fallbackCache);
        if (cached.data && cached.data.length > 0) {
          console.log('Returning fallback offline cached prayer times');
          return cached.data;
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback cache read error:', fallbackErr);
    }
    throw error;
  }
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

// Weather integration using Open-Meteo
export interface WeatherData {
  temp: number;
  code: number;
}

export const fetchWeather = async (latitude: number, longitude: number): Promise<WeatherData | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
    );
    if (!response.ok) return null;
    const json = await response.json();
    return {
      temp: Math.round(json.current.temperature_2m),
      code: json.current.weather_code,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
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

    return {
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
  } catch (error) {
    console.error('Error fetching detailed weather:', error);
    return null;
  }
};

// Multilingual weather description for all 14 supported languages
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
