import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert, Pressable, Modal, DeviceEventEmitter } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBackground } from '../../components/ProgressRing';
import { WidgetPromptModal } from '../../components/WidgetPromptModal';
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
} from '../../services/notificationService';
import { audioManager } from '../../services/audioManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { TextInput } from 'react-native';

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
  const { t, i18n } = useTranslation();
  const { theme, isDark, mode, setThemeMode, isFullscreen, setIsFullscreen } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<number>(13);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  // Editor State
  const [isEditor, setIsEditor] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [editorUsername, setEditorUsername] = useState('');
  const [editorPassword, setEditorPassword] = useState('');
  const [editorError, setEditorError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persistent Notification & Widget State
  const [persistentNotifEnabled, setPersistentNotifEnabled] = useState<boolean>(true);
  const [widgetModalVisible, setWidgetModalVisible] = useState<boolean>(false);

  // Sound Selection & Volume State
  const [exactSound, setExactSound] = useState<string>('azizallah');
  const [warningSound, setWarningSound] = useState<string>('adhan_25minutes');
  const [volumeLevel, setVolumeLevel] = useState<number>(0.75);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  useEffect(() => {
    getNotificationPrefs().then((p) => {
      setPrefs(p);
      if (p.exactSound) setExactSound(p.exactSound);
      if (p.warningSound) setWarningSound(p.warningSound);
    });
    
    audioManager.getVolume().then((v) => {
      setVolumeLevel(v);
    });

    AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED').then((saved) => {
      setPersistentNotifEnabled(saved !== null ? saved === 'true' : true);
    });

    // Load current calculation method
    AsyncStorage.getItem('PRAYER_CALCULATION_METHOD').then((saved) => {
      if (saved) {
        setCurrentMethod(parseInt(saved, 10));
      }
    });

    // Check Editor Auth State
    const subscriber = onAuthStateChanged(getAuth(), (user) => {
      setIsEditor(!!user);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  const togglePersistentNotif = async (value: boolean) => {
    setPersistentNotifEnabled(value);
    await AsyncStorage.setItem('PERSISTENT_NOTIF_ENABLED', value ? 'true' : 'false');
    if (!value) {
      updatePersistentPrayerNotification('', '', '', 0, false);
    }
  };

  const rescheduleFromCache = async (currentPrefs: NotificationPrefs) => {
    const cachedString = await AsyncStorage.getItem('PRAYER_TIMES_CACHE');
    if (cachedString) {
      try {
        const cached = JSON.parse(cachedString);
        await schedulePrayerNotifications(cached.data, currentPrefs, t);
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

  const handleVolumeChange = async (vol: number) => {
    setVolumeLevel(vol);
    await audioManager.setVolume(vol);
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
        setPlayingSound(null);
      });
    }
  };

  const toggleLanguage = async (newLang: string) => {
    await AsyncStorage.setItem('APP_LANG', newLang);
    await i18n.changeLanguage(newLang);
    setLangModalVisible(false);
    if (prefs) setTimeout(() => rescheduleFromCache(prefs), 100);
  };

  const selectMethod = async (methodId: number) => {
    setCurrentMethod(methodId);
    await AsyncStorage.setItem('PRAYER_CALCULATION_METHOD', String(methodId));
    // Clear prayer cache so it refetches next time Home tab is focused
    await AsyncStorage.removeItem('PRAYER_TIMES_CACHE');
    setMethodModalVisible(false);
  };

  const LANGUAGES = [
    { id: 'en', label: '🇬🇧 English' },
    { id: 'tr', label: '🇹🇷 Türkçe' },
    { id: 'zh', label: '🇨🇳 简体中文' },
    { id: 'it', label: '🇮🇹 Italiano' },
    { id: 'de', label: '🇩🇪 Deutsch' },
    { id: 'nl', label: '🇳🇱 Nederlands' },
    { id: 'ar', label: '🇸🇦 العربية' },
    { id: 'es', label: '🇪🇸 Español' },
    { id: 'fr', label: '🇫🇷 Français' },
    { id: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { id: 'ur', label: '🇵🇰 اردو' },
    { id: 'fa', label: '🇮🇷 فارسی' },
    { id: 'ru', label: '🇷🇺 Русский' },
    { id: 'uz', label: '🇺🇿 Oʻzbekcha' },
    { id: 'bn', label: '🇧🇩 বাংলা' },
    { id: 'ms', label: '🇲🇾 Bahasa Melayu' },
    { id: 'hi', label: '🇮🇳 हिन्दी' },
    { id: 'sq', label: '🇦🇱 Shqip' },
    { id: 'ha', label: '🇳🇬 Hausa' },
    { id: 'sw', label: '🇹🇿 Kiswahili' },
    { id: 'cs', label: '🇨🇿 Čeština' },
    { id: 'da', label: '🇩🇰 Dansk' },
    { id: 'fi', label: '🇫🇮 Suomi' },
    { id: 'hu', label: '🇭🇺 Magyar' },
    { id: 'ja', label: '🇯🇵 日本語' },
    { id: 'ko', label: '🇰🇷 한국어' },
    { id: 'no', label: '🇳🇴 Norsk' },
    { id: 'pl', label: '🇵🇱 Polski' },
    { id: 'pt', label: '🇧🇷 Português' },
    { id: 'ro', label: '🇷🇴 Română' },
    { id: 'sk', label: '🇸🇰 Slovenčina' },
    { id: 'sv', label: '🇸🇪 Svenska' },
    { id: 'th', label: '🇹🇭 ไทย' },
    { id: 'uk', label: '🇺🇦 Українська' },
    { id: 'vi', label: '🇻🇳 Tiếng Việt' },
  ];

  const toggleTheme = (mode: 'light' | 'dark') => setThemeMode(mode as any);

  const toggleNotification = async (key: keyof NotificationPrefs, val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(t('common.error'), 'Notification permissions denied.');
        return;
      }
    }
    if (prefs) {
      const newPrefs = { ...prefs, [key]: val };
      setPrefs(newPrefs);
      await saveNotificationPrefs(newPrefs);
      await rescheduleFromCache(newPrefs);
    }
  };

  const themeOptions: { label: string; value: 'light' | 'dark'; icon: any }[] = [
    { label: t('settings.light'), value: 'light', icon: 'sun' },
    { label: t('settings.dark'),  value: 'dark',  icon: 'moon' },
  ];

  const handleEditorLogin = async () => {
    setEditorError('');
    setIsLoggingIn(true);
    try {
      // Map 'irfan' or username to email
      const email = editorUsername.includes('@') ? editorUsername : `${editorUsername}@editor.com`;
      await signInWithEmailAndPassword(getAuth(), email, editorPassword);
      setEditorModalVisible(false);
      setEditorUsername('');
      setEditorPassword('');
    } catch (e: any) {
      setEditorError(t('settings.loginFailed', 'Login failed. Check your credentials.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEditorLogout = async () => {
    try {
      await signOut(getAuth());
    } catch (e) {}
  };

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
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
            <Feather name="arrow-left" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.title')}</Text>
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
          <Pressable onPress={() => setLangModalVisible(true)}>
            <LinearGradient
              colors={[theme.colors.surface, theme.colors.surface]}
              style={[styles.langChip, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.langLabel, { color: theme.colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
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
          <Pressable onPress={() => setMethodModalVisible(true)}>
            <LinearGradient
              colors={[theme.colors.surface, theme.colors.surface]}
              style={[styles.langChip, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.langLabel, { color: theme.colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                {t(CALCULATION_METHODS.find(m => m.id === currentMethod)?.nameKey || '')}
              </Text>
              <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── General Settings (Fullscreen) ── */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.general', 'General Settings')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="maximize-2" size={18} color={isFullscreen ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.text }}>
                {t('settings.fullscreen', 'Fullscreen Mode')}
              </Text>
            </View>
            <Switch
              value={isFullscreen}
              onValueChange={(val) => setIsFullscreen(val)}
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
            <View style={{ flex: 1, marginRight: 12 }}>
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
              value={persistentNotifEnabled}
              onValueChange={togglePersistentNotif}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
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
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Feather name="grid" size={16} color={theme.colors.primary} />
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                  {t('settings.addWidget', '📌 Add Widget to Home Screen!')}
                </Text>
              </View>
              <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                {t('settings.addWidgetDesc', 'See prayer times and live countdown directly on your phone\'s home screen.')}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
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
              <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: 13, color: theme.colors.primary }}>
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
                {t('settings.warningSoundTitle', '25 Min Warning Sound')}
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
                        <Text style={[styles.compactNotifBtnText, { color: isWarnOn ? '#FFF' : theme.colors.textSecondary }]}>{t('settings.warnNotifBtn', '-25dk')}</Text>
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

            <View style={styles.testButtonsContainer}>
              <Pressable style={[styles.testBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]} onPress={() => handleTestNotification('warning')}>
                <Feather name="clock" size={16} color={theme.colors.primary} />
                <Text style={[styles.testBtnText, { color: theme.colors.text }]}>{t('settings.testWarnNotif')}</Text>
              </Pressable>
              <Pressable style={[styles.testBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]} onPress={() => handleTestNotification('exact')}>
                <Feather name="bell" size={16} color={theme.colors.primary} />
                <Text style={[styles.testBtnText, { color: theme.colors.text }]}>{t('settings.testExactNotif')}</Text>
              </Pressable>
            </View>
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
                <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: theme.colors.primary }}>
                  {t('update.checkUpdate', 'Güncellemeleri Kontrol Et')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(440).duration(500)}
          style={[styles.aboutCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
          </Text>
        </Animated.View>

        {/* ── Editor Access ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(460).duration(500)}>
          {isEditor ? (
            <Pressable
              style={[styles.editorBtn, { backgroundColor: '#FF3B30' }]}
              onPress={handleEditorLogout}
            >
              <Feather name="log-out" size={16} color="#FFF" />
              <Text style={styles.editorBtnText}>{t('settings.editorLogout', 'Editor Logout')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.editorBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, borderWidth: 1 }]}
              onPress={() => setEditorModalVisible(true)}
            >
              <Feather name="lock" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.editorBtnText, { color: theme.colors.textSecondary }]}>{t('settings.editorLogin', 'Editor Login')}</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.language')}</Text>
              <Pressable onPress={() => setLangModalVisible(false)} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]}>
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

      {/* Calculation Method Selection Modal */}
      <Modal visible={methodModalVisible} transparent animationType="fade" onRequestClose={() => setMethodModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.calcMethod')}</Text>
              <Pressable onPress={() => setMethodModalVisible(false)} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]}>
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
                    <Text style={[styles.modalLangLabel, { color: active ? theme.colors.primary : theme.colors.text }]}>
                      {t(item.nameKey)}
                    </Text>
                    {active && <Feather name="check" size={20} color={theme.colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Editor Login Modal */}
      <Modal visible={editorModalVisible} transparent animationType="fade" onRequestClose={() => setEditorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.editorLogin', 'Editor Login')}</Text>
              <Pressable onPress={() => setEditorModalVisible(false)} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceStrong }]}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder={t('settings.username', 'Username')}
                placeholderTextColor={theme.colors.textSecondary}
                value={editorUsername}
                onChangeText={setEditorUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder={t('settings.password', 'Password')}
                placeholderTextColor={theme.colors.textSecondary}
                value={editorPassword}
                onChangeText={setEditorPassword}
                secureTextEntry
              />
              {editorError ? <Text style={{ color: '#FF3B30', fontSize: 13 }}>{editorError}</Text> : null}
              
              <Pressable
                style={[styles.loginSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleEditorLogin}
                disabled={isLoggingIn}
              >
                <Text style={{ color: '#FFF', fontFamily: typography.fontFamily.semiBold, fontSize: 16 }}>
                  {isLoggingIn ? t('settings.loggingIn', 'Logging in...') : t('settings.login', 'Login')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  testBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
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
    padding: 8,
    borderRadius: 20,
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
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
  },
  loginSubmitBtn: {
    padding: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
