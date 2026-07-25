import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '../components/ProgressRing';
import { useTheme } from '../context/ThemeContext';
import { AdBanner } from '../components/AdBanner';
import { fetchWeatherForecast, ForecastDay, getWeatherDescription, getWeatherEmoji } from '../services/api';
import { spacing, typography } from '../utils/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const getLocalizedWeatherText = (lang: string) => {
  const cleanLang = lang.split('-')[0].toLowerCase();
  
  const translations: Record<string, {
    title: string;
    error: string;
    high: string;
    low: string;
    today: string;
    forecast5Day: string;
  }> = {
    en: { title: 'Weather Forecast', error: 'Failed to load weather forecast.', high: 'High', low: 'Low', today: 'Today', forecast5Day: '5-Day Forecast' },
    tr: { title: 'Hava Durumu', error: 'Hava durumu verisi yüklenemedi.', high: 'En Yüksek', low: 'En Düşük', today: 'Bugün', forecast5Day: '5 Günlük Tahmin' },
    ar: { title: 'توقعات الطقس', error: 'فشل تحميل توقعات الطقس.', high: 'العظمى', low: 'الصغرى', today: 'اليوم', forecast5Day: 'توقعات 5 أيام' },
    es: { title: 'Pronóstico del Clima', error: 'Error al cargar el pronóstico.', high: 'Máx', low: 'Mín', today: 'Hoy', forecast5Day: 'Pronóstico de 5 días' },
    fr: { title: 'Prévisions Météo', error: 'Échec du chargement de la météo.', high: 'Max', low: 'Min', today: "Aujourd'hui", forecast5Day: 'Prévisions sur 5 jours' },
    id: { title: 'Perkiraan Cuaca', error: 'Gagal memuat perkiraan cuaca.', high: 'Maks', low: 'Min', today: 'Hari Ini', forecast5Day: 'Perkiraan 5 Hari' },
    ur: { title: 'موسم کی پیش گوئی', error: 'موسم کی پیش گوئی لوڈ کرنے میں ناکام۔', high: 'زیادہ سے زیادہ', low: 'کم سے کم', today: 'آج', forecast5Day: '5 دن کی پیش گوئی' },
    fa: { title: 'پیش‌بینی هوا', error: 'خطا در بارگذاری پیش‌بینی هوا.', high: 'بیشترین', low: 'کمترین', today: 'امروز', forecast5Day: 'پیش‌بینی ۵ روزه' },
    ru: { title: 'Прогноз погоды', error: 'Не удалось загрузить прогноз погоды.', high: 'Макс', low: 'Мин', today: 'Сегодня', forecast5Day: 'Прогноз на 5 дней' },
    bn: { title: 'আবহাওয়ার পূর্বাভাস', error: 'আবহাওয়ার পূর্বাভাস লোড করা যায়নি।', high: 'সর্বোচ্চ', low: 'সর্বনিম্ন', today: 'আজ', forecast5Day: '৫ দিনের পূর্বাভাস' },
    ms: { title: 'Ramalan Cuaca', error: 'Gagal memuat ramalan cuaca.', high: 'Maks', low: 'Min', today: 'Hari Ini', forecast5Day: 'Ramalan 5 Hari' },
    ha: { title: 'Hasashen Yanayi', error: 'An kasa samun bayanan yanayi.', high: 'Mafi Yawa', low: 'Mafi Karanci', today: 'Yau', forecast5Day: 'Hasashen Kwanaki 5' },
    sw: { title: 'Utabiri wa Hali ya Hewa', error: 'Imeshindwa kupakia utabiri wa hewa.', high: 'Juu', low: 'Chini', today: 'Leo', forecast5Day: 'Utabiri wa Siku 5' },
    de: { title: 'Wettervorhersage', error: 'Wettervorhersage konnte nicht geladen werden.', high: 'Max', low: 'Min', today: 'Heute', forecast5Day: '5-Tage-Vorhersage' },
  };

  return translations[cleanLang] || translations.en;
};

