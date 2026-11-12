import { AppStorage as AsyncStorage } from './storageService';
import { maybeRequestReview } from './reviewService';
import { toLocalIsoDay } from '../utils/zonedTime';

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
  startDate: toLocalIsoDay(),
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

  // If reached the end of the Quran
  const justCompleted = validPage >= 604 && current.currentPage < 604;
  if (justCompleted) {
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
  if (justCompleted) maybeRequestReview('hatim_completed');
  return updated;
};

export const resetHatim = async (goalDays: number = 30): Promise<HatimState> => {
  const current = await loadHatimState();
  const updated: HatimState = {
    currentPage: 1,
    currentJuz: 1,
    hatimNumber: current.hatimNumber + 1,
    startDate: toLocalIsoDay(),
    goalDays,
    completedHatims: current.completedHatims,
    lastUpdated: new Date().toISOString(),
  };
  await saveHatimState(updated);
  return updated;
};
