import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert, Pressable, Modal, DeviceEventEmitter, Platform, Share, Linking } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBackground } from '../../components/ProgressRing';
import { WidgetPromptModal } from '../../components/WidgetPromptModal';
import { FeedbackModal } from '../../components/FeedbackModal';
import { NotificationHealthCard } from '../../components/NotificationHealthCard';
import { BannerAdSlot } from '../../components/BannerAdSlot';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, typography } from '../../utils/theme';
import {
  NotificationPrefs,
  getNotificationPrefs,
  saveNotificationPrefs,
  requestNotificationPermissions,
  schedulePrayerNotifications,
  updatePersistentPrayerNotification,
  scheduleTestNotification,
  initNotifications,
  WARN_MINUTE_CHOICES,
  FRIDAY_MINUTE_CHOICES,
  getWarnMinutes,
  getExactSoundFor,
  withMinutes,
} from '../../services/notificationService';
import {
  PrayerOffsets,
  getPrayerOffsets,
  applyOffsetsToData,
  savePrayerOffsets,
  DEFAULT_OFFSETS,
} from '../../services/api';
import { audioManager } from '../../services/audioManager';
import { getAnnouncementsEnabled, setAnnouncementsEnabled } from '../../services/pushNotificationService';
import { openAdsPrivacyOptionsForm } from '../../services/adsConsentService';
import { changeAppLanguage } from '../../localization/i18n';
import { getOrCreateReferralCode, getReferralShareMessage } from '../../services/referralService';
import {
  logScreenView,
  logNotificationToggled,
  logOffsetChanged,
  logBatterySettingOpened,
  logNotificationPermissionResult,
} from '../../services/analyticsService';
import { AppStorage as AsyncStorage } from '../../services/storageService';
import { CitySearchModal } from '../../components/CitySearchModal';
import { AppStorage, SecureLocationStorage } from '../../services/storageService';
import { LOCATION_CHANGED_EVENT } from '../../hooks/useLocation';
import { directionalIconStyle } from '../../utils/rtl';
import { getRecommendedCalculationMethod, METHOD_ANGLES, METHOD_USER_SET_KEY, updateMethodForLocation } from '../../utils/calcMethod';
import { ASR_SCHOOL_KEY, getAsrSchool, getHijriOffset, setHijriOffset } from '../../services/api';
import { isHttpsUrl, PLAY_STORE_APP_URL, PLAY_STORE_URL, PRIVACY_POLICY_URL } from '../../config/links';

const SOUND_OPTIONS = [
  { id: 'azizallah', defaultName: 'Azizallah (Ezan Vakti)' },
  { id: 'adhan_25minutes', defaultName: 'Ezan (25 Dk Kala)' },
  { id: 'allahu_akbar', defaultName: 'Allahu Ekber' },
];

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const CALCULATION_METHODS = [
  { id: 13, nameKey: 'settings.methods.diyanet' },
  { id: 2, nameKey: 'settings.methods.isna' },
  { id: 3, nameKey: 'settings.methods.mwl' },
  { id: 4, nameKey: 'settings.methods.ummAlQura' },
  { id: 5, nameKey: 'settings.methods.egypt' },
  { id: 1, nameKey: 'settings.methods.karachi' },
  { id: 12, nameKey: 'settings.methods.france' },
  { id: 14, nameKey: 'settings.methods.russia' },
  { id: 20, nameKey: 'settings.methods.kemenag' },
  { id: 17, nameKey: 'settings.methods.jakim' },
  { id: 11, nameKey: 'settings.methods.muis' },
  { id: 7, nameKey: 'settings.methods.tehran' },
];

const getPrayerIcon = (id: string, color: string) => {
  const size = 16;
  switch (id) {
    case 'fajr': return <Feather name="moon" size={size} color={color} />;
    case 'sunrise': return <Feather name="sunrise" size={size} color={color} />;
    case 'dhuhr': return <Feather name="sun" size={size} color={color} />;
    case 'asr': return <Feather name="cloud" size={size} color={color} />;
    case 'maghrib': return <Feather name="sunset" size={size} color={color} />;
    case 'isha': return <Ionicons name="moon-outline" size={size} color={color} />;
    default: return <Feather name="clock" size={size} color={color} />;
  }
};

