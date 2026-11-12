import { AppStorage } from './storageService';

// Feature tours (community how-to, coach tips, widget promo) used to appear all at once on the first
// launch. A tour now comes back only after `every` units (days or launches), and stops after `max` shows.
type TourState = { shown: number; last: number };

const readState = async (key: string): Promise<TourState> => {
  try {
    const raw = await AppStorage.getItem(key);
    if (!raw) return { shown: 0, last: 0 };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    return { shown: parsed.shown ?? 0, last: parsed.last ?? 0 };
  } catch {
    return { shown: 0, last: 0 };
  }
};

/** Whether a tour may show now. `now` is a timestamp or a launch number, matching `every`. */
export async function shouldShowTour(
  key: string,
  now: number,
  { every, max }: { every: number; max: number }
): Promise<boolean> {
  const state = await readState(key);
  if (state.shown >= max) return false;
  return state.shown === 0 || now - state.last >= every;
}

/** Records one show. Call it when the tour actually appears, not when it is only decided. */
export async function markTourShown(key: string, now: number): Promise<void> {
  const state = await readState(key);
  try {
    await AppStorage.setItem(key, JSON.stringify({ shown: state.shown + 1, last: now }));
  } catch {
    // Best-effort: at worst the tour shows once more.
  }
}

export const DAY_MS = 24 * 60 * 60 * 1000;
