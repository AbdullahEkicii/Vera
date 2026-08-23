import { Feather, Ionicons } from '@expo/vector-icons';
import notifee from '@notifee/react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  DeviceEventEmitter,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { logScreenView, logTabChange, logCitySelected } from '../../services/analyticsService';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { AdBanner } from '../../components/AdBanner';
import { CitySearchModal } from '../../components/CitySearchModal';
import { DailyContentScreen } from '../../components/DailyContentScreen';
import { NamesAndDuasScreen } from '../../components/NamesAndDuasScreen';
import { PrayerChecklistCard } from '../../components/PrayerChecklistCard';
import { PrayerTimeCard } from '../../components/PrayerTimeCard';
import { AppBackground } from '../../components/ProgressRing';
import { QuranScreen } from '../../components/QuranScreen';
import { ReligiousDaysModal } from '../../components/ReligiousDaysModal';
import { ScalePressable } from '../../components/ScalePressable';
import { SimpleHomeScreen } from '../../components/SimpleHomeScreen';
import { TasbihScreen } from '../../components/TasbihScreen';
import { ThemeSelectionModal } from '../../components/ThemeSelectionModal';
import { UnifiedCalendarModal } from '../../components/UnifiedCalendarModal';
import { WeeklyImsakiyeModal } from '../../components/WeeklyImsakiyeModal';
import { WidgetPromoModal } from '../../components/WidgetPromoModal';
import { WelcomeOnboardingModal } from '../../components/WelcomeOnboardingModal';
import { KazaTrackerModal } from '../../components/KazaTrackerModal';
import { GreetingCardModal } from '../../components/GreetingCardModal';
import { NearbyMosquesModal } from '../../components/NearbyMosquesModal';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../hooks/useLocation';
import { DayData, fetchPrayerTimes, fetchWeather, getCachedPrayerTimes, getTodayPrayerTimes, getWeatherEmoji, WeatherData } from '../../services/api';
import {
  checkNotificationPermissions,
  getNotificationPrefs,
  initNotifications,
  requestNotificationPermissions,
  schedulePrayerNotifications,
  updatePersistentPrayerNotification
} from '../../services/notificationService';
import { requestPinWidget, updateAndroidWidget } from '../../services/widgetService';
import { formatTime } from '../../utils/format';
import { getRecommendedCalculationMethod } from '../../utils/calcMethod';
import { borderRadius, typography } from '../../utils/theme';
import QiblaScreen from './qibla';

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const TABS = [
  { id: 'quran', icon: 'book', labelTR: 'Kuran', labelEN: 'Quran' },
  { id: 'daily', icon: 'book-open', labelTR: 'İçerik', labelEN: 'Content' },
  { id: 'home', icon: 'home', labelTR: 'Vakitler', labelEN: 'Times' },
  { id: 'dhikr', icon: 'heart', labelTR: 'Zikir', labelEN: 'Dhikr' },
  { id: 'library', icon: 'bookmark', labelTR: 'Dualar', labelEN: 'Duas' },
  { id: 'qibla', icon: 'compass', labelTR: 'Kıble', labelEN: 'Qibla' },
] as const;

const METHOD_LABEL_KEYS: Record<number, { key: string; defaultName: string }> = {
  1: { key: 'settings.methods.karachi', defaultName: 'Karachi' },
  2: { key: 'settings.methods.isna', defaultName: 'ISNA' },
  3: { key: 'settings.methods.mwl', defaultName: 'MWL' },
  4: { key: 'settings.methods.ummAlQura', defaultName: 'Umm Al-Qura' },
  5: { key: 'settings.methods.egypt', defaultName: 'Egypt' },
  12: { key: 'settings.methods.france', defaultName: 'UOIF France' },
  13: { key: 'settings.methods.diyanet', defaultName: 'Diyanet' },
  14: { key: 'settings.methods.russia', defaultName: 'Russia' },
};

const _cache: {
  prayerTimes: Record<string, string> | null;
  hijriDate: any;
  gregorianDate: any;
  targetDate: Date | null;
  nextPrayerKey: string;
  activePrayerKey: string;
  lastLat: number | null;
  lastLng: number | null;
  lastLang: string | null;
  activePage: number;
  activeTab: number;
  weather: WeatherData | null;
} = {
  prayerTimes: null,
  hijriDate: null,
  gregorianDate: null,
  targetDate: null,
  nextPrayerKey: 'fajr',
  activePrayerKey: 'fajr',
  lastLat: null,
  lastLng: null,
  lastLang: null,
  activePage: 0,
  activeTab: 2,
  weather: null,
};