export default function SettingsScreen() {
  const isFocused = useIsFocused();
  const { t, i18n } = useTranslation();
  const tt = (key: string, tr: string, en: string) => t(key, { defaultValue: i18n.language.startsWith('tr') ? tr : en });
  const { theme, isDark, mode, setThemeMode, isFullscreen, setIsFullscreen, timeFormat, setTimeFormat } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<number>(13);
  const [methodModalVisible, setMethodModalVisible] = useState(false);

  // Current location as saved by Home: a chosen city ('manual') pins the location; a
  // GPS fix ('gps') keeps following the phone.
  const [locationInfo, setLocationInfo] = useState<{ city: string; source: 'manual' | 'gps' } | null>(null);
  const [citySearchVisible, setCitySearchVisible] = useState(false);
  const [asrSchool, setAsrSchool] = useState<0 | 1>(0);
  const [hijriShift, setHijriShift] = useState<number>(0);
  const recommendedMethod = getRecommendedCalculationMethod();

  // Persistent Notification & Widget State
  const [persistentNotifEnabled, setPersistentNotifEnabled] = useState<boolean>(true);
  const [widgetModalVisible, setWidgetModalVisible] = useState<boolean>(false);
  const [announcementsEnabled, setAnnouncementsEnabledState] = useState<boolean>(true);

  // Sound Selection & Volume State
  const [exactSound, setExactSound] = useState<string>('azizallah');
  const [warningSound, setWarningSound] = useState<string>('adhan_25minutes');
  const [volumeLevel, setVolumeLevel] = useState<number>(0.25);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  const [offsets, setOffsets] = useState<PrayerOffsets>(DEFAULT_OFFSETS);

  useEffect(() => {
    logScreenView('SettingsScreen');
    getNotificationPrefs().then((p) => {
      setPrefs(p);
      if (p.exactSound) setExactSound(p.exactSound);
      if (p.warningSound) setWarningSound(p.warningSound);
    });
    
    audioManager.getVolume().then((v) => {
      setVolumeLevel(v);
    });

    getPrayerOffsets().then((off) => {
      setOffsets(off);
    });

    AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED').then((saved) => {
      setPersistentNotifEnabled(saved !== null ? saved === 'true' : true);
    });

    getAnnouncementsEnabled().then(setAnnouncementsEnabledState);
    getAsrSchool().then(setAsrSchool);

    // Load current calculation method
    AsyncStorage.getItem('PRAYER_CALCULATION_METHOD').then((saved) => {
      if (saved) {
        setCurrentMethod(parseInt(saved, 10));
      }
    });

  }, []);

  const loadLocationInfo = async () => {
    try {
      const manual = await SecureLocationStorage.getItem('MANUAL_LOCATION');
      if (manual) {
        const parsed = JSON.parse(manual);
        if (parsed?.city) {
          setLocationInfo({ city: parsed.city, source: 'manual' });
          return;
        }
      }
      const gps = await SecureLocationStorage.getItem('LAST_GPS_LOCATION');
      if (gps) {
        const parsed = JSON.parse(gps);
        if (parsed?.city) {
          setLocationInfo({ city: parsed.city, source: 'gps' });
          return;
        }
      }
      setLocationInfo(null);
    } catch {
      setLocationInfo(null);
    }
  };

  useEffect(() => {
    if (isFocused) loadLocationInfo();
  }, [isFocused]);

  const handleCityPicked = async (lat: number, lng: number, city: string) => {
    setCitySearchVisible(false);
    await SecureLocationStorage.setItem('MANUAL_LOCATION', JSON.stringify({ latitude: lat, longitude: lng, city }));
    setLocationInfo({ city, source: 'manual' });
    await updateMethodForLocation(lat, lng);
    DeviceEventEmitter.emit(LOCATION_CHANGED_EVENT, {});
  };

  const handleUseMyLocation = async () => {
    await SecureLocationStorage.removeItem('MANUAL_LOCATION');
    await AppStorage.setItem('LAST_GPS_UPDATE_TIME', '0');
    DeviceEventEmitter.emit(LOCATION_CHANGED_EVENT, { force: true });
    // Home resolves the fix asynchronously (permission prompt, GPS); show it when ready.
    setTimeout(loadLocationInfo, 5000);
    loadLocationInfo();
  };

  const handleOffsetChange = async (key: keyof PrayerOffsets, delta: number) => {
    const currentVal = offsets[key] || 0;
    const newVal = Math.max(-15, Math.min(15, currentVal + delta));
    const updated = { ...offsets, [key]: newVal };
    setOffsets(updated);
    await savePrayerOffsets(updated);
    logOffsetChanged(key, newVal);
    DeviceEventEmitter.emit('PRAYER_OFFSETS_CHANGED');
    if (prefs) {
      await rescheduleFromCache(prefs);
    }
  };

  const togglePersistentNotif = async (value: boolean) => {
    setPersistentNotifEnabled(value);
    await AsyncStorage.setItem('PERSISTENT_NOTIF_ENABLED', value ? 'true' : 'false');
    if (!value) {
      updatePersistentPrayerNotification('', '', '', 0, false);
    }
    // The silent per-prayer refresh triggers exist only for the persistent notification:
    // drop them when it is off, create them when it is on.
    if (prefs) rescheduleFromCache(prefs);
  };

  const toggleReminder = async (key: 'dailyContent' | 'quranReminder' | 'greetingReminders', value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveNotificationPrefs(updated);
    await rescheduleFromCache(updated);
  };

  const toggleAnnouncements = async (value: boolean) => {
    setAnnouncementsEnabledState(value);
    await setAnnouncementsEnabled(value);
  };

  const rescheduleFromCache = async (currentPrefs: NotificationPrefs) => {
    const cachedString = await AsyncStorage.getItem('PRAYER_TIMES_CACHE');
    if (cachedString) {
      try {
        const cached = JSON.parse(cachedString);
        // The cache holds raw API times; alarms must use the user's ± minute offsets.
        const withOffsets = applyOffsetsToData(cached.data, await getPrayerOffsets());
        await schedulePrayerNotifications(withOffsets, currentPrefs, t);
      } catch {}
    }
  };

  const handleSelectExactSound = async (soundId: string) => {
    setExactSound(soundId);
    if (prefs) {
      const updated = { ...prefs, exactSound: soundId };
      setPrefs(updated);
      await saveNotificationPrefs(updated);
      await initNotifications(soundId, warningSound);
      await rescheduleFromCache(updated);
    }
  };

  const handleSelectWarningSound = async (soundId: string) => {
    setWarningSound(soundId);
    if (prefs) {
      const updated = { ...prefs, warningSound: soundId };
      setPrefs(updated);
      await saveNotificationPrefs(updated);
      await initNotifications(exactSound, soundId);
      await rescheduleFromCache(updated);
    }
  };

  const warnMinutes = prefs ? getWarnMinutes(prefs) : 25;

  const applyPrefs = async (updated: NotificationPrefs) => {
    setPrefs(updated);
    await saveNotificationPrefs(updated);
    await initNotifications(updated.exactSound, updated.warningSound);
    await rescheduleFromCache(updated);
  };

  const handleSelectWarnMinutes = (minutes: number) => {
    if (prefs && minutes !== warnMinutes) applyPrefs({ ...prefs, warnMinutes: minutes });
  };

  // Tap cycles: global sound -> each sound -> back to global.
  const cyclePrayerSound = (prayerId: (typeof PRAYER_KEYS)[number]) => {
    if (!prefs) return;
    const order = [undefined, ...SOUND_OPTIONS.map((o) => o.id)];
    const current = prefs.sounds?.[prayerId];
    const next = order[(order.indexOf(current) + 1) % order.length];
    const sounds = { ...(prefs.sounds ?? {}) };
    if (next) sounds[prayerId] = next;
    else delete sounds[prayerId];
    applyPrefs({ ...prefs, sounds });
  };

  const handleFridayReminder = async (value: boolean) => {
    if (!prefs) return;
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Linking.openSettings().catch(() => {});
        return;
      }
    }
    applyPrefs({ ...prefs, fridayReminder: value });
  };

  const handleFridayMinutes = (minutes: number) => {
    if (prefs) applyPrefs({ ...prefs, fridayReminderMinutes: minutes });
  };

  const handleVolumeChange = async (vol: number) => {
    setVolumeLevel(vol);
    await audioManager.setVolume(vol);
  };

  const toggleRespectSilentMode = async (val: boolean) => {
    if (prefs) {
      const updated = { ...prefs, respectSilentMode: val };
      setPrefs(updated);
      await saveNotificationPrefs(updated);
      await initNotifications(exactSound, warningSound);
      await rescheduleFromCache(updated);
    }
  };

  useEffect(() => {
    return () => {
      audioManager.stopAdhan();
    };
  }, []);

  const handleTogglePreview = async (soundId: string) => {
    if (playingSound === soundId) {
      await audioManager.stopAdhan();
      setPlayingSound(null);
    } else {
      setPlayingSound(soundId);
      await audioManager.playAdhan(soundId, () => {
        // Only clear if this preview is still the one shown: a quicker second tap has
        // already switched the indicator to another sound.
        setPlayingSound((current) => (current === soundId ? null : current));
      });
    }
  };

  const toggleLanguage = async (newLang: string) => {
    await AsyncStorage.setItem('APP_LANG', newLang);
    const needsRestart = await changeAppLanguage(newLang);
    setLangModalVisible(false);
    if (needsRestart) {
      // Layout direction (right-to-left languages) is read at app start.
      Alert.alert(
        t('settings.language'),
        t('settings.restartForDirection', 'Close and reopen the app to apply the new text direction.'),
        [{ text: t('common.ok', 'OK') }]
      );
    }
    if (prefs) setTimeout(() => rescheduleFromCache(prefs), 100);
  };

  const handleInviteFriend = async () => {
    try {
      const code = await getOrCreateReferralCode();
      const message = getReferralShareMessage(code, t);
      await Share.share({ message });
    } catch {}
  };

  const selectMethod = async (methodId: number) => {
    setCurrentMethod(methodId);
    await AsyncStorage.setItem('PRAYER_CALCULATION_METHOD', String(methodId));
    // A deliberate choice: moving to another country must not silently replace it.
    await AppStorage.setItem(METHOD_USER_SET_KEY, 'true');
    // Clear prayer cache so it refetches next time Home tab is focused
    await AsyncStorage.removeItem('PRAYER_TIMES_CACHE');
    setMethodModalVisible(false);
    // Home reloads the times and reschedules the alarms now, not on its next focus.
    DeviceEventEmitter.emit('PRAYER_OFFSETS_CHANGED');
  };

  const handleRateApp = async () => {
    try {
      await Linking.openURL(PLAY_STORE_APP_URL);
    } catch {
      Linking.openURL(PLAY_STORE_URL).catch(() => {});
    }
  };

  useEffect(() => {
    getHijriOffset().then(setHijriShift);
  }, []);

  const changeHijriShift = async (delta: number) => {
    const next = await setHijriOffset(hijriShift + delta);
    if (next === hijriShift) return;
    setHijriShift(next);
    // Home reloads from the raw cache; religious days and Ramadan read the offset when opened.
    DeviceEventEmitter.emit('PRAYER_OFFSETS_CHANGED');
  };

  const selectAsrSchool = async (school: 0 | 1) => {
    setAsrSchool(school);
    await AppStorage.setItem(ASR_SCHOOL_KEY, String(school));
    await AsyncStorage.removeItem('PRAYER_TIMES_CACHE');
    DeviceEventEmitter.emit('PRAYER_OFFSETS_CHANGED');
  };

  const LANGUAGES = [
    { id: 'en', label: 'English' },
    { id: 'tr', label: 'Türkçe' },
    { id: 'zh', label: '简体中文' },
    { id: 'it', label: 'Italiano' },
    { id: 'de', label: 'Deutsch' },
    { id: 'nl', label: 'Nederlands' },
    { id: 'ar', label: 'العربية' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'id', label: 'Bahasa Indonesia' },
    { id: 'ur', label: 'اردو' },
    { id: 'fa', label: 'فارسی' },
    { id: 'ru', label: 'Русский' },
    { id: 'uz', label: 'Oʻzbekcha' },
    { id: 'bn', label: 'বাংলা' },
    { id: 'ms', label: 'Bahasa Melayu' },
    { id: 'hi', label: 'हिन्दी' },
    { id: 'sq', label: 'Shqip' },
    { id: 'ha', label: 'Hausa' },
    { id: 'sw', label: 'Kiswahili' },
    { id: 'cs', label: 'Čeština' },
    { id: 'da', label: 'Dansk' },
    { id: 'fi', label: 'Suomi' },
    { id: 'hu', label: 'Magyar' },
    { id: 'ja', label: '日本語' },
    { id: 'ko', label: '한국어' },
    { id: 'no', label: 'Norsk' },
    { id: 'pl', label: 'Polski' },
    { id: 'pt', label: 'Português' },
    { id: 'ro', label: 'Română' },
    { id: 'sk', label: 'Slovenčina' },
    { id: 'sv', label: 'Svenska' },
    { id: 'th', label: 'ไทย' },
    { id: 'uk', label: 'Українська' },
    { id: 'vi', label: 'Tiếng Việt' },
  ];

  const toggleTheme = (mode: 'light' | 'dark') => setThemeMode(mode as any);

  const toggleNotification = async (key: keyof NotificationPrefs, val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      logNotificationPermissionResult(granted, 'settings');
      if (!granted) {
        // Once denied, Android will not show the dialog again: send the user to system settings.
        Alert.alert(
          t('onboarding.notificationsTitle', 'Ezan Vakti Bildirimleri'),
          t('onboarding.notifDenied', 'Bildirim izni verilmedi. Ezan uyarıları çalışmayabilir — daha sonra Ayarlar\'dan açabilirsiniz.'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            { text: t('qibla.openSettings', 'Open Settings'), onPress: () => Linking.openSettings().catch(() => {}) },
          ]
        );
        return;
      }
    }
    if (prefs) {
      const newPrefs = { ...prefs, [key]: val };
      setPrefs(newPrefs);
      await saveNotificationPrefs(newPrefs);
      await rescheduleFromCache(newPrefs);
      logNotificationToggled(key, val);
    }
  };

  const themeOptions: { label: string; value: 'light' | 'dark'; icon: any }[] = [
    { label: t('settings.light'), value: 'light', icon: 'sun' },
    { label: t('settings.dark'),  value: 'dark',  icon: 'moon' },
  ];

  const handleTestNotification = async (type: 'exact' | 'warning') => {
    Alert.alert(
      t('settings.testNotifTitle', 'Test Bildirimi'),
      t('settings.testNotifBody', 'Test bildirimi 10 saniye içinde çalacak. Lütfen telefonunuzun ses tuşlarını kullanarak bildirim ses seviyesini kontrol edin veya ayarlayın.'),
      [
        {
          text: t('common.ok', 'Tamam'),
          onPress: () => scheduleTestNotification(type, t),
        }
      ]
    );
  };

  return (
    <AppBackground isDark={isDark}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.text} style={directionalIconStyle} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.title')}</Text>
        </Animated.View>

        {/* ── Location ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.locationTitle', 'Location')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 14 }]}>
            <Pressable
              onPress={() => setCitySearchVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.changeCity', 'Change city')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1, marginEnd: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Feather name="map-pin" size={16} color={theme.colors.primary} />
                  <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text, flexShrink: 1 }} numberOfLines={1}>
                    {locationInfo?.city || t('settings.locationNotSet', 'Not selected yet')}
                  </Text>
                </View>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                  {locationInfo?.source === 'gps'
                    ? t('settings.locationFromGps', 'Following your phone location')
                    : locationInfo?.source === 'manual'
                      ? t('settings.locationFromManual', 'City chosen manually')
                      : t('settings.locationHint', 'Choose a city or use your phone location.')}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} style={directionalIconStyle} />
            </Pressable>
            {locationInfo?.source !== 'gps' && (
              <Pressable
                onPress={handleUseMyLocation}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, minHeight: 44 }}
              >
                <Feather name="navigation" size={16} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.primaryText }}>
                  {t('settings.useMyLocation', 'Use my current location')}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.theme')}
          </Text>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const active = mode === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => toggleTheme(opt.value)} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={active
                      ? theme.colors.heroGradient as [string, string]
                      : [theme.colors.surface, theme.colors.surface]}
                    style={[
                      styles.themeChip,
                      { borderColor: active ? theme.colors.borderStrong : theme.colors.border },
                    ]}
                  >
                    <Feather
                      name={opt.icon}
                      size={18}
                      color={active ? '#FFF' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.themeChipLabel, { color: active ? '#FFF' : theme.colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                      {opt.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Language ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.language')}
          </Text>
          <Pressable onPress={() => setLangModalVisible(true)} accessibilityRole="button" accessibilityLabel={`${t('settings.language')}: ${LANGUAGES.find(l => l.id === i18n.language)?.label || ''}`}>
            <LinearGradient
              colors={[theme.colors.surface, theme.colors.surface]}
              style={[styles.langChip, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.langLabel, { color: theme.colors.text, flex: 1, marginEnd: 8 }]} numberOfLines={1}>
                {LANGUAGES.find(l => l.id === i18n.language)?.label || LANGUAGES[0].label}
              </Text>
              <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── Calculation Method ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(260).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.calcMethod')}
          </Text>
          <Pressable onPress={() => setMethodModalVisible(true)} accessibilityRole="button" accessibilityLabel={`${t('settings.calcMethod')}: ${t(CALCULATION_METHODS.find(m => m.id === currentMethod)?.nameKey || '')}`}>
            <LinearGradient
              colors={[theme.colors.surface, theme.colors.surface]}
              style={[styles.langChip, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.langLabel, { color: theme.colors.text, flex: 1, marginEnd: 8 }]} numberOfLines={1}>
                {t(CALCULATION_METHODS.find(m => m.id === currentMethod)?.nameKey || '')}
              </Text>
              <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── Asr calculation (school) ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(270).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.asrSchoolTitle', 'Asr Calculation')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 14 }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([0, 1] as const).map((school) => {
                const active = asrSchool === school;
                return (
                  <Pressable
                    key={school}
                    onPress={() => selectAsrSchool(school)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: borderRadius.sm,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: active ? '#1A1207' : theme.colors.text, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {school === 0
                        ? t('settings.asrStandard', 'Standard (Shafi, Maliki, Hanbali)')
                        : t('settings.asrHanafi', 'Hanafi')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 10, lineHeight: 15 }}>
              {t('settings.asrSchoolDesc', 'Hanafi puts Asr later (shadow twice the object). It is the usual choice in South Asia.')}
            </Text>
          </View>
        </Animated.View>

        {/* ── Hijri date adjustment ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(275).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.hijriTitle', { defaultValue: i18n.language.startsWith('tr') ? 'Hicri Takvim Düzeltmesi' : 'Hijri Date Adjustment' })}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => changeHijriShift(-1)}
                disabled={hijriShift <= -2}
                accessibilityRole="button"
                accessibilityLabel="-1"
                style={{ width: 44, height: 44, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, opacity: hijriShift <= -2 ? 0.4 : 1 }}
              >
                <Feather name="minus" size={18} color={theme.colors.text} />
              </Pressable>
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: theme.colors.text }}>
                {hijriShift === 0
                  ? t('settings.hijriNone', { defaultValue: i18n.language.startsWith('tr') ? 'Düzeltme yok' : 'No adjustment' })
                  : t('settings.hijriDays', { defaultValue: i18n.language.startsWith('tr') ? '{{n}} gün' : '{{n}} day(s)', n: (hijriShift > 0 ? '+' : '') + hijriShift })}
              </Text>
              <Pressable
                onPress={() => changeHijriShift(1)}
                disabled={hijriShift >= 2}
                accessibilityRole="button"
                accessibilityLabel="+1"
                style={{ width: 44, height: 44, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, opacity: hijriShift >= 2 ? 0.4 : 1 }}
              >
                <Feather name="plus" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 10, lineHeight: 15 }}>
              {t('settings.hijriDesc', { defaultValue: i18n.language.startsWith('tr') ? 'Bulunduğunuz yerde Hicri tarih bir gün farklı ilan ediliyorsa ayarlayın. Ana ekran tarihini, dini günleri ve Ramazan imsakiyesini birlikte kaydırır.' : 'If your region announces the Hijri date a day apart, adjust it here. It moves the home date, religious days and the Ramadan calendar together.' })}
            </Text>
          </View>
        </Animated.View>

        {/* ── General Settings (Fullscreen) ── */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.general', 'General Settings')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginEnd: 12 }}>
              <Feather name="maximize-2" size={18} color={isFullscreen ? theme.colors.primary : theme.colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.fullscreen', 'Fullscreen Mode')}
                </Text>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                  {t('settings.fullscreenDesc', 'Hides the status bar (clock, battery) and the navigation bar.')}
                </Text>
              </View>
            </View>
            <Switch
              accessibilityLabel={t('settings.fullscreen', 'Fullscreen Mode')}
              value={isFullscreen}
              onValueChange={(val) => setIsFullscreen(val)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Feather name="clock" size={18} color={timeFormat === '24h' ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.text }}>
                {t('settings.timeFormat24h', '24 Saat Biçimi')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('settings.timeFormat24h', '24 Saat Biçimi')}
              value={timeFormat === '24h'}
              onValueChange={(val) => setTimeFormat(val ? '24h' : '12h')}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </Animated.View>

        {/* ── Persistent Notification & Lock Screen ── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.persistentNotifTitle', 'Lock Screen & Status Bar')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }]}>
            <View style={{ flex: 1, marginEnd: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Feather name="lock" size={16} color={persistentNotifEnabled ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.persistentNotif', 'Persistent Prayer Countdown')}
                </Text>
              </View>
              <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                {t('settings.persistentNotifDesc', 'Track the time left for the next prayer live on your lock screen and notification panel.')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('settings.persistentNotif', 'Persistent Prayer Countdown')}
              value={persistentNotifEnabled}
              onValueChange={togglePersistentNotif}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </Animated.View>

        {/* ── Reminders & announcements (each can be switched off) ── */}
        <Animated.View entering={FadeInDown.delay(305).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.remindersTitle', 'Reminders & Announcements')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, paddingVertical: 6, paddingHorizontal: 16 }]}>
            {[
              {
                key: 'dailyContent',
                icon: 'book-open' as const,
                title: t('settings.dailyContentNotif', 'Daily Verse / Hadith'),
                desc: t('settings.dailyContentNotifDesc', 'A short daily reminder after the noon prayer.'),
                value: prefs?.dailyContent !== false,
                onChange: (v: boolean) => toggleReminder('dailyContent', v),
              },
              {
                key: 'quranReminder',
                icon: 'book' as const,
                title: t('settings.quranReminderNotif', 'Quran Reading Reminder'),
                desc: t('settings.quranReminderNotifDesc', 'An evening reminder every other day.'),
                value: prefs?.quranReminder !== false,
                onChange: (v: boolean) => toggleReminder('quranReminder', v),
              },
              {
                key: 'greetingReminders',
                icon: 'gift' as const,
                title: t('settings.greetingNotif', 'Friday & Holy Day Greetings'),
                desc: t('settings.greetingNotifDesc', 'Reminders on Fridays and religious days.'),
                value: prefs?.greetingReminders !== false,
                onChange: (v: boolean) => toggleReminder('greetingReminders', v),
              },
              {
                key: 'announcements',
                icon: 'radio' as const,
                title: t('settings.announcementsNotif', 'Announcements'),
                desc: t('settings.announcementsNotifDesc', 'News and campaign messages from Vera.'),
                value: announcementsEnabled,
                onChange: toggleAnnouncements,
              },
            ].map((row, index) => (
              <View
                key={row.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                }}
              >
                <View style={{ flex: 1, marginEnd: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Feather name={row.icon} size={16} color={row.value ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                      {row.title}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                    {row.desc}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={row.title}
                  value={row.value}
                  onValueChange={row.onChange}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Home Screen App Widget Setting ── */}
        <Animated.View entering={FadeInDown.delay(310).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.widgetTitle', 'Home Screen Widget')}
          </Text>
          <Pressable
            onPress={() => setWidgetModalVisible(true)}
            style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }]}
          >
            <View style={{ flex: 1, marginEnd: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Feather name="grid" size={16} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.addWidget', 'Add Widget to Home Screen')}
                </Text>
              </View>
              <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                {t('settings.addWidgetDesc', 'See prayer times and live countdown directly on your phone\'s home screen.')}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} style={directionalIconStyle} />
          </Pressable>
        </Animated.View>

        {/* ── Notification Sounds & Volume ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(330).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.soundSettings', 'Adhan Sounds & Volume')}
          </Text>

          {/* Sound Volume Level */}
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, marginBottom: 12, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="volume-2" size={18} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.volumeLevelTitle', 'Adhan Volume Level')}
                </Text>
              </View>
              <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: 13, color: theme.colors.primaryText }}>
                {Math.round(volumeLevel * 100)}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0.25, 0.50, 0.75, 1.00].map((vol) => {
                const active = Math.abs(volumeLevel - vol) < 0.05;
                return (
                  <Pressable
                    key={vol}
                    onPress={() => handleVolumeChange(vol)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: borderRadius.sm,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 12, color: active ? '#FFF' : theme.colors.text }}>
                      {Math.round(vol * 100)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Mosque / Silent Mode Respect Toggle */}
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 }]}>
            <View style={{ flex: 1, marginEnd: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Feather name="bell-off" size={16} color={prefs?.respectSilentMode !== false ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.respectSilentModeTitle', 'Cami / Sessiz Mod Uyumu')}
                </Text>
              </View>
              <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 15 }}>
                {t('settings.respectSilentModeDesc', 'Telefonunuz sessizde veya titreşimdeyken ezan sesini kapatır, sessizce uyarır.')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('settings.respectSilentModeTitle', 'Cami / Sessiz Mod Uyumu')}
              value={prefs?.respectSilentMode !== false}
              onValueChange={toggleRespectSilentMode}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Native Ad Banner right under Cami / Sessiz Mod Uyumu */}
          <BannerAdSlot placement="settings_top" isVisible={isFocused} lazy={true} />

          {/* Exact Prayer Sound Selection */}
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, marginBottom: 12, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Feather name="music" size={16} color={theme.colors.primary} />
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                {t('settings.exactSoundTitle', 'Prayer Time Sound')}
              </Text>
            </View>
            {SOUND_OPTIONS.map((opt) => {
              const active = exactSound === opt.id;
              const isPlaying = playingSound === opt.id;
              return (
                <View key={opt.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                  <Pressable
                    onPress={() => handleSelectExactSound(opt.id)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 13, color: active ? theme.colors.text : theme.colors.textSecondary }}>
                      {t(`settings.soundNames.${opt.id}`, opt.defaultName)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleTogglePreview(opt.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: borderRadius.sm,
                      backgroundColor: isPlaying ? theme.colors.primary : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isPlaying ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Feather name={isPlaying ? 'square' : 'play'} size={12} color={isPlaying ? '#FFF' : theme.colors.primary} />
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 11, color: isPlaying ? '#FFF' : theme.colors.primary }}>
                      {isPlaying ? t('settings.stopPreview', 'Stop') : t('settings.previewSound', 'Listen')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* 25 Min Warning Sound Selection */}
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, marginBottom: 12, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Feather name="bell" size={16} color={theme.colors.primary} />
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                {withMinutes(t('settings.warningSoundTitle', '25 Min Warning Sound'), warnMinutes)}
              </Text>
            </View>
            {SOUND_OPTIONS.map((opt) => {
              const active = warningSound === opt.id;
              const isPlaying = playingSound === opt.id;
              return (
                <View key={opt.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                  <Pressable
                    onPress={() => handleSelectWarningSound(opt.id)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 13, color: active ? theme.colors.text : theme.colors.textSecondary }}>
                      {t(`settings.soundNames.${opt.id}`, opt.defaultName)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleTogglePreview(opt.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: borderRadius.sm,
                      backgroundColor: isPlaying ? theme.colors.primary : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isPlaying ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Feather name={isPlaying ? 'square' : 'play'} size={12} color={isPlaying ? '#FFF' : theme.colors.primary} />
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 11, color: isPlaying ? '#FFF' : theme.colors.primary }}>
                      {isPlaying ? t('settings.stopPreview', 'Stop') : t('settings.previewSound', 'Listen')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Prayer Time Offsets (Vakit Düzeltme / ± Dakika) ── */}
        <Animated.View entering={FadeInDown.delay(340).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.offsetsTitle', 'Vakit Düzeltme (Ofset / ± Dk)')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 14 }]}>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 17 }}>
              {t('settings.offsetsDesc', 'Yerel caminiz veya takviminizle dakikalık fark varsa vakitleri ±15 dakikaya kadar ayarlayabilirsiniz.')}
            </Text>
            {PRAYER_KEYS.map((key, idx) => {
              const isLast = idx === PRAYER_KEYS.length - 1;
              const val = offsets[key as keyof PrayerOffsets] || 0;
              const formattedVal = val > 0 ? `+${val} ${t('common.min', 'dk')}` : val < 0 ? `${val} ${t('common.min', 'dk')}` : `0 ${t('common.min', 'dk')}`;
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 9,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {getPrayerIcon(key, theme.colors.primary)}
                    <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.text }}>
                      {t(`home.prayers.${key}`)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                      onPress={() => handleOffsetChange(key as keyof PrayerOffsets, -1)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="minus" size={16} color={theme.colors.text} />
                    </Pressable>

                    <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, minWidth: 48, textAlign: 'center', color: val !== 0 ? theme.colors.primary : theme.colors.textSecondary }}>
                      {formattedVal}
                    </Text>

                    <Pressable
                      onPress={() => handleOffsetChange(key as keyof PrayerOffsets, 1)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="plus" size={16} color={theme.colors.text} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        {prefs && (
          <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.notifSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('settings.notifications', 'Bildirimler')}
            </Text>

            <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, overflow: 'hidden' }]}>
              {PRAYER_KEYS.map((key, index) => {
                const isExactOn = prefs[key];
                const isWarnOn = prefs[`${key}_warn` as keyof NotificationPrefs];
                const isLast = index === PRAYER_KEYS.length - 1;
                return (
                  <View
                    key={key}
                    style={[styles.compactNotifRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}
                  >
                    <View style={styles.compactNotifLeft}>
                      {getPrayerIcon(key, theme.colors.primary)}
                      <Text style={[styles.compactNotifName, { color: theme.colors.text }]}>
                        {t(`home.prayers.${key}`)}
                      </Text>
                    </View>
                    <View style={styles.compactNotifRight}>
                      <Pressable
                        style={[styles.compactNotifBtn, isWarnOn ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                        onPress={() => toggleNotification(`${key}_warn` as keyof NotificationPrefs, !isWarnOn)}
                      >
                        <Feather name="clock" size={13} color={isWarnOn ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.compactNotifBtnText, { color: isWarnOn ? '#FFF' : theme.colors.textSecondary }]}>{withMinutes(t('settings.warnNotifBtn', '-25dk'), warnMinutes)}</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.compactNotifBtn, isExactOn ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                        onPress={() => toggleNotification(key, !isExactOn)}
                      >
                        <Feather name="bell" size={13} color={isExactOn ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.compactNotifBtnText, { color: isExactOn ? '#FFF' : theme.colors.textSecondary }]}>{t('settings.exactNotifBtn', 'Ezan')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Early-warning lead time, per-prayer sounds and the Friday reminder */}
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 14, marginTop: 12 }]}>
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.text, marginBottom: 8 }}>
                {tt('settings.warnLeadTitle', 'Erken uyarı süresi', 'Early warning lead time')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WARN_MINUTE_CHOICES.map((m) => {
                  const active = warnMinutes === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => handleSelectWarnMinutes(m)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={{ flex: 1, minHeight: 40, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border }}
                    >
                      <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: active ? '#1A1207' : theme.colors.text }}>{m}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.text, marginTop: 16, marginBottom: 2 }}>
                {tt('settings.perPrayerSoundTitle', 'Vakit başına ezan sesi', 'Adhan sound per prayer')}
              </Text>
              <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginBottom: 6 }}>
                {tt('settings.perPrayerSoundHint', 'Dokunarak değiştirin. Varsayılan, yukarıda seçtiğiniz sestir.', 'Tap to change. Default is the sound chosen above.')}
              </Text>
              {PRAYER_KEYS.map((key) => {
                const own = prefs?.sounds?.[key];
                const effective = prefs ? getExactSoundFor(prefs, key) : exactSound;
                const label = t(`settings.soundNames.${effective}`, { defaultValue: SOUND_OPTIONS.find((o) => o.id === effective)?.defaultName ?? effective });
                return (
                  <Pressable
                    key={key}
                    onPress={() => cyclePrayerSound(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`home.prayers.${key}`)}: ${label}`}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 6 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {getPrayerIcon(key, theme.colors.primary)}
                      <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 13, color: theme.colors.text }}>{t(`home.prayers.${key}`)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.regular, fontSize: 12, color: own ? theme.colors.primaryText : theme.colors.textSecondary, flexShrink: 1 }}>
                        {label}
                      </Text>
                      <Feather name="repeat" size={13} color={theme.colors.textSecondary} />
                    </View>
                  </Pressable>
                );
              })}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.text }}>
                    {tt('settings.fridayTitle', 'Cuma namazı hatırlatması', "Jumu'ah reminder")}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                    {tt('settings.fridayDesc', 'Cuma günleri öğle vaktinden önce hatırlatır.', 'Reminds you before Dhuhr on Fridays.')}
                  </Text>
                </View>
                <Switch
                  value={prefs?.fridayReminder === true}
                  onValueChange={handleFridayReminder}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  accessibilityLabel={tt('settings.fridayTitle', 'Cuma namazı hatırlatması', "Jumu'ah reminder")}
                />
              </View>
              {prefs?.fridayReminder === true && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {FRIDAY_MINUTE_CHOICES.map((m) => {
                    const active = (prefs.fridayReminderMinutes ?? 45) === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => handleFridayMinutes(m)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={{ flex: 1, minHeight: 40, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border }}
                      >
                        <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: active ? '#1A1207' : theme.colors.text }}>
                          {t('settings.minutesShort', { defaultValue: i18n.language.startsWith('tr') ? '{{n}} dk' : '{{n}} min', n: m })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.testButtonsContainer}>
              <Pressable style={[styles.testBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]} onPress={() => handleTestNotification('warning')}>
                <Feather name="clock" size={15} color={theme.colors.primary} />
                <Text style={[styles.testBtnText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {withMinutes(t('settings.testWarnNotif'), warnMinutes)}
                </Text>
              </Pressable>
              <Pressable style={[styles.testBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]} onPress={() => handleTestNotification('exact')}>
                <Feather name="bell" size={15} color={theme.colors.primary} />
                <Text style={[styles.testBtnText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t('settings.testExactNotif')}
                </Text>
              </Pressable>
            </View>

            {/* Health of everything adhan alerts depend on, with one-tap fixes */}
            <NotificationHealthCard />
          </Animated.View>
        )}

        {/* ── App Version & Update Check ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(420).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('update.sectionTitle', 'Uygulama Sürümü')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="info" size={18} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.text }}>
                  {t('update.versionLabel', 'Sürüm')}: v{Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0'}
                </Text>
              </View>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: theme.colors.primary + '15',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
                onPress={() => DeviceEventEmitter.emit('CHECK_FOR_UPDATE', { manual: true })}
              >
                <Feather name="refresh-cw" size={14} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.primaryText }}>
                  {t('update.checkUpdate', 'Güncellemeleri Kontrol Et')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── Invite a Friend ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(410).duration(500)}>
          <Pressable
            style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={handleInviteFriend}
          >
            <Feather name="user-plus" size={16} color={theme.colors.primary} />
            <Text style={[styles.editorBtnText, { color: theme.colors.text }]}>
              {t('settings.inviteFriend', 'Arkadaşını Davet Et')}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Zakat, Hajj & Umrah and Achievements live on the Home screen ("More"); they used to be
            duplicated here. */}

        {/* ── Rate the app (Android) ───────────────────────────────────── */}
        {Platform.OS === 'android' && (
          <Animated.View entering={FadeInDown.delay(420).duration(500)}>
            <Pressable
              style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
              onPress={handleRateApp}
              accessibilityRole="link"
            >
              <Feather name="star" size={16} color={theme.colors.primary} />
              <Text style={[styles.editorBtnText, { color: theme.colors.text }]}>
                {t('settings.rateApp', 'Rate Vera')}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Feedback ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(425).duration(500)}>
          <Pressable
            style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={() => setFeedbackVisible(true)}
            accessibilityRole="button"
          >
            <Feather name="message-circle" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.editorBtnText, { color: theme.colors.textSecondary }]}>
              {t('feedback.settingsRow', 'Geri Bildirim Gönder')}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── Privacy / Ad Consent ─────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(430).duration(500)}>
          <Pressable
            style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={() => openAdsPrivacyOptionsForm()}
          >
            <Feather name="shield" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.editorBtnText, { color: theme.colors.textSecondary }]}>
              {t('settings.privacyOptions', 'Gizlilik Tercihleri')}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── Privacy policy (shown once PRIVACY_POLICY_URL is set) ────── */}
        {isHttpsUrl(PRIVACY_POLICY_URL) && (
          <Animated.View entering={FadeInDown.delay(432).duration(500)}>
            <Pressable
              style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
              accessibilityRole="link"
            >
              <Feather name="file-text" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.editorBtnText, { color: theme.colors.textSecondary }]}>
                {t('settings.privacyPolicy', 'Privacy Policy')}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(440).duration(500)}
          style={[styles.aboutCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <View>
            <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
            </Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.language')}</Text>
              <Pressable onPress={() => setLangModalVisible(false)} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]} accessibilityRole="button" accessibilityLabel={t('common.close', 'Close')}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {LANGUAGES.map((lang) => {
                const active = i18n.language === lang.id;
                return (
                  <Pressable
                    key={lang.id}
                    style={[styles.modalLangRow, { borderBottomColor: theme.colors.border }]}
                    onPress={() => toggleLanguage(lang.id)}
                  >
                    <Text style={[styles.modalLangLabel, { color: active ? theme.colors.primary : theme.colors.text }]}>
                      {lang.label}
                    </Text>
                    {active && <Feather name="check" size={20} color={theme.colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CitySearchModal
        visible={citySearchVisible}
        onClose={() => setCitySearchVisible(false)}
        onCitySelected={handleCityPicked}
      />

      {/* Calculation Method Selection Modal */}
      <Modal visible={methodModalVisible} transparent animationType="fade" onRequestClose={() => setMethodModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.calcMethod')}</Text>
              <Pressable onPress={() => setMethodModalVisible(false)} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]} accessibilityRole="button" accessibilityLabel={t('common.close', 'Close')}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {CALCULATION_METHODS.map((item) => {
                const active = item.id === currentMethod;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.modalLangRow, { borderBottomColor: theme.colors.border }]}
                    onPress={() => selectMethod(item.id)}
                  >
                    <View style={{ flex: 1, marginEnd: 8 }}>
                      <Text style={[styles.modalLangLabel, { color: active ? theme.colors.primary : theme.colors.text }]}>
                        {t(item.nameKey)}
                      </Text>
                      <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {`${t('home.prayers.fajr')} ${METHOD_ANGLES[item.id]?.fajr ?? ''} · ${t('home.prayers.isha')} ${METHOD_ANGLES[item.id]?.isha ?? ''}`}
                        {item.id === recommendedMethod ? `  ·  ${t('settings.recommended', 'Recommended')}` : ''}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={20} color={theme.colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />

      <WidgetPromptModal
        visible={widgetModalVisible}
        onClose={() => setWidgetModalVisible(false)}
      />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 130,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 4,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 30,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  /* Theme Chips */
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  themeChipLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  langLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  /* Compact Notifications */
  notifSection: {
    gap: 12,
  },
  compactNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compactNotifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactNotifName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  compactNotifRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 70,
  },
  compactNotifBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  /* Test Buttons */
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  testBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  /* About */
  aboutCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  aboutText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  modalClose: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 22,
  },
  modalLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalLangLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
  },
  editorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  editorBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#FFF',
  },
});
