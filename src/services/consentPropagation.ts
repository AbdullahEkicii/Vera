import { getAnalytics, setAnalyticsCollectionEnabled, setConsent } from '@react-native-firebase/analytics';
import { getCrashlytics, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';

const devWarn = (...args: any[]) => { if (__DEV__) console.warn(...args); };

/**
 * Mirrors the UMP consent outcome onto Firebase Analytics and Crashlytics so neither
 * collects data for EEA/UK users who declined. Regions where consent isn't required
 * count as granted. Never throws.
 */
export async function applyAnalyticsConsent(granted: boolean): Promise<void> {
  try {
    // firebase.json starts ad signals as denied but analytics_storage as granted, so first_open and
    // the first session are counted even if the user leaves during onboarding (before this runs);
    // this applies the real UMP outcome once it is known.
    await setConsent(getAnalytics(), {
      analytics_storage: granted,
      ad_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted,
    });
    await setAnalyticsCollectionEnabled(getAnalytics(), granted);
  } catch (e) {
    devWarn('Failed to apply analytics consent:', e);
  }
  try {
    await setCrashlyticsCollectionEnabled(getCrashlytics(), granted);
  } catch (e) {
    devWarn('Failed to apply Crashlytics consent:', e);
  }
}
