import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Linking,
  NativeModules,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { CitySearchModal } from '../../components/CitySearchModal';
import { DailyContentScreen } from '../../components/DailyContentScreen';
import { NamesAndDuasScreen } from '../../components/NamesAndDuasScreen';
import { PrayerTimeCard } from '../../components/PrayerTimeCard';
import { AppBackground } from '../../components/ProgressRing';
import { TasbihScreen } from '../../components/TasbihScreen';
import { QuranScreen } from '../../components/QuranScreen';
import { AdBanner } from '../../components/AdBanner';
import { ScalePressable } from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../hooks/useLocation';
import { fetchPrayerTimes, getTodayPrayerTimes, fetchWeather, getWeatherEmoji, WeatherData, getWeatherDescription } from '../../services/api';
import {
  getNotificationPrefs,
  initNotifications,
  requestNotificationPermissions,
  schedulePrayerNotifications,
  scheduleTestNotification,
} from '../../services/notificationService';
import { spacing, typography, borderRadius } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const TABS = [
  { id: 'quran',  icon: 'book',      labelTR: 'Kuran',    labelEN: 'Quran'   },
  { id: 'daily',  icon: 'book-open', labelTR: 'İçerik',   labelEN: 'Content' },
  { id: 'home',   icon: 'home',      labelTR: 'Vakitler', labelEN: 'Times'   },
  { id: 'dhikr',  icon: 'heart',     labelTR: 'Zikir',    labelEN: 'Dhikr'   },
  { id: 'library',icon: 'bookmark',  labelTR: 'Dualar',   labelEN: 'Duas'    },
  { id: 'qibla',  icon: 'compass',   labelTR: 'Kıble',    labelEN: 'Qibla'   },
] as const;

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
  nextPrayerKey: '',
  activePrayerKey: '',
  lastLat: null,
  lastLng: null,
  lastLang: null,
  activePage: 3,
  activeTab: 2,
  weather: null,
};

