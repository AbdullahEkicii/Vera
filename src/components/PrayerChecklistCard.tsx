import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { audioManager } from '../services/audioManager';
import { logPrayerLogged } from '../services/analyticsService';

const PRAYER_LOGS_KEY = 'USER_PRAYER_LOGS_V1';
const CELEBRATED_DATE_KEY = 'PRAYER_CELEBRATED_DATE_V1';

interface PrayerLog {
  date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

const PRAYER_ITEMS = [
  { id: 'fajr', labelKey: 'checklist.fajr', defaultLabel: 'Sabah' },
  { id: 'dhuhr', labelKey: 'checklist.dhuhr', defaultLabel: 'Öğle' },
  { id: 'asr', labelKey: 'checklist.asr', defaultLabel: 'İkindi' },
  { id: 'maghrib', labelKey: 'checklist.maghrib', defaultLabel: 'Akşam' },
  { id: 'isha', labelKey: 'checklist.isha', defaultLabel: 'Yatsı' },
] as const;

export function PrayerChecklistCard() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const todayStr = new Date().toISOString().split('T')[0];

  const [todayLog, setTodayLog] = useState<Record<string, boolean>>({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });

  const [streakCount, setStreakCount] = useState<number>(0);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  useEffect(() => {
    loadLogsAndStreak();
  }, []);

  const loadLogsAndStreak = async () => {
    try {
      const logsRaw = await AsyncStorage.getItem(PRAYER_LOGS_KEY);
      const allLogs: Record<string, PrayerLog> = logsRaw ? JSON.parse(logsRaw) : {};
      
      const currentTodayLog = allLogs[todayStr] || {
        date: todayStr,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };

      setTodayLog({
        fajr: currentTodayLog.fajr,
        dhuhr: currentTodayLog.dhuhr,
        asr: currentTodayLog.asr,
        maghrib: currentTodayLog.maghrib,
        isha: currentTodayLog.isha,
      });

      // Calculate consecutive active days
      let currentStreak = 0;
      const todayDate = new Date();
      
      for (let i = 0; i < 60; i++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLog = allLogs[dStr];

        if (dayLog) {
          const completedCount = Object.keys(dayLog)
            .filter((k) => k !== 'date')
            .filter((k) => dayLog[k as keyof PrayerLog] === true).length;
          
          if (completedCount > 0) {
            currentStreak++;
          } else if (i > 0) {
            break;
          }
        } else if (i > 0) {
          break;
        }
      }

      setStreakCount(currentStreak);
    } catch (e) {
      console.error('Error loading prayer checklist logs', e);
    }
  };

  const togglePrayer = async (prayerId: string) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      const updatedLog = {
        ...todayLog,
        [prayerId]: !todayLog[prayerId],
      };

      setTodayLog(updatedLog);

      const logsRaw = await AsyncStorage.getItem(PRAYER_LOGS_KEY);
      const allLogs: Record<string, PrayerLog> = logsRaw ? JSON.parse(logsRaw) : {};

      allLogs[todayStr] = {
        date: todayStr,
        fajr: updatedLog.fajr,
        dhuhr: updatedLog.dhuhr,
        asr: updatedLog.asr,
        maghrib: updatedLog.maghrib,
        isha: updatedLog.isha,
      };

      await AsyncStorage.setItem(PRAYER_LOGS_KEY, JSON.stringify(allLogs));
      loadLogsAndStreak();
      logPrayerLogged(prayerId, updatedLog[prayerId], streakCount);

