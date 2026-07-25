import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_READ: '@quran_last_read',
  READ_HISTORY: '@quran_read_history',
  FAVORITE_SURAHS: '@quran_favorite_surahs',
};

export interface ReadingHistoryItem {
  id: string; // unique id
  juz: number;
  surah: number;
  surahName: string;
  page: number;
  timestamp: number;
}

export const saveLastRead = async (
  juz: number,
  surah: number,
  surahName: string,
  page: number
): Promise<void> => {
  try {
    const timestamp = Date.now();
    const item: ReadingHistoryItem = {
      id: `${timestamp}`,
      juz,
      surah,
      surahName,
      page,
      timestamp,
    };
    
    // Save to last read
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(item));

    // Save to history
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.READ_HISTORY);
    let history: ReadingHistoryItem[] = historyJson ? JSON.parse(historyJson) : [];
    
    // Add to top and keep only last 50 items
    history.unshift(item);
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.READ_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving last read:', error);
  }
};

export const getLastRead = async (): Promise<ReadingHistoryItem | null> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.LAST_READ);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error getting last read:', error);
    return null;
  }
};

export const getReadingHistory = async (): Promise<ReadingHistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.READ_HISTORY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error getting reading history:', error);
    return [];
  }
};

export const getFavoriteSurahs = async (): Promise<number[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_SURAHS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error getting favorite surahs:', error);
    return [];
  }
};

export const toggleFavoriteSurah = async (surahId: number): Promise<number[]> => {
  try {
    const favorites = await getFavoriteSurahs();
    let newFavorites;
    if (favorites.includes(surahId)) {
      newFavorites = favorites.filter((id) => id !== surahId);
    } else {
      newFavorites = [...favorites, surahId];
    }
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_SURAHS, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (error) {
    console.error('Error toggling favorite surah:', error);
    return [];
  }
};
