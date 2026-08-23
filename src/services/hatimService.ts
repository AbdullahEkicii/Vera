import AsyncStorage from '@react-native-async-storage/async-storage';

const HATIM_STORAGE_KEY = 'VERA_HATIM_TRACKER_DATA_V1';

export interface HatimState {
  currentPage: number; // 1 - 604
  currentJuz: number; // 1 - 30
  hatimNumber: number; // 1, 2, 3...
  startDate: string; // YYYY-MM-DD
  goalDays: number; // e.g. 30 days
  completedHatims: number;
  lastUpdated: string;
}

export const DEFAULT_HATIM_STATE: HatimState = {
  currentPage: 1,
  currentJuz: 1,
  hatimNumber: 1,
  startDate: new Date().toISOString().split('T')[0],
  goalDays: 30,
  completedHatims: 0,
  lastUpdated: new Date().toISOString(),
};

export const getJuzFromPage = (page: number): number => {
  if (page <= 1) return 1;
  return Math.min(30, Math.floor((page - 2) / 20) + 1);
};

export const loadHatimState = async (): Promise<HatimState> => {
  try {
    const raw = await AsyncStorage.getItem(HATIM_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Error loading hatim state:', error);
  }
  return DEFAULT_HATIM_STATE;
};

export const saveHatimState = async (state: HatimState): Promise<void> => {
  try {
    await AsyncStorage.setItem(HATIM_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving hatim state:', error);
  }
};

export const updateHatimPage = async (newPage: number): Promise<HatimState> => {
  const current = await loadHatimState();
  const validPage = Math.max(1, Math.min(604, newPage));
  const juz = getJuzFromPage(validPage);
  
  let completedHatims = current.completedHatims;
  let hatimNumber = current.hatimNumber;
  
  // If reached the end of the Quran
  if (validPage >= 604 && current.currentPage < 604) {
    completedHatims += 1;
  }

  const updated: HatimState = {
    ...current,
    currentPage: validPage,
    currentJuz: juz,
    completedHatims,
    lastUpdated: new Date().toISOString(),
  };

  await saveHatimState(updated);
  return updated;
};

export const resetHatim = async (goalDays: number = 30): Promise<HatimState> => {
  const current = await loadHatimState();
  const updated: HatimState = {
    currentPage: 1,
    currentJuz: 1,
    hatimNumber: current.hatimNumber + 1,
    startDate: new Date().toISOString().split('T')[0],
    goalDays,
    completedHatims: current.completedHatims,
    lastUpdated: new Date().toISOString(),
  };
  await saveHatimState(updated);
  return updated;
};