      // Check if all 5 daily prayers are checked off
      const allFiveCompleted = Object.values(updatedLog).every(Boolean);
      if (allFiveCompleted) {
        const lastCelebrated = await AsyncStorage.getItem(CELEBRATED_DATE_KEY);
        if (lastCelebrated !== todayStr) {
          await AsyncStorage.setItem(CELEBRATED_DATE_KEY, todayStr);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          audioManager.playVictorySound();
          setShowCelebrationModal(true);
        }
      }
    } catch (e) {
      console.error('Error saving prayer toggle', e);
    }
  };

  const completedCount = Object.values(todayLog).filter(Boolean).length;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C150B' : '#FDFBF7', borderColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#EAE3D2' }]}>
      {/* Header Pressable to open History page */}
      <Pressable style={styles.headerRow} onPress={() => router.push('/prayer-history')}>
        <View style={styles.headerTitleGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[styles.cardTitle, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t('checklist.title', 'Günlük Namaz Takibi')}
            </Text>
            <Feather name="chevron-right" size={16} color={isDark ? '#D4AF37' : '#8C7055'} style={{ flexShrink: 0 }} />
          </View>
          <Text style={[styles.cardSubtitle, { color: isDark ? 'rgba(253, 248, 237, 0.6)' : '#8C7055' }]}>
            {completedCount} / 5 {t('checklist.completed', 'Kılındı')}
          </Text>
        </View>

        {/* Streak Badge */}
        <LinearGradient
          colors={['#D4AF37', '#B8860B']}
          style={styles.streakBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="flame" size={16} color="#1A1207" />
          <Text style={styles.streakText}>
            {streakCount} {t('checklist.dayStreak', 'Gün Seri')}
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.progressFill, { width: `${(completedCount / 5) * 100}%` }]} />
      </View>

      {/* 5 Prayers Grid */}
      <View style={styles.prayersGrid}>
        {PRAYER_ITEMS.map((item) => {
          const isDone = todayLog[item.id];
          return (
            <Pressable
              key={item.id}
              style={[
                styles.prayerItem,
                {
                  backgroundColor: isDone
                    ? (isDark ? 'rgba(212, 175, 55, 0.15)' : '#F3EACF')
                    : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#F5EFE3'),
                  borderColor: isDone
                    ? '#D4AF37'
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E6DDD0'),
                },
              ]}
              onPress={() => togglePrayer(item.id)}
            >
              <View style={[styles.checkbox, { backgroundColor: isDone ? '#D4AF37' : 'transparent', borderColor: isDone ? '#D4AF37' : (isDark ? 'rgba(255,255,255,0.25)' : '#C4B7A5') }]}>
                {isDone && <Feather name="check" size={12} color="#1A1207" />}
              </View>

              <Text
                style={[styles.prayerLabel, { color: isDone ? '#D4AF37' : (isDark ? '#E2CFA0' : '#4A3B2C') }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {t(item.labelKey, item.defaultLabel)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom View History Bar */}
      <Pressable
        style={[styles.historyBar, { borderColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(140, 112, 85, 0.15)' }]}
        onPress={() => router.push('/prayer-history')}
      >
        <Text style={[styles.historyBarText, { color: isDark ? '#D4AF37' : '#7B4F1A' }]}>
          {t('checklist.viewHistory', 'Tüm Geçmişi Gör')}
        </Text>
        <Feather name="arrow-right" size={14} color={isDark ? '#D4AF37' : '#7B4F1A'} />
      </Pressable>

      {/* Glassmorphic 5 Daily Prayers Victory Modal */}
      <Modal
        visible={showCelebrationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCelebrationModal(false)}
      >
        <BlurView
          intensity={isDark ? 40 : 25}
          tint={isDark ? 'dark' : 'light'}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? 'rgba(28, 21, 11, 0.95)' : 'rgba(255, 251, 244, 0.96)',
                borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.4)',
              },
            ]}
          >
            <LinearGradient
              colors={['#D4AF37', '#B8860B']}
              style={styles.modalBadgeWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={40} color="#1A1207" />
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: isDark ? '#FDF8ED' : '#2C1A0A' }]}>
              {t('checklist.celebrationTitle', 'Tebrikler! 🎉')}
            </Text>

            <Text style={[styles.modalSubtitle, { color: '#D4AF37' }]}>
              {t('checklist.celebrationSubtitle', 'Maşallah!')}
            </Text>

            <Text style={[styles.modalMessage, { color: isDark ? 'rgba(253, 248, 237, 0.8)' : '#5A4633' }]}>
              {t('checklist.celebrationMessage', 'Bugünkü 5 vakit namazınızın tamamını eda ettiniz. Allah kabul etsin!')}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setShowCelebrationModal(false)}
            >
              <LinearGradient
                colors={['#D4AF37', '#A87A0C']}
                style={styles.modalBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalBtnText}>
                  {t('checklist.celebrationBtn', 'Elhamdülillah')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
  },
  cardSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    flexShrink: 0,
  },
  streakText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#1A1207',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
  },
  prayersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  prayerItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10.5,
    textAlign: 'center',
    width: '100%',
  },
  historyBar: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  historyBarText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
  },

  // Modal celebration styles
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalBadgeWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalMessage: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  modalBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#1A1207',
  },
});
