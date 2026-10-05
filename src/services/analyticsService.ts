import { getAnalytics, logEvent as fbLogEvent } from '@react-native-firebase/analytics';

/**
 * Firebase Analytics Service
 * Specific Screen View Tracking (e.g. kuran, esmaulhusna, gunluk_icerik, pusula, settings, vakitler, zikirmatik)
 */

export const normalizeScreenName = (rawName: string): string => {
  if (!rawName) return 'unknown';
  let name = rawName.trim().toLowerCase().replace(/screen$/, '');
  
  const map: Record<string, string> = {
    quran: 'kuran',
    quranreading: 'kuran',
    daily: 'gunluk_icerik',
    dailycontent: 'gunluk_icerik',
    home: 'vakitler',
    times: 'vakitler',
    dhikr: 'zikirmatik',
    tasbih: 'zikirmatik',
    library: 'dualar',
    duas: 'dualar',
    names: 'esmaulhusna',
    esmaulhusna: 'esmaulhusna',
    qibla: 'pusula',
    settings: 'settings',
    ayarlar: 'settings',
    weather: 'hava_durumu',
    prayerhistory: 'namaz_gecmisi',
    kazatracker: 'kaza_takibi',
    hatimtracker: 'hatim_takibi',
    imsakiye: 'haftalik_imsakiye',
    religiousdays: 'dini_gunler',
    onboarding: 'onboarding',
  };

  return map[name] || name;
};

export const logScreenView = async (screenName: string, screenClass: string = screenName) => {
  try {
    const analytics = getAnalytics();
    const cleanName = normalizeScreenName(screenName);

    // Standard Firebase screen_view event
    await fbLogEvent(analytics, 'screen_view', {
      firebase_screen: cleanName,
      firebase_screen_class: screenClass,
      screen_name: cleanName,
      screen_class: screenClass,
    });

    console.log(`[Analytics] Screen view logged: ${cleanName}`);
  } catch (error) {
    console.warn('[Analytics] Failed to log screen view:', error);
  }
};

export const logOnboardingCompleted = async (step: number, city: string) => {
  try {
    const analytics = getAnalytics();
    await fbLogEvent(analytics, 'onboarding_completed', {
      completed_at_step: step,
      selected_city: city,
    });
  } catch {}
};

// Funnel events: onboarding_step_1 (location), onboarding_step_2 (notifications).
export const logOnboardingStep = async (step: number, params?: Record<string, any>) => {
  await safeLog(`onboarding_step_${step}`, params);
};

// Firebase caps string params at 100 chars.
const clip = (value: unknown) => String(value ?? '').slice(0, 100);

export const logAdRequest = async (placement: string, attempt: number) => {
  await safeLog('ad_request', { placement, attempt });
};

export const logAdLoaded = async (placement: string, attempt: number) => {
  await safeLog('ad_loaded', { placement, attempt });
};

export const logAdFailed = async (placement: string, attempt: number, error: { code?: string; message?: string }) => {
  await safeLog('ad_failed', {
    placement,
    attempt,
    error_code: clip(error?.code || 'unknown'),
    error_message: clip(error?.message),
  });
};

export const logFirstOpen = async () => {
  try {
    const analytics = getAnalytics();
    await fbLogEvent(analytics, 'first_open');
  } catch {}
};

// Generic helper: swallow errors so a failed analytics call never breaks a user-facing flow.
const safeLog = async (eventName: string, params?: Record<string, any>) => {
  try {
    const analytics = getAnalytics();
    await fbLogEvent(analytics, eventName, params);
  } catch (error) {
    console.warn(`[Analytics] Failed to log ${eventName}:`, error);
  }
};

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  if (!eventName) return;
  await safeLog(eventName, params);
};

export const logTabChange = async (tabName?: string, tabIndex?: number) => {
  if (!tabName) return;
  await logScreenView(tabName);
  if (typeof tabIndex === 'number') {
    await safeLog('tab_changed', { tab_name: normalizeScreenName(tabName), tab_index: tabIndex });
  }
};

export const logModalOpened = async (modalName?: string) => { if (modalName) await logScreenView(modalName); };

export const logCitySelected = async (city: string, isManual: boolean) => {
  await safeLog('city_selected', { city, is_manual: isManual });
};

export const logWidgetPinned = async () => {
  await safeLog('widget_pinned');
};

export const logSoundTested = async (soundName: string) => {
  await safeLog('sound_tested', { sound_name: soundName });
};

export const logNotificationToggled = async (prayerKey: string, enabled: boolean) => {
  await safeLog('notification_toggled', { prayer_key: prayerKey, enabled });
};

export const logOffsetChanged = async (prayerKey: string, offsetMinutes: number) => {
  await safeLog('prayer_offset_changed', { prayer_key: prayerKey, offset_minutes: offsetMinutes });
};

export const logQuranSurahRead = async (surahNumber: number, surahName: string) => {
  await safeLog('quran_surah_read', { surah_number: surahNumber, surah_name: surahName });
};

export const logDhikrCompleted = async (dhikrId: string, targetCount: number) => {
  await safeLog('dhikr_completed', { dhikr_id: dhikrId, target_count: targetCount });
};

export const logBatterySettingOpened = async () => {
  await safeLog('battery_setting_opened');
};

export const logHatimProgress = async (currentPage: number, currentJuz: number, percentComplete: number) => {
  await safeLog('hatim_progress', { current_page: currentPage, current_juz: currentJuz, percent_complete: percentComplete });
};

export const logPageMealViewed = async (pageNo: number) => {
  await safeLog('page_meal_viewed', { page_number: pageNo });
};

export const logPrayerLogged = async (prayerId: string, completed: boolean, streakCount: number) => {
  await safeLog('prayer_logged', { prayer_id: prayerId, completed, streak_count: streakCount });
};

export const logKazaUpdated = async (prayerKey: string, completedCount: number) => {
  await safeLog('kaza_updated', { prayer_key: prayerKey, completed_count: completedCount });
};

export const logQuranPrayerOpened = async (tabName: string) => {
  await safeLog('quran_prayer_opened', { tab: tabName });
};
