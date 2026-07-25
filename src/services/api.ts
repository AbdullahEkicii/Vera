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

export const fetchPrayerTimes = async (latitude: number, longitude: number): Promise<DayData[]> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  try {
    // Get current calculation method
    const savedMethod = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
    const method = savedMethod ? parseInt(savedMethod, 10) : 13;

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

    // Fetch from Aladhan API
    console.log(`Fetching new prayer times from API using method ${method}...`);
    const response = await fetch(
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}`
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const json = await response.json();
    const data: DayData[] = json.data;

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
    console.error('Error fetching prayer times:', error);
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
