import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { formatTime } from '../utils/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeatherEmoji, WeatherData, DayData } from '../services/api';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { WeeklyImsakiyeModal } from './WeeklyImsakiyeModal';
import { UnifiedCalendarModal } from './UnifiedCalendarModal';
import { ReligiousDaysModal } from './ReligiousDaysModal';
import { WidgetPromoModal } from './WidgetPromoModal';
import { ThemeSelectionModal } from './ThemeSelectionModal';
import { KazaTrackerModal } from './KazaTrackerModal';
import { GreetingCardModal } from './GreetingCardModal';
import { NearbyMosquesModal } from './NearbyMosquesModal';
import { AdBanner } from './AdBanner';
import { ScalePressable } from './ScalePressable';
import { requestPinWidget } from '../services/widgetService';

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
type PrayerKey = typeof PRAYER_KEYS[number];

const PRAYER_ICON: Record<PrayerKey, keyof typeof Feather.glyphMap> = {
  fajr: 'moon',
  sunrise: 'sunrise',
  dhuhr: 'sun',
  asr: 'sun',
  maghrib: 'sunset',
  isha: 'star',
};

export interface SimpleHomeScreenProps {
  prayerTimes: Record<string, string> | null;
  nextPrayerKey: string;
  activePrayerKey: string;
  targetDate: Date | null;
  hijriDate: any;
  gregorianDate: any;
  weather: WeatherData | null;
  location: { city?: string; latitude?: number; longitude?: number } | null;
  apiFullData: DayData[];
  onCityPress: () => void;
  onHomeStyleChange?: (style: 'default' | 'simple') => void;
}

