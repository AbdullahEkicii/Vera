import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { AppBackground } from '../components/ProgressRing';
import { useTheme } from '../context/ThemeContext';
import { AdBanner } from '../components/AdBanner';
import {
  DetailedWeatherData,
  fetchDetailedWeather,
  getWeatherDescription,
  getWeatherEmoji,
} from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

export default function WeatherScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark, isFullscreen } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const lat = params.lat ? Number(params.lat) : null;
  const lng = params.lng ? Number(params.lng) : null;
  const city = params.city ? String(params.city) : '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherData, setWeatherData] = useState<DetailedWeatherData | null>(null);
  const [unit, setUnit] = useState<'C' | 'F'>('C');

  useEffect(() => {
    AsyncStorage.getItem('TEMP_UNIT').then((saved) => {
      if (saved === 'F' || saved === 'C') {
        setUnit(saved as 'C' | 'F');
      }
    });
  }, []);

  const toggleUnit = (newUnit: 'C' | 'F') => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setUnit(newUnit);
    AsyncStorage.setItem('TEMP_UNIT', newUnit);
  };

  const convertTemp = (celsius: number) => {
    if (unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return celsius;
  };

  const loadData = useCallback(async () => {
    if (!lat || !lng) return;
    try {
      const data = await fetchDetailedWeather(lat, lng);
      setWeatherData(data);
    } catch (e) {
      console.warn('Weather load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    await loadData();
  }, [loadData]);

  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const formatDayName = (dateStr: string, index: number) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (index === 0 || date.toDateString() === today.toDateString()) {
        return t('weather.today', 'Bugün');
      }
      return date.toLocaleDateString(i18n.language, { weekday: 'long' });
    } catch {
      return dateStr;
    }
  };

  const forecast = weatherData?.daily || [];
  const allTemps = forecast.flatMap((d) => [d.maxTemp, d.minTemp]);
  const globalMin = allTemps.length > 0 ? Math.min(...allTemps) : 0;
  const globalMax = allTemps.length > 0 ? Math.max(...allTemps) : 35;
  const tempRange = globalMax - globalMin || 1;

  const getTempBarWidth = (min: number, max: number) => {
    const ratio = (max - min) / tempRange;
    return Math.max(0.18, Math.min(1, ratio)) * 100;
  };

  const current = weatherData;
  const cardBg = isDark ? 'rgba(30, 22, 12, 0.75)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(0,0,0,0.06)';
  const textPrimary = isDark ? '#FDF8ED' : '#1A1A24';
  const textSecondary = isDark ? 'rgba(253, 248, 237, 0.65)' : 'rgba(26,26,36,0.6)';

  return (
    <AppBackground isDark={isDark}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} hidden={isFullscreen} />
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={textPrimary} />
          </Pressable>
          <View style={styles.headerTextBox}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {t('weather.title', 'Hava Durumu')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: textSecondary }]} numberOfLines={1}>
              {city}
            </Text>
          </View>

          {/* Unit Toggle */}
          <View style={[styles.unitToggleContainer, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(0,0,0,0.06)', borderColor: cardBorder }]}>
            <Pressable
              onPress={() => toggleUnit('C')}
              style={[
                styles.unitToggleBtn,
                unit === 'C' && { backgroundColor: '#D4AF37' },
              ]}
            >
              <Text style={[styles.unitToggleText, { color: unit === 'C' ? '#1A1207' : textSecondary, fontWeight: unit === 'C' ? '700' : '500' }]}>°C</Text>
            </Pressable>
            <Pressable
              onPress={() => toggleUnit('F')}
              style={[
                styles.unitToggleBtn,
                unit === 'F' && { backgroundColor: '#D4AF37' },
              ]}
            >
              <Text style={[styles.unitToggleText, { color: unit === 'F' ? '#1A1207' : textSecondary, fontWeight: unit === 'F' ? '700' : '500' }]}>°F</Text>
            </Pressable>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : !weatherData ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              {t('weather.error', 'Hava durumu verisi yüklenemedi.')}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#D4AF37"
                colors={['#D4AF37']}
              />
            }
          >
            {/* Hero Card */}
            <Animated.View entering={FadeInDown.delay(60).duration(450)} style={styles.heroWrapper}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(42, 31, 19, 0.9)', 'rgba(26, 18, 7, 0.85)']
                    : ['rgba(255, 255, 255, 0.95)', 'rgba(245, 240, 230, 0.9)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, { borderColor: cardBorder }]}
              >
                <Text style={styles.heroEmoji}>{getWeatherEmoji(weatherData.code)}</Text>
                <Text style={[styles.heroTemp, { color: textPrimary }]}>
                  {convertTemp(weatherData.temp)}
                  <Text style={styles.heroTempUnit}>°{unit}</Text>
                </Text>
                <Text style={[styles.heroDesc, { color: textSecondary }]}>
                  {getWeatherDescription(weatherData.code, i18n.language)}
                </Text>

                {/* Range and Feels Like Row */}
                <View style={styles.heroRangeRow}>
                  {forecast[0] && (
                    <View style={[styles.rangePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Feather name="arrow-up" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.rangeLabel, { color: textSecondary }]}>{t('weather.high', 'Yüksek')}:</Text>
                      <Text style={[styles.rangeValue, { color: textPrimary }]}>{convertTemp(forecast[0].maxTemp)}°</Text>
                    </View>
                  )}
                  {forecast[0] && (
                    <View style={[styles.rangePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <Feather name="arrow-down" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={[styles.rangeLabel, { color: textSecondary }]}>{t('weather.low', 'Düşük')}:</Text>
                      <Text style={[styles.rangeValue, { color: textPrimary }]}>{convertTemp(forecast[0].minTemp)}°</Text>
                    </View>
                  )}
                  <View style={[styles.rangePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Feather name="thermometer" size={12} color="#D4AF37" style={{ marginRight: 4 }} />
                    <Text style={[styles.rangeLabel, { color: textSecondary }]}>{t('weather.feelsLike', 'Hissedilen')}:</Text>
                    <Text style={[styles.rangeValue, { color: textPrimary }]}>{convertTemp(weatherData.feelsLike)}°</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* 24-Hour Hourly Forecast Section */}
            {weatherData.hourly && weatherData.hourly.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <Feather name="clock" size={15} color="#D4AF37" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                    {t('weather.hourlyTitle', '24 Saatlik Tahmin')}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
                  {weatherData.hourly.map((h, idx) => (
                    <View
                      key={`${h.time}-${idx}`}
                      style={[
                        styles.hourlyCard,
                        { backgroundColor: cardBg, borderColor: cardBorder },
                        idx === 0 && { borderColor: 'rgba(212, 175, 55, 0.6)', backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.08)' }
                      ]}
                    >
                      <Text style={[styles.hourlyTime, { color: textSecondary }]}>
                        {idx === 0 ? t('weather.today', 'Şimdi') : h.time}
                      </Text>
                      <Text style={styles.hourlyEmoji}>{getWeatherEmoji(h.code)}</Text>
                      <Text style={[styles.hourlyTemp, { color: textPrimary }]}>
                        {convertTemp(h.temp)}°
                      </Text>
                      {h.pop > 0 && (
                        <View style={styles.hourlyPopBadge}>
                          <Ionicons name="water" size={10} color="#60A5FA" style={{ marginRight: 2 }} />
                          <Text style={styles.hourlyPopText}>%{h.pop}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* Detailed Weather Metrics Grid */}
            <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.sectionWrap}>
              <View style={styles.metricsGrid}>
                {/* Humidity */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.metricHeaderRow}>
                    <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="water-outline" size={16} color="#3B82F6" />
                    </View>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>{t('weather.humidity', 'Nem Oranı')}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textPrimary }]}>%{weatherData.humidity}</Text>
                </View>

                {/* Wind Speed */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.metricHeaderRow}>
                    <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Feather name="wind" size={16} color="#10B981" />
                    </View>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>{t('weather.wind', 'Rüzgar')}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textPrimary }]}>{weatherData.windSpeed} {t('weather.kmh', 'km/sa')}</Text>
                </View>

                {/* UV Index */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.metricHeaderRow}>
                    <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Feather name="sun" size={16} color="#F59E0B" />
                    </View>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>{t('weather.uvIndex', 'UV İndeksi')}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textPrimary }]}>{weatherData.uvIndex}</Text>
                </View>

                {/* Pressure */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.metricHeaderRow}>
                    <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Feather name="compass" size={16} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.metricLabel, { color: textSecondary }]}>{t('weather.pressure', 'Basınç')}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textPrimary }]}>{weatherData.pressure} {t('weather.hpa', 'hPa')}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Sunrise & Sunset Card */}
            <Animated.View entering={FadeInDown.delay(220).duration(450)} style={[styles.sunCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.sunItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Feather name="sunrise" size={18} color="#FBBF24" />
                </View>
                <View>
                  <Text style={[styles.sunLabel, { color: textSecondary }]}>{t('weather.sunrise', 'Gün Doğumu')}</Text>
                  <Text style={[styles.sunValue, { color: textPrimary }]}>{weatherData.sunrise}</Text>
                </View>
              </View>
              <View style={[styles.sunDivider, { backgroundColor: cardBorder }]} />
              <View style={styles.sunItem}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                  <Feather name="sunset" size={18} color="#F97316" />
                </View>
                <View>
                  <Text style={[styles.sunLabel, { color: textSecondary }]}>{t('weather.sunset', 'Gün Batımı')}</Text>
                  <Text style={[styles.sunValue, { color: textPrimary }]}>{weatherData.sunset}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Native AdMob Banner */}
            <AdBanner />

            {/* 7-Day Forecast Section */}
            <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Feather name="calendar" size={15} color="#D4AF37" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  {t('weather.forecast7Day', '7 Günlük Tahmin')}
                </Text>
              </View>

              <View style={styles.forecastList}>
                {forecast.slice(0, 7).map((item, idx) => {
                  const isToday = idx === 0;
                  const barWidth = getTempBarWidth(item.minTemp, item.maxTemp);

                  return (
                    <Animated.View
                      key={item.date}
                      entering={FadeInUp.delay(280 + idx * 40).duration(350)}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.forecastRow,
                          {
                            backgroundColor: isToday
                              ? isDark
                                ? 'rgba(212, 175, 55, 0.15)'
                                : 'rgba(212, 175, 55, 0.08)'
                              : cardBg,
                            borderColor: isToday
                              ? 'rgba(212, 175, 55, 0.5)'
                              : cardBorder,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        {/* Day Name */}
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

                        {/* Temp Range Bar */}
                        <View style={styles.barCell}>
                          <View style={[styles.tempBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                            <LinearGradient
                              colors={['#3B82F6', '#D4AF37']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.tempBarFill, { width: `${barWidth}%` }]}
                            />
                          </View>
                          <View style={styles.tempLabelsRow}>
                            <Text style={[styles.tempMin, { color: textSecondary }]}>{convertTemp(item.minTemp)}°</Text>
                            <Text style={[styles.tempMax, { color: textPrimary }]}>{convertTemp(item.maxTemp)}°</Text>
                          </View>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextBox: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
  },
  headerSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
  },
  unitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  unitToggleText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroWrapper: {
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  heroTemp: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 48,
    lineHeight: 54,
  },
  heroTempUnit: {
    fontSize: 28,
    fontFamily: 'Outfit_400Regular',
  },
  heroDesc: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  heroRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  rangeLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginRight: 4,
  },
  rangeValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
  },
  hourlyScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  hourlyCard: {
    width: 68,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  hourlyTime: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    marginBottom: 6,
  },
  hourlyEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  hourlyTemp: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  hourlyPopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hourlyPopText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: '#60A5FA',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    flex: 1,
  },
  metricValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
  },
  sunCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sunItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sunDivider: {
    width: 1,
    height: 36,
  },
  sunLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
  },
  sunValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  forecastList: {
    gap: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dayCell: {
    width: 84,
  },
  dayText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
  },
  todayBadge: {
    backgroundColor: '#D4AF37',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  todayBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 8,
    color: '#1A1207',
  },
  conditionCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  forecastEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  forecastDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    flex: 1,
  },
  barCell: {
    width: 90,
    alignItems: 'center',
  },
  tempBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tempBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  tempLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  tempMin: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
  },
  tempMax: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
  },
});