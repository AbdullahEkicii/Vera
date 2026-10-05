import * as StoreReview from 'expo-store-review';
import { AppStorage } from './storageService';
import { logEvent } from './analyticsService';

/**
 * Google Play in-app review, asked at moments the user just got value from the app.
 *
 * Play policy forbids gating the review behind our own "do you like the app?" or
 * star screen, so this calls the native API directly and lets Play decide whether
 * to show it (Play also applies its own quota). Feedback lives in Settings instead.
 */
export type ReviewTrigger = 'open_5' | 'all_five_prayers' | 'hatim_completed';

const LAST_REQUEST_KEY = 'LAST_REVIEW_REQUEST_AT';
const MIN_DAYS_BETWEEN_REQUESTS = 30;

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  try {
    const last = Number((await AppStorage.getItem(LAST_REQUEST_KEY)) || 0);
    if (last && Date.now() - last < MIN_DAYS_BETWEEN_REQUESTS * 24 * 60 * 60 * 1000) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    await AppStorage.setItem(LAST_REQUEST_KEY, String(Date.now()));
    logEvent('review_requested', { trigger });
    await StoreReview.requestReview();
  } catch (e) {
    if (__DEV__) console.warn('In-app review request failed:', e);
  }
}
