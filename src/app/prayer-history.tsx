import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { AppBackground } from '../components/ProgressRing';

const PRAYER_LOGS_KEY = 'USER_PRAYER_LOGS_V1';

interface PrayerLog {
  date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

const PRAYERS = [
  { id: 'fajr', labelKey: 'checklist.fajr', defaultLabel: 'Sabah' },
  { id: 'dhuhr', labelKey: 'checklist.dhuhr', defaultLabel: 'Öğle' },
  { id: 'asr', labelKey: 'checklist.asr', defaultLabel: 'İkindi' },
  { id: 'maghrib', labelKey: 'checklist.maghrib', defaultLabel: 'Akşam' },
  { id: 'isha', labelKey: 'checklist.isha', defaultLabel: 'Yatsı' },
] as const;

export default function PrayerHistoryScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const [allLogs, setAllLogs] = useState<Record<string, PrayerLog>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [weeklyRate, setWeeklyRate] = useState<number>(0);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const raw = await AsyncStorage.getItem(PRAYER_LOGS_KEY);
      const parsed: Record<string, PrayerLog> = raw ? JSON.parse(raw) : {};
      setAllLogs(parsed);

      // Compute statistics
      let total = 0;
      Object.values(parsed).forEach((log) => {
        if (log.fajr) total++;
        if (log.dhuhr) total++;
        if (log.asr) total++;
        if (log.maghrib) total++;
        if (log.isha) total++;
      });
      setTotalCount(total);

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLog = parsed[dStr];