export default function WeatherScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const strings = getLocalizedWeatherText(i18n.language);

  const lat = params.lat ? Number(params.lat) : null;
  const lng = params.lng ? Number(params.lng) : null;
  const city = params.city ? String(params.city) : '';

  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);

  useEffect(() => {
    if (lat && lng) {
      setLoading(true);
      fetchWeatherForecast(lat, lng)
        .then((data) => setForecast(data))
        .finally(() => setLoading(false));
    }
  }, [lat, lng]);

  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const formatDayName = (dateStr: string, index: number) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (index === 0 || date.toDateString() === today.toDateString()) {
        return strings.today;
      }
      return date.toLocaleDateString(i18n.language, { weekday: 'long' });
    } catch {
      return dateStr;
    }
  };

  // Sıcaklık barı için min/max hesaplama (göreceli uzunluk)
  const allTemps = forecast.flatMap((d) => [d.maxTemp, d.minTemp]);
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const tempRange = globalMax - globalMin || 1;

  const getTempBarWidth = (min: number, max: number) => {
    const ratio = (max - min) / tempRange;
    return Math.max(0.15, Math.min(1, ratio)) * 100;
  };

  const current = forecast[0];

  // Renkler
  const bg = isDark ? '#0F0F17' : '#F5F5F9';
  const cardBg = isDark ? 'rgba(255,255,255,0.15)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A24';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,36,0.6)';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,36,0.4)';

  return (
    <AppBackground isDark={isDark}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} hidden={isFullscreen} />
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={textPrimary} />
          </Pressable>
          <View style={styles.headerTextBox}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {strings.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>{city}</Text>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : forecast.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              {strings.error}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* ── Hero Card ── */}
            {current && (
              <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroWrapper}>
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']
                      : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.heroCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                >
                  <Text style={styles.heroEmoji}>{getWeatherEmoji(current.code)}</Text>
                  <Text style={[styles.heroTemp, { color: textPrimary }]}>
                    {current.maxTemp}
                    <Text style={styles.heroTempUnit}>°C</Text>
                  </Text>
                  <Text style={[styles.heroDesc, { color: textSecondary }]}>
                    {getWeatherDescription(current.code, i18n.language)}
                  </Text>

                  <View style={styles.heroRangeRow}>
                    <View style={[styles.rangePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Text style={[styles.rangeLabel, { color: textSecondary }]}>
                        {strings.high}
                      </Text>
                      <Text style={[styles.rangeValue, { color: textPrimary }]}>{current.maxTemp}°</Text>
                    </View>
                    <View style={[styles.rangePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Text style={[styles.rangeLabel, { color: textSecondary }]}>
                        {strings.low}
                      </Text>
                      <Text style={[styles.rangeValue, { color: textPrimary }]}>{current.minTemp}°</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Live AdMob Native Ad */}
            <AdBanner />

            {/* ── 5-Day Forecast ── */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.forecastSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  {strings.forecast5Day}
                </Text>
                <View style={[styles.sectionLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
              </View>

              <View style={styles.forecastList}>
                {forecast.slice(0, 5).map((item, idx) => {
                  const isToday = idx === 0;
                  const barWidth = getTempBarWidth(item.minTemp, item.maxTemp);

                  return (
                    <Animated.View
                      key={item.date}
                      entering={FadeInUp.delay(250 + idx * 60).duration(400)}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.forecastRow,
                          {
                            backgroundColor: isToday
                              ? isDark
                                ? 'rgba(255,255,255,0.25)'
                                : 'rgba(255,255,255,0.95)'
                              : cardBg,
                            borderColor: isToday
                              ? isDark
                                ? 'rgba(255,255,255,0.4)'
                                : 'rgba(0,0,0,0.12)'
                              : cardBorder,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        {/* Day */}
                        <View style={styles.dayCell}>
                          <Text style={[styles.dayText, { color: textPrimary }]} numberOfLines={1}>
                            {formatDayName(item.date, idx)}
                          </Text>
                          {isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>{isLangTR ? 'BUGÜN' : 'TODAY'}</Text>
                            </View>
                          )}
                        </View>

                        {/* Condition */}
                        <View style={styles.conditionCell}>
                          <Text style={styles.forecastEmoji}>{getWeatherEmoji(item.code)}</Text>
                          <Text style={[styles.forecastDesc, { color: textSecondary }]} numberOfLines={1}>
                            {getWeatherDescription(item.code, i18n.language)}
                          </Text>
                        </View>

                        {/* Temp Bar */}
                        <View style={styles.barCell}>
                          <View style={[styles.tempBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                            <LinearGradient
                              colors={['#6366f1', '#a855f7']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.tempBarFill, { width: `${barWidth}%` }]}
                            />
                          </View>
                        </View>

                        {/* Temps */}
                        <View style={styles.tempsCell}>
                          <Text style={[styles.tempHigh, { color: textPrimary }]}>{item.maxTemp}°</Text>
                          <Text style={[styles.tempLow, { color: textMuted }]}>{item.minTemp}°</Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: typography.fontFamily.medium, fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBox: { marginLeft: spacing.md },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginTop: 2,
  },

  // Content
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 40,
  },

  // Hero
  heroWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 32,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 12,
    // iOS'ta gölge için textShadow kullanabilirsin:
    textShadowColor: 'rgba(251,191,36,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  heroTemp: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 56,
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroTempUnit: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  heroDesc: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 18,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  heroRangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  rangeLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  rangeValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },

  // Section
  forecastSection: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  // Forecast List
  forecastList: { gap: 10 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  dayCell: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    flexShrink: 0,
    gap: 6,
  },
  dayText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  todayBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  conditionCell: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  forecastEmoji: { fontSize: 26 },
  forecastDesc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    flex: 1,
  },
  barCell: {
    width: 50,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  tempBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tempBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  tempsCell: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  tempHigh: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  tempLow: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
});