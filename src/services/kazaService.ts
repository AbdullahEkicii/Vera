import AsyncStorage from '@react-native-async-storage/async-storage';

export type KazaPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'witr' | 'fasting';

export interface KazaItem {
  debt: number;       // Toplam borç
  completed: number;  // Kılınan / tutulan kaza
}

export interface KazaState {
  fajr: KazaItem;
  dhuhr: KazaItem;
  asr: KazaItem;
  maghrib: KazaItem;
  isha: KazaItem;
  witr: KazaItem;
  fasting: KazaItem;
  dailyGoal: number;  // Günlük hedef
  updatedAt: string;
}

const KAZA_STORAGE_KEY = 'VERA_KAZA_TRACKER_V1';

export const DEFAULT_KAZA_STATE: KazaState = {
  fajr: { debt: 0, completed: 0 },
  dhuhr: { debt: 0, completed: 0 },
  asr: { debt: 0, completed: 0 },
  maghrib: { debt: 0, completed: 0 },
  isha: { debt: 0, completed: 0 },
  witr: { debt: 0, completed: 0 },
  fasting: { debt: 0, completed: 0 },
  dailyGoal: 5,
  updatedAt: new Date().toISOString(),
};

export const loadKazaState = async (): Promise<KazaState> => {
  try {
    const raw = await AsyncStorage.getItem(KAZA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_KAZA_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Error loading kaza state:', e);
  }
  return DEFAULT_KAZA_STATE;
};

export const saveKazaState = async (state: KazaState): Promise<void> => {
  try {
    const toSave = { ...state, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KAZA_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving kaza state:', e);
  }
};

export const calculateKazaDebtByTime = (years: number, months: number = 0, days: number = 0): {
  prayers: number;
  fasting: number;
} => {
  const totalDays = Math.max(0, years * 365 + months * 30 + days);
  return {
    prayers: totalDays,
    fasting: Math.max(0, years * 30 + Math.round(months * 2.5)),
  };
};
