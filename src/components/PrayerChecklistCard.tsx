import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { audioManager } from '../services/audioManager';
import { logPrayerLogged } from '../services/analyticsService';
import { StoryCardShareModal } from './StoryCardShareModal';
import { maybeRequestReview } from '../services/reviewService';

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
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

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
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);

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

  // A full day of prayers is a good moment to ask for a Play review, once the
  // celebration is dismissed (not when it hands off to the share sheet).
  const closeCelebration = () => {
    setShowCelebrationModal(false);
    setTimeout(() => maybeRequestReview('all_five_prayers'), 600);
  };

  const completedCount = Object.values(todayLog).filter(Boolean).length;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {/* Header Pressable to open History page */}
      <Pressable
        style={styles.headerRow}
        onPress={() => router.push('/prayer-history')}
        accessibilityRole="button"
      >
        <View style={styles.headerTitleGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[styles.cardTitle, { color: c.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t('checklist.title', 'Günlük Namaz Takibi')}
            </Text>
            <Feather name="chevron-right" size={16} color={c.primary} style={{ flexShrink: 0 }} />
          </View>
          <Text style={[styles.cardSubtitle, { color: c.textSecondary }]}>
            {completedCount} / 5 {t('checklist.completed', 'Kılındı')}
          </Text>
        </View>

        {/* Streak Badge */}
        <View style={[styles.streakBadge, { backgroundColor: c.primaryLight, borderColor: c.borderStrong }]}>
          <Ionicons name="flame" size={15} color={c.primary} />
          <Text style={[styles.streakText, { color: c.primary }]}>
            {streakCount} {t('checklist.dayStreak', 'Gün Seri')}
          </Text>
        </View>
      </Pressable>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: c.primaryLight }]}>
        <View style={[styles.progressFill, { width: `${(completedCount / 5) * 100}%`, backgroundColor: c.primary }]} />
      </View>

      {/* 5 Prayers Grid */}
      <View style={styles.prayersGrid}>
        {PRAYER_ITEMS.map((item) => {
          const isDone = todayLog[item.id];
          return (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              accessibilityLabel={t(item.labelKey, item.defaultLabel)}
              style={({ pressed }) => [
                styles.prayerItem,
                {
                  backgroundColor: isDone ? c.primaryLight : c.surface,
                  borderColor: isDone ? c.primary : c.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => togglePrayer(item.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  { backgroundColor: isDone ? c.primary : 'transparent', borderColor: isDone ? c.primary : c.textSecondary },
                ]}
              >
                {isDone && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>

              <Text
                style={[styles.prayerLabel, { color: isDone ? c.primary : c.text }]}
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
        style={[styles.historyBar, { borderColor: c.border }]}
        onPress={() => router.push('/prayer-history')}
        accessibilityRole="button"
      >
        <Text style={[styles.historyBarText, { color: c.primary }]}>
          {t('checklist.viewHistory', 'Tüm Geçmişi Gör')}
        </Text>
        <Feather name="arrow-right" size={14} color={c.primary} />
      </Pressable>

      {/* 5 Daily Prayers Victory Modal */}
      <Modal
        visible={showCelebrationModal}
        transparent
        animationType="fade"
        onRequestClose={closeCelebration}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.35)' }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? '#16161E' : '#FFFFFF', borderColor: c.border, shadowColor: c.glow },
            ]}
          >
            <LinearGradient
              colors={c.heroGradient as [string, string]}
              style={[styles.modalBadgeWrap, { shadowColor: c.glow }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={38} color="#FFFFFF" />
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: c.text }]}>
              {t('checklist.celebrationTitle', 'Tebrikler!')}
            </Text>

            <Text style={[styles.modalSubtitle, { color: c.primary }]}>
              {t('checklist.celebrationSubtitle', 'Maşallah!')}
            </Text>

            <Text style={[styles.modalMessage, { color: c.textSecondary }]}>
              {t('checklist.celebrationMessage', 'Bugünkü 5 vakit namazınızın tamamını eda ettiniz. Allah kabul etsin!')}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={closeCelebration}
            >
              <LinearGradient
                colors={c.heroGradient as [string, string]}
                style={styles.modalBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalBtnText}>
                  {t('checklist.celebrationBtn', 'Elhamdülillah')}
                </Text>
              </LinearGradient>
            </Pressable>

            {streakCount > 1 && (
              <Pressable
                style={styles.shareRow}
                onPress={() => {
                  setShowCelebrationModal(false);
                  setShareModalVisible(true);
                }}
              >
                <Feather name="share-2" size={14} color={c.primary} />
                <Text style={[styles.shareRowText, { color: c.primary }]}>
                  {t('checklist.shareStreak', 'Serimi Paylaş')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <StoryCardShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={t('checklist.title', 'Günlük Namaz Takibi')}
        text={t('checklist.shareText', 'Kesintisiz {{count}} gündür namazlarımı takip ediyorum, elhamdülillah!', { count: streakCount })}
        source="Vera"
        type="achievement"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // No horizontal margin: the home screen already insets content by 16dp, so the
  // card lines up with the prayer grid and quick-feature tiles above it.
  card: {
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
    borderWidth: 1,
    gap: 4,
    flexShrink: 0,
  },
  streakText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
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
    color: '#FFFFFF',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  shareRowText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
  },
});
