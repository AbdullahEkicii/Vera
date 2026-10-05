import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
 InteractionManager } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { logTabChange, logCitySelected } from '../../services/analyticsService';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStorage as AsyncStorage, SecureLocationStorage } from '../../services/storageService';

import { BannerAdSlot } from '../../components/BannerAdSlot';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { BatteryOptimizationCard } from '../../components/BatteryOptimizationCard';
import { PrayerOffsetSheet } from '../../components/PrayerOffsetSheet';
import { AnimatedTabBar } from '../../components/AnimatedTabBar';
import { CitySearchModal } from '../../components/CitySearchModal';
import { DailyContentScreen } from '../../components/DailyContentScreen';
import { NamesAndDuasScreen } from '../../components/NamesAndDuasScreen';
import { PrayerChecklistCard } from '../../components/PrayerChecklistCard';
import { PrayerTimeCard } from '../../components/PrayerTimeCard';
import { AppBackground } from '../../components/ProgressRing';
import { QuranScreen } from '../../components/QuranScreen';
import { ReligiousDaysModal } from '../../components/ReligiousDaysModal';
import { SimpleHomeScreen } from '../../components/SimpleHomeScreen';
import { TasbihScreen } from '../../components/TasbihScreen';
import { ThemeSelectionModal } from '../../components/ThemeSelectionModal';
import { UnifiedCalendarModal } from '../../components/UnifiedCalendarModal';
import { WeeklyImsakiyeModal } from '../../components/WeeklyImsakiyeModal';
import { RamadanCalendarModal } from '../../components/RamadanCalendarModal';
import { WidgetPromoModal } from '../../components/WidgetPromoModal';
import { WelcomeOnboardingModal } from '../../components/WelcomeOnboardingModal';
import { KazaTrackerModal } from '../../components/KazaTrackerModal';
import { GreetingCardModal } from '../../components/GreetingCardModal';
import { NearbyMosquesModal } from '../../components/NearbyMosquesModal';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../hooks/useLocation';
import { applyOffsetsToData, DayData, fetchPrayerTimes, fetchWeather, getCachedPrayerTimes, getPrayerOffsets, getTodayPrayerTimes, getWeatherIcon, WeatherData, wasLastPrayerTimesFetchEstimated } from '../../services/api';
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
import { hijriMonthName } from '../../localization/content';

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
  // Full multi-day data (weekly imsakiye etc.). Must survive remounts together with
  // prayerTimes, otherwise the early-return in the load effect leaves it empty.
  fullData: DayData[] | null;
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
  fullData: null,
};