const LazyScreen = React.memo(({ active, children }: { active: boolean; children: React.ReactNode }) => {
  const [shouldRender, setShouldRender] = useState(active);

  useEffect(() => {
    if (active && !shouldRender) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 350); // Delay slightly so swipe animation completes before mounting heavy screen
      return () => clearTimeout(timer);
    }
  }, [active, shouldRender]);

  if (!shouldRender) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E0A96D" />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_BOTTOM = Math.max(insets.bottom + 12, 12);
  const TAB_BAR_HEIGHT = 60;

  const { t, i18n } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();
  const { location, loading: locationLoading, needsManualLocation, saveManualLocation } = useLocation();
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

  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(_cache.activeTab);

  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(true);
  const [calcMethod, setCalcMethod] = useState<number>(13);

  const navigation = useNavigation();

  // Background floating circles animated values
  const circle1X = useSharedValue(-30);
  const circle1Y = useSharedValue(60);
  const circle2X = useSharedValue(120);
  const circle2Y = useSharedValue(320);

  useEffect(() => {
    (async () => {
      await initNotifications();
      const { status } = await Notifications.getPermissionsAsync();
      setHasNotifPermission(status === 'granted');
    })();

    const unsubscribe = navigation.addListener('focus', () => {
      (async () => {
        const saved = await AsyncStorage.getItem('PRAYER_CALCULATION_METHOD');
        const methodNum = saved ? parseInt(saved, 10) : 13;
        
        const cachedString = await AsyncStorage.getItem('PRAYER_TIMES_CACHE');
        let cachedMethod = 13;
        if (cachedString) {
          try {
            cachedMethod = JSON.parse(cachedString).method || 13;
          } catch {}
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

        // Dispatch data updates to Android Widget
        if (Platform.OS === 'android') {
          try {
            const { PrayerWidgetModule } = NativeModules;
            if (PrayerWidgetModule) {
              const now = new Date();
              const toDate = (timeStr: string) => {
                const [h, m] = timeStr.split(':');
                const d = new Date();
                d.setHours(+h, +m, 0, 0);
                return d;
              };
              const ordered = PRAYER_KEYS.map((k) => ({ id: k, date: toDate(today[k]) }));
              let nextIdx = ordered.findIndex((p) => p.date > now);
              if (nextIdx === -1) nextIdx = 0;
              const nextKey = ordered[nextIdx].id;

              PrayerWidgetModule.updateWidgetData(JSON.stringify({
                city: location?.city || "Vera",
                nextPrayerName: t(`home.prayers.${nextKey}`),
                nextPrayerTime: today[nextKey],
                hijriDate: today.hijri ? `${today.hijri.day} ${today.hijri.month.en} ${today.hijri.year}` : ""
              }));
            }
          } catch (widgetError) {
            console.error('Error updating Android Widget:', widgetError);
          }
        }
      }
      const hasPermission = await requestNotificationPermissions();
      setHasNotifPermission(hasPermission);
      if (hasPermission) {
        const prefs = await getNotificationPrefs();
        await schedulePrayerNotifications(data, prefs, t);
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

  const handleTimeReached = useCallback(() => {
    if (location?.latitude && location?.longitude) {
      loadPrayerTimes(location.latitude, location.longitude);
    }
  }, [location]);

  const handlePageSelected = (e: any) => {
    const pos = e.nativeEvent.position;
    setActiveTab(pos);
    _cache.activeTab = pos;
  };

  const navigateToPagerTab = (logicalIndex: number) => {
    if (logicalIndex === 5) {
      router.push('/qibla' as any);
      return;
    }
    pagerRef.current?.setPage(logicalIndex);
    setActiveTab(logicalIndex);
    _cache.activeTab = logicalIndex;
  };

  if (locationLoading || (loadingApi && !needsManualLocation)) {
    return (
      <AppBackground isDark={isDark} nextPrayerKey={nextPrayerKey}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </AppBackground>
    );
  }

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

        {/* Row 2: Large Dates & Weather widget */}
        <View style={styles.headerBottomRow}>
          <View style={styles.headerDateBox}>
            <Text style={[styles.headerDateMain, { color: theme.colors.text }]} numberOfLines={1}>
              {gregorianDate?.date ? gregorianDate.date.split(',')[0] : '···'}
            </Text>
            <Text style={[styles.headerDateSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {hijriDate ? `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year}` : '···'}
            </Text>
          </View>

          {/* Dynamic weather card */}
          {weather && (
            <Pressable
              style={[styles.headerWeatherBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
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
                {getWeatherEmoji(weather.code)} {weather.temp}°C
              </Text>
              <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {getWeatherDescription(weather.code, i18n.language)}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderHomeContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.homeContent, { paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen} />

      {/* Header Cards Row */}
      {renderHeaderSection()}



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

      {/* Ad Banner (Visible directly in fold without scrolling) */}
      <Animated.View entering={FadeInDown.delay(220).duration(400).springify().damping(12)}>
        <AdBanner />
      </Animated.View>
    </ScrollView>
  );

  const renderTabBar = () => (
    <View style={[styles.tabBarWrapper, { bottom: TAB_BAR_BOTTOM }]} pointerEvents="box-none">
      <BlurView
        intensity={isDark ? 55 : 75}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.tabBarBlur, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
      >
        {TABS.map((tab, idx) => {
          const isActive = activeTab === idx;
          return (
            <ScalePressable
              key={tab.id}
              style={styles.tabItem}
              onPress={() => navigateToPagerTab(idx)}
            >
              {isActive ? (
                <Animated.View entering={FadeInDown.duration(300).springify()}>
                  <LinearGradient
                    colors={theme.colors.heroGradient as [string, string]}
                    style={styles.tabActiveBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Feather name={tab.icon as any} size={18} color="#FFF" />
                  </LinearGradient>
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
          {renderHomeContent()}
        </View>

        <View key="3" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 3}>
            <TasbihScreen />
          </LazyScreen>
        </View>

        <View key="4" style={{ flex: 1 }}>
          <LazyScreen active={activeTab === 4}>
            <NamesAndDuasScreen />
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
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerDateBox: {
    justifyContent: 'center',
  },
  headerDateMain: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  headerDateSub: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  headerWeatherBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    minWidth: 84,
  },
  weatherText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  weatherLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    marginTop: 1,
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

  // Floating Tab Bar
  tabBarWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 60,
  },
  tabBarBlur: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  tabActiveBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    width: 40,
    height: 40,
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
});
