import { getAnalytics, logEvent as fbLogEvent, setUserProperty } from '@react-native-firebase/analytics';

// JS start of this process: the zero point for "time to first content".
const PROCESS_START_MS = Date.now();
const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };

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

    // Standard Firebase screen_view event. (`firebase_`-prefixed params are reserved.)
    await fbLogEvent(analytics, 'screen_view', {
      screen_name: cleanName,
      screen_class: screenClass,
    });

    devLog(`[Analytics] Screen view logged: ${cleanName}`);
  } catch (error) {
    console.warn('[Analytics] Failed to log screen view:', error);
  }
};

// The city name is not sent (location-level data nobody needs for the funnel): only whether one existed.
export const logOnboardingCompleted = async (step: number, city: string) => {
  await safeLog('onboarding_completed', {
    completed_at_step: step,
    has_city: city ? 1 : 0,
  });
};

export const logOnboardingSkipped = async (step: number) => {
  await safeLog('onboarding_skipped', { at_step: step });
};

// Why location did (not) work: the single most useful diagnostic for early uninstalls.
export type LocationResult = 'granted' | 'denied' | 'timeout' | 'geocode_failed' | 'error';
export const logLocationResult = async (result: LocationResult, source: 'onboarding' | 'startup') => {
  await safeLog('location_result', { result, source });
};

export const logNotificationPermissionResult = async (granted: boolean, source: 'onboarding' | 'settings' | 'banner') => {
  await safeLog('notification_permission_result', { granted: granted ? 1 : 0, source });
};

// Fires once per process, the first time real prayer times are on screen.
let firstContentLogged = false;
export const logFirstPrayerScreenShown = async (source: 'cache' | 'network' | 'estimate') => {
  if (firstContentLogged) return;
  firstContentLogged = true;
  await safeLog('first_prayer_screen_shown', {
    time_to_first_content_ms: Date.now() - PROCESS_START_MS,
    source,
  });
};

// Properties must be registered as custom definitions in the Firebase console to be reportable.
export const setAnalyticsUserProperties = async (props: Record<string, string | number | boolean | null | undefined>) => {
  try {
    const analytics = getAnalytics();
    for (const [name, value] of Object.entries(props)) {
      if (value === undefined) continue;
      await setUserProperty(analytics, name, value === null ? null : String(value));
    }
  } catch (error) {
    console.warn('[Analytics] Failed to set user properties:', error);
  }
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

// Firebase event params accept only strings and numbers: a boolean can be dropped on Android,
// which silently emptied the permission/toggle funnels. Booleans go out as 1/0.
const sanitizeParams = (params?: Record<string, any>): Record<string, string | number> | undefined => {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean') out[key] = value ? 1 : 0;
    else if (typeof value === 'number' || typeof value === 'string') out[key] = typeof value === 'string' ? value.slice(0, 100) : value;
    else out[key] = String(value).slice(0, 100);
  }
  return out;
};

// Generic helper: swallow errors so a failed analytics call never breaks a user-facing flow.
const safeLog = async (eventName: string, params?: Record<string, any>) => {
  try {
    const analytics = getAnalytics();
    await fbLogEvent(analytics, eventName, sanitizeParams(params));
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

// Community feed events (docs/sosyal-akis-plani-2026-10-21.md, Bölüm 8). No uid, post text or prayer detail.
export const logCommunityOpened = (source: 'tab' | 'banner' | 'notification' | 'share_success') =>
  logEvent('community_opened', { source });
export const logCommunityTabChanged = (tab: 'today' | 'week' | 'mine') => logEvent('community_tab_changed', { tab });
export const logCommunityFeedPage = (tab: 'today' | 'week' | 'mine', page: number, count: number) =>
  logEvent('community_feed_page', { tab, page, count });
export const logCommunitySharePromptShown = (templateKey: string) =>
  logEvent('community_share_prompt_shown', { template_key: templateKey });
export const logCommunitySharePromptAnswer = (templateKey: string, answer: 'accept' | 'decline' | 'later') =>
  logEvent('community_share_prompt_answer', { template_key: templateKey, answer });
export const logCommunityShareSubmitted = (templateKey: string, countryVisible: boolean) =>
  logEvent('community_share_submitted', { template_key: templateKey, country_visible: countryVisible });
export const logCommunityShareFailed = (templateKey: string, reason: string) =>
  logEvent('community_share_failed', { template_key: templateKey, reason });
export const logCommunityReaction = (emoji: string, action: 'add' | 'remove') =>
  logEvent('community_reaction', { emoji, action });
export const logCommunityPostReported = (templateKey: string) =>
  logEvent('community_post_reported', { template_key: templateKey });
export const logCommunityUserBlocked = () => logEvent('community_user_blocked');
export const logCommunityPostDeleted = (templateKey: string) =>
  logEvent('community_post_deleted', { template_key: templateKey });
export const logCommunitySettingChanged = (setting: 'country' | 'visibility' | 'participation', value: string | boolean) =>
  logEvent('community_setting_changed', { setting, value: String(value) });