// Tab screens only take booleans/stable callbacks: memoize them so a HomeScreen state
// change (weather, modal toggle, tab switch) doesn't re-render every opened tab.
const MemoQuranScreen = React.memo(QuranScreen);
const MemoDailyContentScreen = React.memo(DailyContentScreen);
const MemoTasbihScreen = React.memo(TasbihScreen);
const MemoNamesAndDuasScreen = React.memo(NamesAndDuasScreen);
const MemoQiblaScreen = React.memo(QiblaScreen);

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

  // Each tab gets its own error boundary: a render error in e.g. the Quran tab must not
  // replace the whole app (and the prayer times) with the error screen.
  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </View>
  );
});
LazyScreen.displayName = 'LazyScreen';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
  const { theme, isDark, isFullscreen, timeFormat } = useTheme();
  const TAB_BAR_BOTTOM = Platform.OS === 'android'
    ? Math.max(insets.bottom + 8, isFullscreen ? 16 : 22)
    : Math.max(insets.bottom + 6, 16);
  const TAB_BAR_HEIGHT = 64;
  const { location, loading: locationLoading, needsManualLocation, permissionDenied, isResolved: locationResolved, saveManualLocation, refreshLocation } = useLocation();
  // Only the latest loadPrayerTimes call may update state or schedule notifications;
  // an older, slower response must never overwrite a newer one.
  const prayerLoadSeq = useRef(0);

  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(_cache.prayerTimes);
  const [hijriDate, setHijriDate] = useState<any>(_cache.hijriDate);
  const [gregorianDate, setGregorianDate] = useState<any>(_cache.gregorianDate);
  const [loadingApi, setLoadingApi] = useState(_cache.prayerTimes === null);
  const [isEstimatedTimes, setIsEstimatedTimes] = useState(false);
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
  const [ramadanCalendarVisible, setRamadanCalendarVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [religiousDaysVisible, setReligiousDaysVisible] = useState(false);
  const [widgetPromoVisible, setWidgetPromoVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [offsetPrayerKey, setOffsetPrayerKey] = useState<typeof PRAYER_KEYS[number] | null>(null);
  const [kazaVisible, setKazaVisible] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [mosquesVisible, setMosquesVisible] = useState(false);
  const [apiFullData, setApiFullData] = useState<DayData[]>(_cache.fullData ?? []);

  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(_cache.activeTab);
  const tabScrollX = useSharedValue(_cache.activeTab);

  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(true);
  const [calcMethod, setCalcMethod] = useState<number>(() => getRecommendedCalculationMethod());
  const [launchCount, setLaunchCount] = useState<number>(0);

  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tab?: string; open?: string; occasion?: string }>();

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
          // The cache stores raw API times; apply the user's ± minute adjustments the
          // same way fetchPrayerTimes does, or the first paint disagrees with the next.
          const offsets = await getPrayerOffsets();
          const adjusted = applyOffsetsToData(cached.data, offsets);
          if (!_cache.fullData) {
            _cache.fullData = adjusted;
            setApiFullData(adjusted);
          }
          const today = getTodayPrayerTimes(adjusted);
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
      if (ramadanCalendarVisible) {
        setRamadanCalendarVisible(false);
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
    ramadanCalendarVisible,
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

  // Greeting reminders (Friday, kandil, eid) deep-link straight into the card creator.
  useEffect(() => {
    if (params.open === 'greeting') setGreetingVisible(true);
  }, [params.open, params.occasion]);

  useEffect(() => {
    (async () => {
      // A channel error must not stop the launch-count / onboarding logic below.
      try {
        await initNotifications();
      } catch (e) {
        console.warn('initNotifications failed:', e);
      }
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
          // Runs on every focus: read the top-level numeric "method" without parsing the
          // ~100 KB cache (nested Aladhan meta.method values are objects, not numbers).
          const match = cachedString.match(/"method":(\d+)/);
          if (match) {
            cachedMethod = Number(match[1]) || defaultRecommended;
          } else {
            try {
              cachedMethod = JSON.parse(cachedString).method || defaultRecommended;
            } catch { }
          }
        }

        if (cachedMethod !== methodNum || calcMethod !== methodNum) {
          setCalcMethod(methodNum);
          _cache.prayerTimes = null;
          if (locationResolved && location?.latitude && location?.longitude) {
            loadPrayerTimes(location.latitude, location.longitude);
          }
        }
      })();
    });

    return () => {
      unsubscribe();
    };
  }, [navigation, calcMethod, location, locationResolved]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('PRAYER_OFFSETS_CHANGED', () => {
      if (location?.latitude && location?.longitude) {
        _cache.prayerTimes = null;
        loadPrayerTimes(location.latitude, location.longitude);
      }
    });
    return () => sub.remove();
  }, [location]);

  // Run ambient background circle animations only when home tab (activeTab === 2) is active
  useEffect(() => {
    if (activeTab !== 2) {
      cancelAnimation(circle1X);
      cancelAnimation(circle1Y);
      cancelAnimation(circle2X);
      cancelAnimation(circle2Y);
      return;
    }

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

    return () => {
      cancelAnimation(circle1X);
      cancelAnimation(circle1Y);
      cancelAnimation(circle2X);
      cancelAnimation(circle2Y);
    };
  }, [activeTab]);

  const c1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: circle1X.value }, { translateY: circle1Y.value }],
  }));

  const c2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: circle2X.value }, { translateY: circle2Y.value }],
  }));

  useEffect(() => {
    // The pre-resolution location is a timezone guess (e.g. Istanbul for any Turkey
    // timezone); fetching for it shows another city's times until the real one loads.
    if (!locationResolved) return;
    if (location?.latitude && location?.longitude) {
      const sameLocation =
        _cache.lastLat === location.latitude &&
        _cache.lastLng === location.longitude &&
        _cache.lastLang === i18n.language;
      if (_cache.prayerTimes && sameLocation) return;
      loadPrayerTimes(location.latitude, location.longitude);
    }
  }, [location, locationResolved, i18n.language]);

  useEffect(() => {
    if (needsManualLocation && !locationLoading) setIsSearchVisible(true);
  }, [needsManualLocation, locationLoading]);

  // Sync Android Home Screen Widget and Persistent Status Bar / Lock Screen Notification
  useEffect(() => {
    if (!prayerTimes || !location?.city || !nextPrayerKey || !targetDate) return;

    // Runs from a setInterval: an exception here would be fatal in release builds.
    const doSync = () => {
      try {
        syncWidgetAndNotification();
      } catch (e) {
        console.warn('Widget/notification sync failed:', e);
      }
    };

    const syncWidgetAndNotification = () => {
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
    // Update every 60 seconds only while app is in foreground to save battery
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        doSync();
      }
    }, 60000);

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
    const seq = ++prayerLoadSeq.current;
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
      if (seq !== prayerLoadSeq.current) return;
      setIsEstimatedTimes(wasLastPrayerTimesFetchEstimated());
      setApiFullData(data);
      _cache.fullData = data;
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
      if (seq === prayerLoadSeq.current) setLoadingApi(false);
    }
  };

  const computePrayerState = (times: Record<string, string>) => {
    const now = new Date();
    const toDate = (timeStr: string) => {
      if (!timeStr) return new Date(NaN); // malformed day: compares false instead of throwing
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
    } catch {}
    if (location?.latitude && location?.longitude) {
      await loadPrayerTimes(location.latitude, location.longitude);
    }
    setRefreshing(false);
  }, [location]);

  // Stable so the memoized grid cards don't re-render on every home render.
  const handlePrayerLongPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOffsetPrayerKey(id as typeof PRAYER_KEYS[number]);
  }, []);

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

  // Only touches refs, setters and module-level helpers, so it can be stable.
  const navigateToPagerTab = useCallback((logicalIndex: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    pagerRef.current?.setPageWithoutAnimation(logicalIndex);
    setActiveTab(logicalIndex);
    _cache.activeTab = logicalIndex;
    const tabName = TABS[logicalIndex]?.id || `Tab_${logicalIndex}`;
    logTabChange(tabName, logicalIndex);
  }, []);
  const handleQiblaBack = useCallback(() => navigateToPagerTab(2), [navigateToPagerTab]);

  // Compact Next-gen Glassmorphic Header cards with Weather
  // API dates are "DD-MM-YYYY"; render as e.g. "24 Eylül Perşembe".
  const formatGregorianLong = (raw?: string) => {
    if (!raw) return '···';
    const [dd, mm, yyyy] = raw.split(',')[0].split('-').map(Number);
    if (!dd || !mm || !yyyy) return raw;
    const d = new Date(yyyy, mm - 1, dd);
    try {
      return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', weekday: 'long' });
    } catch {
      return raw;
    }
  };

  // The offline fallback fills hijri with placeholder values (month "Hijri");
  // show nothing rather than a wrong date.
  const formatHijri = (h: any): string | null => {
    if (!h?.day || !h?.month?.en || h.month.en === 'Hijri') return null;
    const num = Number(h.month.number);
    const name = num >= 1 && num <= 12 ? hijriMonthName(num) : h.month.en;
    return `${Number(h.day)} ${name} ${h.year}`;
  };

  const renderFeatureTile = (item: { key: string; icon: string; label: string; onPress: () => void }) => (
    <Pressable
      key={item.key}
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      style={({ pressed }) => [
        styles.quickFeatureTile,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.quickFeatureIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
        <Feather name={item.icon as any} size={18} color={theme.colors.primary} />
      </View>
      <Text numberOfLines={2} style={[styles.quickFeatureText, { color: theme.colors.text }]}>
        {item.label}
      </Text>
    </Pressable>
  );

  const renderHeaderSection = () => {
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
              {location?.city ?? t('search.title', 'Şehir Seç')}
            </Text>
            <Feather name="chevron-down" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>

          <View style={styles.headerIconGroup}>
            <Pressable
              style={[styles.headerCircleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setThemeModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.theme', 'Tema')}
              hitSlop={6}
            >
              <Feather name="aperture" size={16} color={theme.colors.text} />
            </Pressable>
            <Pressable
              style={[styles.headerCircleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.title', 'Ayarlar')}
              hitSlop={6}
            >
              <Feather name="settings" size={16} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Row 2: date (gregorian + hijri) and weather */}
        <View style={styles.headerGridRow}>
          <Pressable
            style={[styles.headerDateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setCalendarVisible(true)}
            accessibilityRole="button"
          >
            <View style={[styles.headerIconBadge, { backgroundColor: theme.colors.primaryLight }]}>
              <Feather name="calendar" size={15} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerDateMain, { color: theme.colors.text }]} numberOfLines={1}>
                {formatGregorianLong(gregorianDate?.date)}
              </Text>
              {!!formatHijri(hijriDate) && (
                <Text style={[styles.headerDateSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {formatHijri(hijriDate)}
                </Text>
              )}
            </View>
          </Pressable>

          {weather && (
            <Pressable
              style={[styles.headerWeatherCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
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
              <Feather name={getWeatherIcon(weather.code) as any} size={17} color={theme.colors.primary} />
              <Text style={[styles.weatherText, { color: theme.colors.text }]}>
                {formatDisplayTemp(weather.temp)}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Row 3: quick tools */}
        <View style={styles.headerGridRow}>
          {[
            { key: 'kaza', icon: 'check-square', label: t('kaza.shortTitle', 'Kaza'), onPress: () => setKazaVisible(true) },
            { key: 'greeting', icon: 'gift', label: t('greeting.shortTitle', 'Tebrik'), onPress: () => setGreetingVisible(true) },
            { key: 'mosques', icon: 'map-pin', label: t('mosques.shortTitle', 'Camiler'), onPress: () => setMosquesVisible(true) },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.headerActionBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name={item.icon as any} size={15} color={theme.colors.primary} />
              <Text style={[styles.headerActionText, { color: theme.colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
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

      {/* First-days battery optimization reminder (Android) */}
      <BatteryOptimizationCard />

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

      {/* Estimated (offline-calculated) prayer times disclosure */}
      {isEstimatedTimes && prayerTimes && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 12,
            marginBottom: 10,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FFF7E0',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : '#F5D98A',
          }}
        >
          <Feather name="alert-circle" size={14} color={theme.colors.primary} />
          <Text style={{ flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 12, color: theme.colors.textSecondary }}>
            {t('home.estimatedTimesNotice', 'İnternet bağlantısı olmadığı için vakitler cihaz üzerinde hesaplanmıştır (tahmini).')}
          </Text>
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
            isVisible={activeTab === 2}
          />
        </Animated.View>
      )}

      {/* Prayer Grid: all six in order; the highlighted one is the same prayer the hero counts down to */}
      {prayerTimes && (
        <Animated.View entering={FadeInDown.delay(160).duration(400).springify().damping(12)} style={styles.gridSectionSingle}>
          {PRAYER_KEYS.map((k) => (
            <View key={k} style={styles.compactCardWrapper}>
              <PrayerTimeCard
                id={k}
                name={t(`home.prayers.${k}`)}
                time={prayerTimes[k]}
                isActive={k === nextPrayerKey}
                isVisible={activeTab === 2}
                onLongPress={handlePrayerLongPress}
              />
            </View>
          ))}
        </Animated.View>
      )}

      {/* Long-press isn't discoverable on its own; hint at it during the first launches */}
      {prayerTimes && launchCount <= 10 && (
        <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: 11.5, color: theme.colors.textSecondary, textAlign: 'center', marginTop: -2, marginBottom: 10 }}>
          {t('offsetSheet.hint', 'Vakitlerde fark varsa karta uzun basıp düzeltebilirsiniz.')}
        </Text>
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

      {/* Banner ad: under the prayer times, right above the quick feature buttons.
          Loaded eagerly (lazy={false}) since most traffic stays on this screen. */}
      <Animated.View entering={FadeInDown.delay(185).duration(400).springify().damping(12)}>
        <BannerAdSlot placement="home" isVisible={activeTab === 2} lazy={false} />
      </Animated.View>

      {/* Quick Features: calendars (need prayer data) */}
      {prayerTimes && (
        <Animated.View
          entering={FadeInDown.delay(190).duration(400).springify().damping(12)}
          style={styles.quickFeaturesRow}
        >
          {[
            { key: 'imsakiye', icon: 'calendar', label: t('imsakiye.title', 'Haftalık İmsakiye'), onPress: () => setImsakiyeVisible(true) },
            { key: 'religious', icon: 'star', label: t('religious.title', 'Dini Günler'), onPress: () => setReligiousDaysVisible(true) },
            { key: 'ramadan', icon: 'moon', label: t('ramadan.calendarTitle', 'Ramazan İmsakiyesi'), onPress: () => setRamadanCalendarVisible(true) },
          ].map(renderFeatureTile)}
        </Animated.View>
      )}

      {/* Quick Features: guides and tools */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400).springify().damping(12)}
        style={styles.quickFeaturesRow}
      >
        {[
          { key: 'zakat', icon: 'percent', label: t('zakat.settingsEntry', 'Zekat Hesaplama'), onPress: () => router.push('/zakat-calculator') },
          { key: 'hajj', icon: 'map', label: t('hajjUmrah.settingsEntry', 'Hac & Umre Rehberi'), onPress: () => router.push('/hajj-umrah') },
          { key: 'achievements', icon: 'award', label: t('achievements.settingsEntry', 'Başarılarım'), onPress: () => router.push('/achievements') },
        ].map(renderFeatureTile)}
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

      {ramadanCalendarVisible && (
        <RamadanCalendarModal
          visible={ramadanCalendarVisible}
          onClose={() => setRamadanCalendarVisible(false)}
          latitude={location?.latitude ?? null}
          longitude={location?.longitude ?? null}
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
    <AnimatedTabBar
      tabs={TABS}
      activeTab={activeTab}
      onTabPress={navigateToPagerTab}
      bottom={TAB_BAR_BOTTOM}
      isLangTR={isLangTR}
      isDark={isDark}
      heroGradient={theme.colors.heroGradient as [string, string]}
      activeIconColor="#FFFFFF"
      inactiveColor={theme.colors.textSecondary}
      glowColor={theme.colors.glow}
      borderColor={isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.07)'}
      backgroundColor={isDark ? 'rgba(18, 18, 24, 0.72)' : 'rgba(255, 255, 255, 0.78)'}
    />
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
            <MemoQuranScreen isActive={activeTab === 0} />
          </LazyScreen>
        </View>

        <View key="1" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 1}>
            <MemoDailyContentScreen isActive={activeTab === 1} />
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
              isVisible={activeTab === 2}
            />
          ) : (
            <LazyScreen active={activeTab === 2}>
              {renderHomeContent()}
            </LazyScreen>
          )}
        </View>

        <View key="3" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 3}>
            <MemoTasbihScreen isActiveTab={activeTab === 3} />
          </LazyScreen>
        </View>

        <View key="4" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 4}>
            <MemoNamesAndDuasScreen isActive={activeTab === 4} />
          </LazyScreen>
        </View>

        <View key="5" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 5}>
            {/* Added onBack so Qibla screen can return to Home (index 2) */}
            <MemoQiblaScreen isActiveTab={activeTab === 5} onBack={handleQiblaBack} />
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

      <PrayerOffsetSheet
        prayerKey={offsetPrayerKey}
        prayerName={offsetPrayerKey ? t(`home.prayers.${offsetPrayerKey}`) : ''}
        time={offsetPrayerKey && prayerTimes ? prayerTimes[offsetPrayerKey] : ''}
        onClose={() => setOffsetPrayerKey(null)}
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
              const savedStr = await SecureLocationStorage.getItem('MANUAL_LOCATION');
              if (savedStr) {
                const saved = JSON.parse(savedStr);
                if (saved?.latitude && saved?.longitude && saved?.city) {
                  await saveManualLocation(saved.latitude, saved.longitude, saved.city);
                  handleCitySelected(saved.latitude, saved.longitude, saved.city);
                  return;
                }
              }
            } catch {}
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
        initialCategory={params.open === 'greeting' ? params.occasion : undefined}
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginRight: 12,
  },
  headerCityText: {
    flexShrink: 1,
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
  headerIconGroup: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: 8,
  },
  headerGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  headerDateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDateMain: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  headerDateSub: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginTop: 1,
  },
  headerWeatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 92,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  weatherText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  headerActionBox: {
    flex: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  headerActionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },

  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridSectionSingle: {
    flexDirection: 'row',
    gap: 5,
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
  // Same width and gap as the prayer grid above it, so the edges line up.
  quickFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 4,
    gap: 6,
  },
  quickFeatureTile: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  quickFeatureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickFeatureText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12.5,
    lineHeight: 16,
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