const LazyScreen = React.memo(({ active, children }: { active: boolean; children: React.ReactNode }) => {
  const [loaded, setLoaded] = useState(active);

  useEffect(() => {
    if (active && !loaded) {
      // Use InteractionManager so that swipe animations or initial render aren't blocked by heavy screens
      const task = InteractionManager.runAfterInteractions(() => {
        setLoaded(true);
      });
      return () => task.cancel();
    }
  }, [active, loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
  }

  return <View style={{ flex: 1 }}>{children}</View>;
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { theme, isDark, isFullscreen, timeFormat, setTimeFormat } = useTheme();
  const TAB_BAR_BOTTOM = Platform.OS === 'android'
    ? Math.max(insets.bottom + 8, isFullscreen ? 16 : 22)
    : Math.max(insets.bottom + 6, 16);
  const TAB_BAR_HEIGHT = 60;
  const { location, loading: locationLoading, needsManualLocation, permissionDenied, saveManualLocation, refreshLocation } = useLocation();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(_cache.prayerTimes);
  const [hijriDate, setHijriDate] = useState<any>(_cache.hijriDate);
  const [gregorianDate, setGregorianDate] = useState<any>(_cache.gregorianDate);
  const [loadingApi, setLoadingApi] = useState(_cache.prayerTimes === null);
  const [targetDate, setTargetDate] = useState<Date | null>(_cache.targetDate);
  const [nextPrayerKey, setNextPrayerKey] = useState<string>(_cache.nextPrayerKey);
  const [activePrayerKey, setActivePrayerKey] = useState<string>(_cache.activePrayerKey);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(_cache.weather);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [homeScreenStyle, setHomeScreenStyle] = useState<'default' | 'simple'>('default');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('TEMP_UNIT').then((saved) => {
        if (saved === 'F' || saved === 'C') {
          setTempUnit(saved as 'C' | 'F');
        }
      });
    }, [])
  );

  const formatDisplayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  // Quick Feature Modals State
  const [imsakiyeVisible, setImsakiyeVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [religiousDaysVisible, setReligiousDaysVisible] = useState(false);
  const [widgetPromoVisible, setWidgetPromoVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [kazaVisible, setKazaVisible] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [mosquesVisible, setMosquesVisible] = useState(false);
  const [apiFullData, setApiFullData] = useState<DayData[]>([]);

  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(_cache.activeTab);

  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(true);
  const [calcMethod, setCalcMethod] = useState<number>(() => getRecommendedCalculationMethod());
  const [launchCount, setLaunchCount] = useState<number>(0);

  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Background floating circles animated values
  const circle1X = useSharedValue(-30);
  const circle1Y = useSharedValue(60);
  const circle2X = useSharedValue(120);
  const circle2Y = useSharedValue(320);

  // Instant Cold-Start Cache Hydration
  useEffect(() => {
    (async () => {
      if (!_cache.prayerTimes) {
        const cached = await getCachedPrayerTimes();
        if (cached && cached.data && cached.data.length > 0) {
          const today = getTodayPrayerTimes(cached.data);
          if (today) {
            setPrayerTimes(today as any);
            setHijriDate(today.hijri);
            setGregorianDate(today.gregorian);
            computePrayerState(today as any);
            _cache.prayerTimes = today as any;
            _cache.hijriDate = today.hijri;
            _cache.gregorianDate = today.gregorian;
          }
        }
      }
    })();
  }, []);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (isSearchVisible) {
        setIsSearchVisible(false);
        return true;
      }
      if (kazaVisible) {
        setKazaVisible(false);
        return true;
      }
      if (greetingVisible) {
        setGreetingVisible(false);
        return true;
      }
      if (mosquesVisible) {
        setMosquesVisible(false);
        return true;
      }
      if (imsakiyeVisible) {
        setImsakiyeVisible(false);
        return true;
      }
      if (calendarVisible) {
        setCalendarVisible(false);
        return true;
      }
      if (religiousDaysVisible) {
        setReligiousDaysVisible(false);
        return true;
      }
      if (themeModalVisible) {
        setThemeModalVisible(false);
        return true;
      }
      if (widgetPromoVisible) {
        setWidgetPromoVisible(false);
        return true;
      }
      if (activeTab !== 2) {
        navigateToPagerTab(2);
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [
    activeTab,
    isSearchVisible,
    kazaVisible,
    greetingVisible,
    mosquesVisible,
    imsakiyeVisible,
    calendarVisible,
    religiousDaysVisible,
    themeModalVisible,
    widgetPromoVisible,
  ]);

  useEffect(() => {
    if (params.tab !== undefined) {
      const targetTab = params.tab === 'daily' ? 1 : parseInt(params.tab, 10);
      if (!isNaN(targetTab) && targetTab >= 0 && targetTab <= 5) {
        setActiveTab(targetTab);
        _cache.activeTab = targetTab;
        pagerRef.current?.setPage(targetTab);
      }
    }
  }, [params.tab]);

  useEffect(() => {
    (async () => {
      await initNotifications();
      const hasPermission = await checkNotificationPermissions();
      setHasNotifPermission(hasPermission);

      // App Launch Count and Onboarding / Widget Promo Logic
      try {
        const countStr = await AsyncStorage.getItem('APP_LAUNCH_COUNT');
        const count = countStr ? parseInt(countStr, 10) : 0;
        const newCount = count + 1;
        await AsyncStorage.setItem('APP_LAUNCH_COUNT', newCount.toString());
        setLaunchCount(newCount);

        const onboardingDone = await AsyncStorage.getItem('ONBOARDING_COMPLETED');
        if (!onboardingDone) {
          setOnboardingVisible(true);
        }

        if (Platform.OS === 'android') {
          const promoShown = await AsyncStorage.getItem('WIDGET_PROMO_SHOWN');
          if (promoShown !== 'true') {
            // Show prompt on the 5th launch
            if (newCount >= 5) {
              setWidgetPromoVisible(true);
              await AsyncStorage.setItem('WIDGET_PROMO_SHOWN', 'true');
            }
          }
        }
      } catch (e) {
        console.log('Error checking launch metrics', e);
      }
    })();
  }, []); // Run ONLY once on mount

  // Load home screen style preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('HOME_SCREEN_STYLE');
        if (saved === 'simple' || saved === 'default') {
          setHomeScreenStyle(saved);
        }
      } catch (e) {
        console.log('Failed to load home screen style', e);
      }
    })();
  }, []); // Run once on mount

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      (async () => {
        const saved = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
        const defaultRecommended = getRecommendedCalculationMethod();
        const methodNum = saved ? parseInt(saved, 10) : defaultRecommended;

        if (!saved) {
          await AsyncStorage.setItem('PRAYER_CALCULATION_METHOD', defaultRecommended.toString()).catch(() => {});
        }

        const cachedString = await AsyncStorage.getItem('PRAYER_TIMES_CACHE');
        let cachedMethod = defaultRecommended;
        if (cachedString) {
          try {
            cachedMethod = JSON.parse(cachedString).method || defaultRecommended;
          } catch { }
        }

        if (cachedMethod !== methodNum || calcMethod !== methodNum) {
          setCalcMethod(methodNum);
          _cache.prayerTimes = null;
          if (location?.latitude && location?.longitude) {
            loadPrayerTimes(location.latitude, location.longitude);
          }
        }
      })();
    });

    return () => {
      unsubscribe();
    };
  }, [navigation, calcMethod, location]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('PRAYER_OFFSETS_CHANGED', () => {
      if (location?.latitude && location?.longitude) {
        _cache.prayerTimes = null;
        loadPrayerTimes(location.latitude, location.longitude);
      }
    });
    return () => sub.remove();
  }, [location]);

  useEffect(() => {
    circle1X.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 16000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 16000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    circle1Y.value = withRepeat(
      withSequence(
        withTiming(140, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        withTiming(60, { duration: 20000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    circle2X.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 22000, easing: Easing.inOut(Easing.ease) }),
        withTiming(120, { duration: 22000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    circle2Y.value = withRepeat(
      withSequence(
        withTiming(260, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
        withTiming(320, { duration: 15000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const c1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: circle1X.value }, { translateY: circle1Y.value }],
  }));

  const c2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: circle2X.value }, { translateY: circle2Y.value }],
  }));

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      const sameLocation =
        _cache.lastLat === location.latitude &&
        _cache.lastLng === location.longitude &&
        _cache.lastLang === i18n.language;
      if (_cache.prayerTimes && sameLocation) return;
      loadPrayerTimes(location.latitude, location.longitude);
    }
  }, [location, i18n.language]);

  useEffect(() => {
    if (needsManualLocation && !locationLoading) setIsSearchVisible(true);
  }, [needsManualLocation, locationLoading]);

  // Sync Android Home Screen Widget and Persistent Status Bar / Lock Screen Notification
  useEffect(() => {
    if (!prayerTimes || !location?.city || !nextPrayerKey || !targetDate) return;

    const doSync = () => {
      // If targetDate is already in the past, recompute prayer state
      if (targetDate.getTime() <= Date.now() && prayerTimes) {
        computePrayerState(prayerTimes);
        return; // computePrayerState will trigger re-render → this effect re-runs with fresh targetDate
      }

      const diff = targetDate.getTime() - Date.now();
      const targetTimestampMs = Number.isFinite(targetDate.getTime()) ? targetDate.getTime() : Date.now() + 60000;
      const totalSec = Math.max(0, Math.floor(diff / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);

      const nextNameTranslated = t(`home.prayers.${nextPrayerKey}`);
      const nextTimeStr = formatTime(prayerTimes[nextPrayerKey] || '', timeFormat);
      const unitH = t('home.timeLeftUnits.h', 'h');
      const unitM = t('home.timeLeftUnits.m', 'm');
      const unitLeft = t('home.timeLeftUnits.left', 'left');

      const countdownTextClean = h > 0
        ? `${h}${unitH} ${m}${unitM} ${unitLeft}`
        : `${m}${unitM} ${unitLeft}`;

      const fajrLabel = t('home.prayers.fajr');
      const sunriseLabel = t('home.prayers.sunrise');
      const dhuhrLabel = t('home.prayers.dhuhr');
      const asrLabel = t('home.prayers.asr');
      const maghribLabel = t('home.prayers.maghrib');
      const ishaLabel = t('home.prayers.isha');
      const summaryStr = `${fajrLabel}|${formatTime(prayerTimes.fajr, timeFormat)}|${sunriseLabel}|${formatTime(prayerTimes.sunrise, timeFormat)}|${dhuhrLabel}|${formatTime(prayerTimes.dhuhr, timeFormat)}|${asrLabel}|${formatTime(prayerTimes.asr, timeFormat)}|${maghribLabel}|${formatTime(prayerTimes.maghrib, timeFormat)}|${ishaLabel}|${formatTime(prayerTimes.isha, timeFormat)}`;

      // 1. Android Home Screen Widget Live Update
      updateAndroidWidget({
        city: `📍 ${location.city}`,
        nextName: nextNameTranslated,
        nextTime: nextTimeStr,
        countdown: `⏳ ${countdownTextClean}`,
        summary: summaryStr,
        hoursUnit: t('notifications.persistent.hoursUnit'),
        minutesUnit: t('notifications.persistent.minutesUnit'),
        countdownSuffix: t('notifications.persistent.countdown'),
        staleMessage: t('notifications.persistent.prayerEntered'),
      });

      AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED').then((saved) => {
        const enabled = saved !== null ? saved === 'true' : true;
        updatePersistentPrayerNotification(
          location.city,
          nextNameTranslated,
          nextTimeStr,
          targetTimestampMs,
          enabled
        );
      });
    };

    doSync();
    const interval = setInterval(doSync, 60000); // Update every 60 seconds

    // Also refresh immediately when app comes back to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        doSync();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [prayerTimes, location?.city, nextPrayerKey, targetDate, t, timeFormat, i18n.language]);

  const loadPrayerTimes = async (lat: number, lng: number) => {
    try {
      setLoadingApi(true);

      // Fetch weather asynchronously in background
      fetchWeather(lat, lng).then((w: WeatherData | null) => {
        if (w) {
          setWeather(w);
          _cache.weather = w;
        }
      });

      const data = await fetchPrayerTimes(lat, lng);
      setApiFullData(data);
      const today = getTodayPrayerTimes(data);
      if (today) {
        setPrayerTimes(today as any);
        setHijriDate(today.hijri);
        setGregorianDate(today.gregorian);
        computePrayerState(today as any);
        _cache.prayerTimes = today as any;
        _cache.hijriDate = today.hijri;
        _cache.gregorianDate = today.gregorian;
        _cache.lastLat = lat;
        _cache.lastLng = lng;
        _cache.lastLang = i18n.language;


      }

      const hasPermission = await checkNotificationPermissions();
      setHasNotifPermission(hasPermission);
      if (hasPermission) {
        const prefs = await getNotificationPrefs();
        InteractionManager.runAfterInteractions(() => {
          schedulePrayerNotifications(data, prefs, t).catch((err) =>
            console.error('Bildirim planlama hatası:', err)
          );
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApi(false);
    }
  };

  const computePrayerState = (times: Record<string, string>) => {
    const now = new Date();
    const toDate = (timeStr: string) => {
      const [h, m] = timeStr.split(':');
      const d = new Date();
      d.setHours(+h, +m, 0, 0);
      return d;
    };
    const ordered = PRAYER_KEYS.map((k) => ({ id: k, date: toDate(times[k]) }));
    let nextIdx = ordered.findIndex((p) => p.date > now);
    let isNextDay = false;
    if (nextIdx === -1) {
      nextIdx = 0;
      isNextDay = true;
    }
    const activeIdx = nextIdx === 0 ? ordered.length - 1 : nextIdx - 1;
    setActivePrayerKey(ordered[activeIdx].id);
    setNextPrayerKey(ordered[nextIdx].id);
    const nextDate = isNextDay
      ? (() => { const d = toDate(times[ordered[0].id]); d.setDate(d.getDate() + 1); return d; })()
      : ordered[nextIdx].date;
    setTargetDate(nextDate);
    _cache.activePrayerKey = ordered[activeIdx].id;
    _cache.nextPrayerKey = ordered[nextIdx].id;
    _cache.targetDate = nextDate;
  };

  const handleCitySelected = async (lat: number, lng: number, city: string) => {
    logCitySelected(city, false);
    await saveManualLocation(lat, lng, city);
    loadPrayerTimes(lat, lng);
  };

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      setHasNotifPermission(true);
      if (location?.latitude && location?.longitude) {
        loadPrayerTimes(location.latitude, location.longitude);
      }
    } else {
      Linking.openSettings();
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    if (location?.latitude && location?.longitude) {
      await loadPrayerTimes(location.latitude, location.longitude);
    }
    setRefreshing(false);
  }, [location]);

  const handleTimeReached = useCallback(() => {
    if (location?.latitude && location?.longitude) {
      loadPrayerTimes(location.latitude, location.longitude);
    }
  }, [location]);

  const handlePageSelected = (e: any) => {
    const pos = e.nativeEvent.position;
    setActiveTab(pos);
    _cache.activeTab = pos;
    const tabName = TABS[pos]?.id || `Tab_${pos}`;
    logTabChange(tabName, pos);
  };

  const navigateToPagerTab = (logicalIndex: number) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    pagerRef.current?.setPage(logicalIndex);
    setActiveTab(logicalIndex);
    _cache.activeTab = logicalIndex;
    const tabName = TABS[logicalIndex]?.id || `Tab_${logicalIndex}`;
    logTabChange(tabName, logicalIndex);
  };

  const otherPrayers = prayerTimes
    ? (PRAYER_KEYS.filter((k) => k !== nextPrayerKey) as string[])
    : [];

  // Compact Next-gen Glassmorphic Header cards with Weather
  const renderHeaderSection = () => {
    const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
    return (
      <Animated.View entering={FadeInDown.delay(50).duration(450).springify().damping(12)} style={styles.headerContainer}>
        {/* Row 1: City Selection & Settings Button */}
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.headerCityBtn}
            onPress={() => setIsSearchVisible(true)}
          >
            <Feather name="map-pin" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.headerCityText, { color: theme.colors.text }]} numberOfLines={1}>
              {location?.city ?? (isLangTR ? 'Şehir Seç' : 'Select City')}
            </Text>
            <Feather name="chevron-down" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>

          <Pressable
            style={[styles.headerCircleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Feather name="settings" size={16} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* Row 2: Large Dates & Weather widget & Custom Buttons */}
        <View style={styles.headerBottomRowWrapper}>
          {/* Top Grid: Calendar, Theme, Weather */}
          <View style={styles.headerGridRow}>
            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setCalendarVisible(true)}
              hitSlop={8}
            >
              <Feather name="calendar" size={16} color={theme.colors.primary} />
              <View style={{ marginLeft: 6 }}>
                <Text style={[styles.headerDateMain, { color: theme.colors.text }]} numberOfLines={1}>
                  {gregorianDate?.date ? gregorianDate.date.split(',')[0] : '···'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setThemeModalVisible(true)}
            >
              <Feather name="aperture" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {t('settings.theme', 'Tema')}
              </Text>
            </Pressable>

            {weather ? (
              <Pressable
                style={[styles.headerActionBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  if (location?.latitude && location?.longitude) {
                    router.push({
                      pathname: '/weather',
                      params: {
                        lat: location.latitude,
                        lng: location.longitude,
                        city: location.city ?? '',
                      },
                    } as any);
                  }
                }}
              >
                <Text style={[styles.weatherText, { color: theme.colors.text }]}>
                  {getWeatherEmoji(weather.code)} {formatDisplayTemp(weather.temp)}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.headerActionBox, { opacity: 0 }]} />
            )}
          </View>

          {/* Bottom Grid: TimeFormat, Kaza, Greeting Card, Nearby Mosques */}
          <View style={styles.headerGridRow}>
            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setTimeFormat(timeFormat === '12h' ? '24h' : '12h')}
            >
              <Feather name="clock" size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {timeFormat}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setKazaVisible(true)}
            >
              <Feather name="check-square" size={15} color="#D4AF37" />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {t('kaza.shortTitle', 'Kaza')}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setGreetingVisible(true)}
            >
              <Feather name="gift" size={15} color="#D4AF37" />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {t('greeting.shortTitle', 'Tebrik')}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setMosquesVisible(true)}
            >
              <Feather name="map-pin" size={15} color="#10B981" />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {t('mosques.shortTitle', 'Camiler')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderHomeContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.homeContent, { paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#D4AF37"
          colors={['#D4AF37']}
        />
      }
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen} />

      {/* Header Cards Row */}
      {renderHeaderSection()}

      {/* Location Permission / Fallback Banner */}
      {permissionDenied && (
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(12)}
          style={[styles.notifBanner, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border, marginBottom: 8 }]}
        >
          <View style={styles.notifBannerLeft}>
            <View style={[styles.notifBannerIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
              <Ionicons name="location" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.notifBannerTextWrap}>
              <Text style={[styles.notifBannerTitle, { color: theme.colors.text }]}>
                {t('home.locationPermissionTitle', 'Konum İzni Alınamadı')}
              </Text>
              <Text style={[styles.notifBannerDesc, { color: theme.colors.textSecondary }]}>
                {t('home.locationPermissionDesc', 'Varsayılan şehir gösteriliyor. Şehir seçebilir veya konum izni verebilirsiniz.')}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.notifBannerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setIsSearchVisible(true)}
          >
            <Text style={styles.notifBannerBtnText}>{t('search.title', 'Şehir Seç')}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Premium Notification Permission Banner */}
      {!hasNotifPermission && (
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(12)}
          style={[styles.notifBanner, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <View style={styles.notifBannerLeft}>
            <View style={[styles.notifBannerIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
              <Ionicons name="notifications" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.notifBannerTextWrap}>
              <Text style={[styles.notifBannerTitle, { color: theme.colors.text }]}>
                {t('notifications.bannerTitle')}
              </Text>
              <Text style={[styles.notifBannerDesc, { color: theme.colors.textSecondary }]}>
                {t('notifications.bannerDesc')}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.notifBannerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleRequestNotifPermission}
          >
            <Text style={styles.notifBannerBtnText}>{t('notifications.bannerBtn')}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Loading Skeleton if API is fetching and prayerTimes is not yet cached */}
      {loadingApi && !prayerTimes && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.heroSection, { minHeight: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 }}>
            {t('home.loadingTimes', 'Namaz Vakitleri Yükleniyor...')}
          </Text>
        </Animated.View>
      )}

      {/* Error / Offline State if API failed and prayerTimes is null */}
      {!loadingApi && !prayerTimes && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.heroSection, { minHeight: 190, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border }]}>
          <Feather name="wifi-off" size={32} color={theme.colors.primary} style={{ marginBottom: 10 }} />
          <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: 17, color: theme.colors.text, textAlign: 'center', marginBottom: 4 }}>
            {t('home.errorLoadingTitle', 'Vakitler Yüklenemedi')}
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
            {t('home.errorLoadingSubtitle', 'İnternet bağlantınızı kontrol edin veya şehir seçin.')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.colors.primary }}
              onPress={() => location?.latitude && location?.longitude && loadPrayerTimes(location.latitude, location.longitude)}
            >
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: '#1A1207' }}>
                {t('home.retryBtn', 'Yeniden Dene')}
              </Text>
            </Pressable>
            <Pressable
              style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.colors.surfaceStrong, borderWidth: 1, borderColor: theme.colors.border }}
              onPress={() => setIsSearchVisible(true)}
            >
              <Text style={{ fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: theme.colors.text }}>
                {t('search.title', 'Şehir Seç')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Hero Prayer Card (Now compact 230px, glassmorphic) */}
      {nextPrayerKey && prayerTimes && (
        <Animated.View entering={FadeInDown.delay(100).duration(450).springify().damping(12)} style={styles.heroSection}>
          <PrayerTimeCard
            id={nextPrayerKey}
            name={t(`home.prayers.${nextPrayerKey}`)}
            time={prayerTimes[nextPrayerKey]}
            isHero
            targetDate={targetDate}
            onTimeReached={handleTimeReached}
          />
        </Animated.View>
      )}

      {/* Prayer Grid (Single Row) */}
      {prayerTimes && (
        <Animated.View entering={FadeInDown.delay(160).duration(400).springify().damping(12)} style={styles.gridSectionSingle}>
          {otherPrayers.map((k) => (
            <View key={k} style={styles.compactCardWrapper}>
              <PrayerTimeCard
                id={k}
                name={t(`home.prayers.${k}`)}
                time={prayerTimes[k]}
                isActive={k === activePrayerKey}
              />
            </View>
          ))}
        </Animated.View>
      )}

      {/* Reassurance & Transparency Trust Badge (Shown only for the first 5 launches) */}
      {location?.city && prayerTimes && launchCount <= 5 && (
        <Animated.View
          entering={FadeInDown.delay(180).duration(400).springify().damping(12)}
          style={[
            styles.trustBadgeCard,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.5)' : '#6EE7B7',
            }
          ]}
        >
          <View style={styles.trustBadgeLeft}>
            <View style={[styles.trustIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
              <Feather name="shield" size={14} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <Text style={[styles.trustBadgeText, { color: isDark ? '#FFFFFF' : '#064E3B' }]}>
              {t('checklist.trustNotice', '{{city}} • {{method}} yöntemiyle bölgeniz için doğrulanmış vakitler.', {
                city: location.city,
                method: t(METHOD_LABEL_KEYS[calcMethod]?.key || '', METHOD_LABEL_KEYS[calcMethod]?.defaultName || 'MWL'),
              })}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Quick Features Row: Haftalık İmsakiye & Dini Günler */}
      {prayerTimes && (
        <Animated.View
          entering={FadeInDown.delay(190).duration(400).springify().damping(12)}
          style={styles.quickFeaturesRow}
        >
          <Pressable
            style={[
              styles.quickFeatureChip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setImsakiyeVisible(true)}
          >
            <View style={styles.quickFeatureIconWrap}>
              <Feather name="calendar" size={16} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickFeatureText, { color: theme.colors.text }]}>
              {t('imsakiye.title', 'Weekly Imsakiye')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.quickFeatureChip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setReligiousDaysVisible(true)}
          >
            <View style={styles.quickFeatureIconWrap}>
              <Feather name="moon" size={16} color="#D4AF37" />
            </View>
            <Text style={[styles.quickFeatureText, { color: theme.colors.text }]}>
              {t('religious.title', 'Religious Days')}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Ad Banner #1 (Right under İmsakiye & Dini Günler) */}
      <Animated.View entering={FadeInDown.delay(200).duration(400).springify().damping(12)}>
        <AdBanner />
      </Animated.View>

      {/* Daily Prayer Checklist & Streak Card */}
      <Animated.View entering={FadeInDown.delay(210).duration(400).springify().damping(12)}>
        <PrayerChecklistCard />
      </Animated.View>



      {/* Feature Modals - Conditionally rendered to improve initial load performance */}
      {imsakiyeVisible && (
        <WeeklyImsakiyeModal
          visible={imsakiyeVisible}
          onClose={() => setImsakiyeVisible(false)}
          data={apiFullData}
          cityName={location?.city || 'İstanbul'}
        />
      )}

      {calendarVisible && (
        <UnifiedCalendarModal
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          hijriDate={hijriDate}
          gregorianDate={gregorianDate}
        />
      )}

      {religiousDaysVisible && (
        <ReligiousDaysModal
          visible={religiousDaysVisible}
          onClose={() => setReligiousDaysVisible(false)}
        />
      )}

      {widgetPromoVisible && (
        <WidgetPromoModal
          visible={widgetPromoVisible}
          onClose={() => setWidgetPromoVisible(false)}
          onAddWidget={async () => {
            setWidgetPromoVisible(false);
            await requestPinWidget();
          }}
        />
      )}

      {themeModalVisible && (
        <ThemeSelectionModal
          visible={themeModalVisible}
          onClose={() => setThemeModalVisible(false)}
          onHomeStyleChange={setHomeScreenStyle}
        />
      )}
    </ScrollView>
  );

  const renderTabBar = () => (
    <View style={[styles.tabBarWrapper, { bottom: TAB_BAR_BOTTOM }]} pointerEvents="box-none">
      <BlurView
        intensity={isDark ? 65 : 85}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.tabBarBlur,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.75)',
            backgroundColor: isDark ? 'rgba(20, 20, 28, 0.65)' : 'rgba(255, 255, 255, 0.65)',
          },
        ]}
      >
        {TABS.map((tab, idx) => {
          const isActive = activeTab === idx;
          return (
            <ScalePressable
              key={tab.id}
              style={styles.tabItem}
              activeScale={0.88}
              onPress={() => navigateToPagerTab(idx)}
            >
              {isActive ? (
                <Animated.View
                  entering={FadeInDown.duration(280).springify().damping(14)}
                  style={styles.tabActiveWrap}
                >
                  <LinearGradient
                    colors={theme.colors.heroGradient as [string, string]}
                    style={styles.tabActiveBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Feather name={tab.icon as any} size={19} color="#FFF" />
                  </LinearGradient>
                  {/* Active indicator micro dot */}
                  <View style={styles.activeGlowDot} />
                </Animated.View>
              ) : (
                <View style={styles.tabIconWrap}>
                  <Feather name={tab.icon as any} size={20} color={theme.colors.textSecondary} />
                </View>
              )}
            </ScalePressable>
          );
        })}
      </BlurView>
    </View>
  );

  return (
    <AppBackground isDark={isDark} nextPrayerKey={nextPrayerKey}>
      {/* Decorative Floating ambient lights for Apple / Glass aesthetic */}
      <Animated.View style={[styles.bgCircle, c1Style, { backgroundColor: theme.colors.primary }]} pointerEvents="none" />
      <Animated.View style={[styles.bgCircle, c2Style, { backgroundColor: theme.colors.glow }]} pointerEvents="none" />

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={_cache.activeTab}
        onPageSelected={handlePageSelected}
        offscreenPageLimit={1}
      >
        <View key="0" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 0}>
            <QuranScreen />
          </LazyScreen>
        </View>

        <View key="1" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 1}>
            <DailyContentScreen />
          </LazyScreen>
        </View>

        <View key="2" style={{ flex: 1 }}>
          {homeScreenStyle === 'simple' ? (
            <SimpleHomeScreen
              prayerTimes={prayerTimes}
              nextPrayerKey={nextPrayerKey}
              activePrayerKey={activePrayerKey}
              targetDate={targetDate}
              hijriDate={hijriDate}
              gregorianDate={gregorianDate}
              weather={weather}
              location={location}
              apiFullData={apiFullData}
              onCityPress={() => setIsSearchVisible(true)}
              onHomeStyleChange={setHomeScreenStyle}
            />
          ) : (
            <LazyScreen active={activeTab === 2}>
              {renderHomeContent()}
            </LazyScreen>
          )}
        </View>

        <View key="3" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 3}>
            <TasbihScreen isActiveTab={activeTab === 3} />
          </LazyScreen>
        </View>

        <View key="4" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 4}>
            <NamesAndDuasScreen />
          </LazyScreen>
        </View>

        <View key="5" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 5}>
            {/* Added onBack so Qibla screen can return to Home (index 2) */}
            <QiblaScreen isActiveTab={activeTab === 5} onBack={() => navigateToPagerTab(2)} />
          </LazyScreen>
        </View>
      </PagerView>

      {renderTabBar()}

      <CitySearchModal
        visible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        onCitySelected={handleCitySelected}
        isDismissable={!needsManualLocation}
      />

      <WelcomeOnboardingModal
        visible={onboardingVisible}
        currentCity={location?.city}
        onOpenCitySearch={() => setIsSearchVisible(true)}
        onComplete={async (lat, lng, city) => {
          setOnboardingVisible(false);
          if (lat && lng && city) {
            await saveManualLocation(lat, lng, city);
            handleCitySelected(lat, lng, city);
          } else {
            try {
              const savedStr = await AsyncStorage.getItem('MANUAL_LOCATION');
              if (savedStr) {
                const saved = JSON.parse(savedStr);
                if (saved?.latitude && saved?.longitude && saved?.city) {
                  await saveManualLocation(saved.latitude, saved.longitude, saved.city);
                  handleCitySelected(saved.latitude, saved.longitude, saved.city);
                  return;
                }
              }
            } catch (_) {}
            await refreshLocation();
          }
        }}
      />

      <KazaTrackerModal
        visible={kazaVisible}
        onClose={() => setKazaVisible(false)}
      />

      <GreetingCardModal
        visible={greetingVisible}
        onClose={() => setGreetingVisible(false)}
      />

      <NearbyMosquesModal
        visible={mosquesVisible}
        onClose={() => setMosquesVisible(false)}
        latitude={location?.latitude ?? null}
        longitude={location?.longitude ?? null}
        currentCity={location?.city}
      />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Ambient floating background lights
  bgCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.05,
  },

  // Home Content layout adjustments (Compact)
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight ?? 24) + 8,
    paddingBottom: 115,
    gap: 8,
  },

  // Premium Mini Header Cards
  headerContainer: {
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerCityText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBottomRowWrapper: {
    gap: 6,
    marginTop: 2,
  },
  headerGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  headerActionBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  headerActionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginLeft: 6,
  },
  headerDateMain: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  weatherText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },

  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridSectionSingle: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  compactCardWrapper: {
    flex: 1,
  },

  // Ad Banner compact styles
  adBanner: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  adText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    opacity: 0.65,
  },

  // Reassurance Trust Badge
  trustBadgeCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  trustBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trustBadgeText: {
    flex: 1,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },

  // Floating Tab Bar
  tabBarWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 64,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#C8860A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  tabBarBlur: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 32,
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  tabActiveWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActiveBackground: {
    width: 44,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8860A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  activeGlowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
  },
  tabIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Permission banner
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  notifBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  notifBannerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
  notifBannerDesc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10.5,
    lineHeight: 14,
  },
  notifBannerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBannerBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFF',
  },

  // Quick Features Row
  quickFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
  },
  quickFeatureChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  quickFeatureIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickFeatureText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12.5,
    flexShrink: 1,
    textAlign: 'center',
  },

  // Notification Test Buttons
  notifTestContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  notifTestHeaderTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  notifTestButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notifTestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  notifTestBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
});