export const SimpleHomeScreen: React.FC<SimpleHomeScreenProps> = ({
  prayerTimes,
  nextPrayerKey,
  activePrayerKey,
  targetDate,
  hijriDate,
  gregorianDate,
  weather,
  location,
  apiFullData,
  onCityPress,
  onHomeStyleChange,
}) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { theme, isDark, timeFormat, setTimeFormat } = useTheme();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  // Modals state
  const [imsakiyeVisible, setImsakiyeVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [religiousDaysVisible, setReligiousDaysVisible] = useState(false);
  const [widgetPromoVisible, setWidgetPromoVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [kazaModalVisible, setKazaModalVisible] = useState(false);
  const [greetingModalVisible, setGreetingModalVisible] = useState(false);
  const [mosquesModalVisible, setMosquesModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('TEMP_UNIT').then((saved) => {
      if (saved === 'F' || saved === 'C') {
        setTempUnit(saved as 'C' | 'F');
      }
    });
  }, []);

  const formatDisplayTemp = useCallback((celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  }, [tempUnit]);

  // Live countdown
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
        return;
      }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: (Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight ?? 24)) + 14,
          paddingBottom: insets.bottom + 95,
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          {/* City */}
          <Pressable style={styles.cityBtn} onPress={onCityPress}>
            <View style={[styles.cityPinWrap, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(5, 150, 105, 0.12)' }]}>
              <Feather name="map-pin" size={13} color={theme.colors.primary} />
            </View>
            <Text style={[styles.cityText, { color: theme.colors.text }]} numberOfLines={1}>
              {location?.city ?? (isLangTR ? 'Şehir Seç' : 'Select City')}
            </Text>
            <Feather name="chevron-down" size={13} color={theme.colors.textSecondary} />
          </Pressable>

          {/* Right Action Icons */}
          <View style={styles.headerRight}>
            {/* Quick Greeting Card */}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: borderCol }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                setGreetingModalVisible(true);
              }}
            >
              <Ionicons name="sparkles" size={15} color="#D4AF37" />
            </Pressable>

            {/* Quick Kaza */}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: borderCol }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                setKazaModalVisible(true);
              }}
            >
              <Ionicons name="bookmark-outline" size={15} color={theme.colors.primary} />
            </Pressable>

            {/* Theme */}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: borderCol }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                setThemeModalVisible(true);
              }}
            >
              <Ionicons name="color-palette-outline" size={15} color={theme.colors.textSecondary} />
            </Pressable>

            {/* Settings */}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: borderCol }]}
              onPress={() => router.push('/settings')}
            >
              <Feather name="settings" size={15} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── INFO BAR: Date · Time Format · Weather ── */}
        <View style={styles.infoBar}>
          {/* Date */}
          <Pressable
            style={[styles.infoChip, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => setCalendarVisible(true)}
          >
            <Feather name="calendar" size={12} color={theme.colors.primary} />
            <Text style={[styles.infoChipText, { color: theme.colors.text }]} numberOfLines={1}>
              {gregorianDate?.date ? gregorianDate.date.split(',')[0] : '···'}
              {hijriDate ? `  ·  ${hijriDate.day} ${hijriDate.month?.en ?? ''}` : ''}
            </Text>
          </Pressable>

          {/* Time format (12h / 24h) */}
          <Pressable
            style={[styles.infoChip, { backgroundColor: cardBg, borderColor: borderCol, flex: 0, paddingHorizontal: 10 }]}
            onPress={() => setTimeFormat(timeFormat === '12h' ? '24h' : '12h')}
          >
            <Feather name="clock" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.infoChipText, { color: theme.colors.text, flex: 0 }]}>
              {timeFormat === '12h' ? '12h' : '24h'}
            </Text>
          </Pressable>

          {/* Weather */}
          <Pressable
            style={[styles.infoChip, { backgroundColor: cardBg, borderColor: borderCol, flex: 0, paddingHorizontal: 10 }]}
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
            <Text style={{ fontSize: 13 }}>{weather ? getWeatherEmoji(weather.code) : '🌤️'}</Text>
            <Text style={[styles.infoChipText, { color: theme.colors.text, flex: 0 }]}>
              {weather ? formatDisplayTemp(weather.temp) : '--°'}
            </Text>
          </Pressable>
        </View>

        {/* ── NEXT PRAYER HERO CARD ── */}
        {prayerTimes && nextPrayerKey && (
          <View style={[styles.heroCard, { backgroundColor: isDark ? 'rgba(212,175,55,0.10)' : 'rgba(5,150,105,0.07)', borderColor: isDark ? 'rgba(212,175,55,0.25)' : 'rgba(5,150,105,0.2)' }]}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>
                  {t('home.nextPrayer', 'Sıradaki Vakit')}
                </Text>
                <Text style={[styles.heroPrayerName, { color: theme.colors.primary }]}>
                  {t(`home.prayers.${nextPrayerKey}`)}
                </Text>
              </View>

              <Text style={[styles.heroPrayerTime, { color: theme.colors.text }]}>
                {formatTime(prayerTimes[nextPrayerKey], timeFormat)}
              </Text>
            </View>

            {/* Countdown */}
            <View style={[styles.cdRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)' }]}>
              <Feather name="clock" size={13} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.cdText, { color: theme.colors.textSecondary }]}>
                {t('home.remaining', 'Kalan Süre')}:{' '}
              </Text>
              <Text style={[styles.cdValue, { color: theme.colors.text }]}>
                {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
              </Text>
            </View>
          </View>
        )}

        {/* ── PRAYER TIME LIST ── */}
        {prayerTimes && (
          <View style={styles.prayerList}>
            {PRAYER_KEYS.map((key) => {
              const isActive = key === activePrayerKey;
              const isNext = key === nextPrayerKey;
              return (
                <View
                  key={key}
                  style={[
                    styles.prayerRow,
                    {
                      backgroundColor: isActive ? (isDark ? 'rgba(212,175,55,0.14)' : 'rgba(5,150,105,0.08)') : cardBg,
                      borderColor: isActive ? theme.colors.primary : borderCol,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isActive ? theme.colors.primary : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }]}>
                    <Feather name={PRAYER_ICON[key]} size={14} color={isActive ? '#FFFFFF' : theme.colors.textSecondary} />
                  </View>

                  <Text style={[styles.prayerName, { color: isActive ? theme.colors.text : theme.colors.textSecondary }, isActive && styles.bold]}>
                    {t(`home.prayers.${key}`)}
                  </Text>

                  <View style={styles.badgeRow}>
                    {isActive && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.badgeText}>{t('home.active', 'Şimdi')}</Text>
                      </View>
                    )}
                    {isNext && !isActive && (
                      <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{t('home.next', 'Sonraki')}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.prayerTime, { color: isActive ? theme.colors.primary : theme.colors.text }, isActive && styles.bold]}>
                    {formatTime(prayerTimes[key], timeFormat)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 6-GRID FEATURE QUICK SHORTCUTS ── */}
        <View style={styles.quickGrid}>
          {/* 1. Kaza Takipçisi */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setKazaModalVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(212,175,55,0.14)' }]}>
              <Ionicons name="bookmark" size={16} color="#D4AF37" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('kaza.shortTitle', 'Kaza Takibi')}
            </Text>
          </ScalePressable>

          {/* 2. Tebrik Kartı */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setGreetingModalVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(244,63,94,0.14)' }]}>
              <Ionicons name="sparkles" size={16} color="#F43F5E" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('greeting.shortTitle', 'Tebrik Kartı')}
            </Text>
          </ScalePressable>

          {/* 3. Yakındaki Camiler */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setMosquesModalVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(16,185,129,0.14)' }]}>
              <Ionicons name="navigate" size={16} color="#10B981" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('mosques.shortTitle', 'Camiler')}
            </Text>
          </ScalePressable>

          {/* 4. Haftalık İmsakiye */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setImsakiyeVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(59,130,246,0.14)' }]}>
              <Feather name="calendar" size={16} color="#3B82F6" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('imsakiye.title', 'İmsakiye')}
            </Text>
          </ScalePressable>

          {/* 5. Dini Günler */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setReligiousDaysVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(168,85,247,0.14)' }]}>
              <Feather name="moon" size={16} color="#A855F7" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('religious.title', 'Dini Günler')}
            </Text>
          </ScalePressable>

          {/* 6. Bütüncül Takvim */}
          <ScalePressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setCalendarVisible(true);
            }}
            style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(14,165,233,0.14)' }]}>
              <Feather name="grid" size={16} color="#0EA5E9" />
            </View>
            <Text style={[styles.quickText, { color: theme.colors.text }]} numberOfLines={1}>
              {t('calendar.title', 'Takvim')}
            </Text>
          </ScalePressable>
        </View>

        {/* ── AD BANNER ── */}
        <AdBanner />
      </ScrollView>

      {/* ── ALL MODALS ── */}
      {imsakiyeVisible && (
        <WeeklyImsakiyeModal
          visible={imsakiyeVisible}
          onClose={() => setImsakiyeVisible(false)}
          data={apiFullData}
          cityName={location?.city ?? 'İstanbul'}
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

      {kazaModalVisible && (
        <KazaTrackerModal
          visible={kazaModalVisible}
          onClose={() => setKazaModalVisible(false)}
        />
      )}

      {greetingModalVisible && (
        <GreetingCardModal
          visible={greetingModalVisible}
          onClose={() => setGreetingModalVisible(false)}
        />
      )}

      {mosquesModalVisible && (
        <NearbyMosquesModal
          visible={mosquesModalVisible}
          onClose={() => setMosquesModalVisible(false)}
          latitude={location?.latitude ?? null}
          longitude={location?.longitude ?? null}
          currentCity={location?.city}
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
          onHomeStyleChange={onHomeStyleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cityPinWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoChipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
  },
  heroCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroPrayerName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
  },
  heroPrayerTime: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 26,
  },
  cdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  cdText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
  },
  cdValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  prayerList: {
    gap: 6,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prayerName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    flex: 1,
  },
  badgeRow: {
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  prayerTime: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  bold: {
    fontFamily: 'Outfit_700Bold',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  quickBtn: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});