        if (dayLog) {
          const count = [dayLog.fajr, dayLog.dhuhr, dayLog.asr, dayLog.maghrib, dayLog.isha].filter(Boolean).length;
          if (count > 0) streak++;
          else if (i > 0) break;
        } else if (i > 0) break;
      }
      setStreakCount(streak);

      // Calculate 7-day rate
      let weekLogged = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLog = parsed[dStr];
        if (dayLog) {
          weekLogged += [dayLog.fajr, dayLog.dhuhr, dayLog.asr, dayLog.maghrib, dayLog.isha].filter(Boolean).length;
        }
      }
      setWeeklyRate(Math.round((weekLogged / 35) * 100));
    } catch (e) {
      console.error('Error loading prayer history', e);
    }
  };

  const togglePastPrayer = async (dateStr: string, prayerId: keyof Omit<PrayerLog, 'date'>) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      const existing = allLogs[dateStr] || {
        date: dateStr,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };

      const updated = {
        ...allLogs,
        [dateStr]: {
          ...existing,
          [prayerId]: !existing[prayerId],
        },
      };

      setAllLogs(updated);
      await AsyncStorage.setItem(PRAYER_LOGS_KEY, JSON.stringify(updated));
      loadLogs();
    } catch (e) {
      console.error('Error toggling past prayer', e);
    }
  };

  // Generate last 30 days list
  const daysList = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      let dayLabel = '';
      if (i === 0) dayLabel = t('checklist.today', 'Bugün');
      else if (i === 1) dayLabel = t('checklist.yesterday', 'Dün');
      else {
        dayLabel = d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
          day: 'numeric',
          month: 'short',
          weekday: 'short',
        });
      }

      list.push({ dateStr, dayLabel, index: i });
    }
    return list;
  }, [i18n.language, t]);

  return (
    <AppBackground isDark={isDark}>
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={[styles.topHeader, { backgroundColor: isDark ? 'rgba(15, 11, 6, 0.45)' : 'rgba(247, 243, 233, 0.55)' }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={isDark ? '#FDF8ED' : '#2C1A0A'} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>
              {t('checklist.historyTitle', 'Namaz Takip Geçmişi')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? 'rgba(253,248,237,0.6)' : '#8C7055' }]}>
              {t('checklist.historySubtitle', 'Son 30 günlük ibadet kayıtlarınız')}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Stats Summary Row */}
          <View style={styles.statsRow}>
            {/* Card 1: Total Prayers */}
            <LinearGradient
              colors={isDark ? ['rgba(33, 24, 12, 0.75)', 'rgba(20, 14, 6, 0.80)'] : ['rgba(255, 253, 247, 0.88)', 'rgba(243, 232, 206, 0.88)']}
              style={[styles.statCard, { borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#E6DDD0' }]}
            >
              <Ionicons name="checkmark-done-circle" size={22} color="#D4AF37" />
              <Text style={[styles.statValue, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>{totalCount}</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(253,248,237,0.6)' : '#8C7055' }]}>
                {t('checklist.totalLogged', 'Kılınan Vakit')}
              </Text>
            </LinearGradient>

            {/* Card 2: Streak */}
            <LinearGradient
              colors={isDark ? ['rgba(33, 24, 12, 0.75)', 'rgba(20, 14, 6, 0.80)'] : ['rgba(255, 253, 247, 0.88)', 'rgba(243, 232, 206, 0.88)']}
              style={[styles.statCard, { borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#E6DDD0' }]}
            >
              <Ionicons name="flame" size={22} color="#F59E0B" />
              <Text style={[styles.statValue, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>{streakCount}</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(253,248,237,0.6)' : '#8C7055' }]}>
                {t('checklist.activeStreak', 'Aktif Seri')}
              </Text>
            </LinearGradient>

            {/* Card 3: Weekly Rate */}
            <LinearGradient
              colors={isDark ? ['rgba(33, 24, 12, 0.75)', 'rgba(20, 14, 6, 0.80)'] : ['rgba(255, 253, 247, 0.88)', 'rgba(243, 232, 206, 0.88)']}
              style={[styles.statCard, { borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#E6DDD0' }]}
            >
              <Ionicons name="stats-chart" size={20} color="#10B981" />
              <Text style={[styles.statValue, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>%{weeklyRate}</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(253,248,237,0.6)' : '#8C7055' }]}>
                {t('checklist.weeklyRate', 'Haftalık Oran')}
              </Text>
            </LinearGradient>
          </View>

          {/* 30 Days List */}
          <View style={styles.daysContainer}>
            {daysList.map(({ dateStr, dayLabel }) => {
              const dayLog = allLogs[dateStr] || {
                date: dateStr,
                fajr: false,
                dhuhr: false,
                asr: false,
                maghrib: false,
                isha: false,
              };

              const dayDoneCount = [dayLog.fajr, dayLog.dhuhr, dayLog.asr, dayLog.maghrib, dayLog.isha].filter(
                Boolean
              ).length;

              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <View
                  key={dateStr}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: isDark ? 'rgba(24, 18, 10, 0.72)' : 'rgba(255, 253, 249, 0.85)',
                      borderColor: isDark ? 'rgba(212,175,55,0.20)' : '#EAE1D0',
                      opacity: isToday ? 1 : 0.85,
                    },
                  ]}
                >
                {/* Day Header Row */}
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayLabelText, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>
                    {dayLabel}
                  </Text>
                  <Text style={[styles.dayBadgeText, { color: isDark ? '#D4AF37' : '#7B4F1A' }]}>
                    {dayDoneCount} / 5
                  </Text>
                </View>

                {/* 5 Prayer Status Pills */}
                <View style={styles.pillsRow}>
                  {PRAYERS.map((p) => {
                    const isDone = dayLog[p.id as keyof Omit<PrayerLog, 'date'>];
                    return (
                      <Pressable
                        key={p.id}
                        disabled={!isToday}
                        style={[
                          styles.pillItem,
                          {
                            backgroundColor: isDone
                              ? isDark
                                ? 'rgba(212, 175, 55, 0.18)'
                                : '#F3EACF'
                              : isDark
                              ? 'rgba(255,255,255,0.03)'
                              : '#F5EFE3',
                            borderColor: isDone
                              ? '#D4AF37'
                              : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#E6DDD0',
                          },
                        ]}
                        onPress={() => isToday && togglePastPrayer(dateStr, p.id as keyof Omit<PrayerLog, 'date'>)}
                      >
                        <View
                          style={[
                            styles.pillCheckbox,
                            {
                              backgroundColor: isDone ? '#D4AF37' : 'transparent',
                              borderColor: isDone ? '#D4AF37' : isDark ? 'rgba(255,255,255,0.2)' : '#C4B7A5',
                            },
                          ]}
                        >
                          {isDone && <Feather name="check" size={10} color="#1A1207" />}
                        </View>
                        <Text
                          style={[
                            styles.pillLabel,
                            { color: isDone ? '#D4AF37' : isDark ? '#E2CFA0' : '#4A3B2C' },
                          ]}
                        >
                          {t(p.labelKey, p.defaultLabel)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  </AppBackground>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
  },
  headerSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    marginVertical: 4,
  },
  statLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    textAlign: 'center',
  },
  daysContainer: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayLabelText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
  },
  dayBadgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pillItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pillCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
  },
});
