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

    // Custom screen view event for explicit dimension reporting in Firebase Console
    await fbLogEvent(analytics, 'screen_view_custom', {
      screen_name: cleanName,
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
  } catch (error) {}
};

export const logFirstOpen = async () => {
  try {
    const analytics = getAnalytics();
    await fbLogEvent(analytics, 'first_open');
  } catch (error) {}
};

// Flexible compatibility stubs to maintain zero error rate while suppressing bloat events
export const logEvent = async (..._args: any[]) => {};
export const logTabChange = async (tabName?: string, ..._args: any[]) => { if (tabName) await logScreenView(tabName); };
export const logCitySelected = async (..._args: any[]) => {};
export const logWidgetPinned = async (..._args: any[]) => {};
export const logSoundTested = async (..._args: any[]) => {};
export const logNotificationToggled = async (..._args: any[]) => {};
export const logOffsetChanged = async (..._args: any[]) => {};
export const logQuranSurahRead = async (..._args: any[]) => {};
export const logDhikrCompleted = async (..._args: any[]) => {};
export const logBatterySettingOpened = async (..._args: any[]) => {};
export const logHatimProgress = async (..._args: any[]) => {};
export const logPageMealViewed = async (..._args: any[]) => {};
export const logPrayerLogged = async (..._args: any[]) => {};
export const logModalOpened = async (modalName?: string, ..._args: any[]) => { if (modalName) await logScreenView(modalName); };
export const logKazaUpdated = async (..._args: any[]) => {};
export const logQuranPrayerOpened = async (..._args: any[]) => {};
