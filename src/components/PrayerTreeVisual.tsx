import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';

export interface DayPrayerLog {
  date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

interface Props {
  allLogs: Record<string, DayPrayerLog>;
  streakCount: number;
}

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export function PrayerTreeVisual({ allLogs, streakCount }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  // Get the 7 days of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const log = allLogs[dateStr] || {
        date: dateStr,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };

      const completedCount = PRAYER_KEYS.filter((k) => log[k] === true).length;
      const rawDay = d.toLocaleDateString(i18n.language, { weekday: 'short' });
      const dayName = (rawDay || '').replace('.', '').slice(0, 3);
      const isToday = dateStr === today.toISOString().split('T')[0];
      const isPastOrToday = d <= today;

      days.push({
        dateStr,
        dayName,
        dayNum: d.getDate(),
        isToday,
        isPastOrToday,
        completedCount,
        log,
      });
    }
    return days;
  }, [allLogs, i18n.language]);

  const totalCompletedThisWeek = weekDays.reduce((acc, d) => acc + d.completedCount, 0);
  const weekPercentage = Math.round((totalCompletedThisWeek / 35) * 100);

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#121A16' : '#F4FAF6', borderColor: isDark ? '#1C382A' : '#C8E6D6' }]}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.iconBadge}>
            <Ionicons name="leaf" size={15} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {t('prayerTree.title', 'Haftalık Namaz Ağacı')}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
              {t('prayerTree.subtitle', 'Bu hafta: {{count}}/35 Vakit', { count: totalCompletedThisWeek })}
            </Text>
          </View>
        </View>

        <View style={[styles.streakBadge, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
          <Text style={styles.streakText} numberOfLines={1}>🔥 {streakCount} {t('checklist.streakDays', 'Gün')}</Text>
        </View>
      </View>

      {/* Tree Status Bar */}
      <View style={styles.statusBox}>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t('prayerTree.successRate', 'Haftalık İbadet Başarısı')}
          </Text>
          <Text style={[styles.scorePercent, { color: '#10B981' }]}>
            %{weekPercentage}
          </Text>
        </View>

        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={['#10B981', '#34D399']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${weekPercentage}%` }]}
          />
        </View>
      </View>

      {/* 7 Days Tree Branches */}
      <View style={styles.daysGrid}>
        {weekDays.map((day, idx) => {
          const isFull = day.completedCount === 5;
          return (
            <View
              key={day.dateStr}
              style={[
                styles.dayColumn,
                day.isToday && [styles.todayColumn, { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)' }],
              ]}
            >
              {/* Day Label */}
              <Text style={[styles.dayLabel, { color: day.isToday ? '#10B981' : theme.colors.textSecondary }]} numberOfLines={1}>
                {day.dayName}
              </Text>
              <Text style={[styles.dayNum, { color: day.isToday ? '#10B981' : theme.colors.text }]}>
                {day.dayNum}
              </Text>

              {/* 5 Leaf Nodes for each prayer */}
              <View style={styles.leavesContainer}>
                {PRAYER_KEYS.map((k) => {
                  const isDone = day.log[k];
                  return (
                    <View
                      key={k}
                      style={[
                        styles.leafNode,
                        isDone
                          ? styles.leafDone
                          : [styles.leafEmpty, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }],
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={9} color="#FFFFFF" />}
                    </View>
                  );
                })}
              </View>

              {/* Completed count / 5 */}
              <Text
                style={[
                  styles.leafCount,
                  {
                    color: isFull
                      ? '#10B981'
                      : day.completedCount > 0
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    fontFamily: isFull ? typography.fontFamily.bold : typography.fontFamily.medium,
                  },
                ]}
              >
                {day.completedCount}/5
              </Text>
            </View>
          );
        })}
      </View>

      {/* Motivational Bottom Quote */}
      <View style={[styles.motivationBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)' }]}>
        <Text style={[styles.motivationText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
          {weekPercentage >= 80
            ? '🌿 ' + t('prayerTree.quoteHigh', '“Namaz dinin direğidir.” — Harika bir hafta geçiriyorsunuz, maşallah!')
            : weekPercentage >= 50
            ? '🌱 ' + t('prayerTree.quoteMid', '“Namaz kılın, zekat verin ve rüku edenlerle birlikte rüku edin.” (Bakara, 43)')
            : '🍃 ' + t('prayerTree.quoteLow', '“Şüphesiz namaz, müminler üzerine vakitleri belirlenmiş bir farzdır.” (Nisa, 103)')}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14.5,
  },
  cardSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: 105,
  },
  streakText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: '#D97706',
  },
  statusBox: {
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11.5,
    flex: 1,
    marginRight: 6,
  },
  scorePercent: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13.5,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 1,
    borderRadius: 10,
  },
  todayColumn: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9.5,
    textTransform: 'uppercase',
  },
  dayNum: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11.5,
    marginBottom: 4,
  },
  leavesContainer: {
    gap: 3,
    alignItems: 'center',
    marginVertical: 3,
  },
  leafNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafDone: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  leafEmpty: {
    borderWidth: 1,
  },
  leafCount: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9.5,
    marginTop: 3,
  },
  motivationBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
  },
  motivationText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
  },
});
