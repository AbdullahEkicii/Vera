import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar, Share, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { AppBackground } from '../components/ProgressRing';
import { logScreenView } from '../services/analyticsService';
import {
  getAchievementsWithStatus,
  AchievementResult,
  AchievementCategory,
} from '../services/achievementService';
import { getOrCreateReferralCode, getReferralShareMessage } from '../services/referralService';
import { StoryCardShareModal } from '../components/StoryCardShareModal';
import { BannerAdSlot } from '../components/BannerAdSlot';
import { ct } from '../localization/content';

const CATEGORY_LABELS: Record<AchievementCategory, { tr: string; en: string }> = {
  prayer: { tr: 'Namaz', en: 'Prayer' },
  dhikr: { tr: 'Zikir', en: 'Dhikr' },
  quran: { tr: 'Kur\'an', en: 'Quran' },
  kaza: { tr: 'Kaza', en: 'Makeup' },
};

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [results, setResults] = useState<AchievementResult[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const handleInviteFriend = async () => {
    try {
      const code = await getOrCreateReferralCode();
      const message = getReferralShareMessage(code, t);
      await Share.share({ message });
    } catch {}
  };

  const load = useCallback(async () => {
    const { results, totalPoints } = await getAchievementsWithStatus();
    setResults(results);
    setTotalPoints(totalPoints);
    setLoading(false);
  }, []);

  useEffect(() => {
    logScreenView('AchievementsScreen');
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unlockedCount = results.filter((r) => r.unlocked).length;
  const categories: AchievementCategory[] = ['prayer', 'dhikr', 'quran', 'kaza'];

  return (
    <AppBackground isDark={isDark}>
      <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('achievements.title', 'Başarılarım')}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.pointsCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <Feather name="award" size={34} color={theme.colors.primary} />
          <Text style={[styles.pointsValue, { color: theme.colors.text }]}>{totalPoints}</Text>
          <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}>
            {t('achievements.pointsLabel', 'İbadet Puanı')}
          </Text>
          <Text style={[styles.unlockedCount, { color: theme.colors.textSecondary }]}>
            {t('achievements.unlockedCount', '{{unlocked}} / {{total}} rozet açıldı', { unlocked: unlockedCount, total: results.length })}
          </Text>

          {totalPoints > 0 && (
            <Pressable
              style={[styles.shareBtn, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary }]}
              onPress={() => setShareModalVisible(true)}
            >
              <Feather name="share-2" size={14} color={theme.colors.primary} />
              <Text style={[styles.shareBtnText, { color: theme.colors.primary }]}>
                {t('achievements.share', 'Puanımı Paylaş')}
              </Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(60).duration(400)}
          style={[styles.inviteCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.inviteTitle, { color: theme.colors.text }]}>
              {t('achievements.inviteTitle', 'Arkadaşını Davet Et')}
            </Text>
            <Text style={[styles.inviteDesc, { color: theme.colors.textSecondary }]}>
              {t('achievements.inviteDesc', 'Birlikte hatim takibi yapın, birbirinizi motive edin.')}
            </Text>
          </View>
          <Pressable style={[styles.inviteBtn, { backgroundColor: theme.colors.primary }]} onPress={handleInviteFriend}>
            <Feather name="user-plus" size={16} color="#1A1207" />
          </Pressable>
        </Animated.View>

        {categories.map((cat, catIdx) => {
          const items = results.filter((r) => r.def.category === cat);
          if (items.length === 0) return null;
          return (
            <View key={cat} style={{ marginTop: 20 }}>
              <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
                {ct(`content.achievementCategories.${cat}`, CATEGORY_LABELS[cat].tr, CATEGORY_LABELS[cat].en)}
              </Text>
              <View style={{ gap: 10 }}>
                {items.map((item, idx) => (
                  // The entering animation fades opacity to 1, so it lives on a wrapper;
                  // the locked dimming sits on the inner view and is not overwritten.
                  <Animated.View key={item.def.id} entering={FadeInDown.delay(idx * 40).duration(350)}>
                  <View
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: theme.colors.surfaceStrong,
                        borderColor: item.unlocked ? theme.colors.primary : theme.colors.border,
                        opacity: item.unlocked ? 1 : 0.55,
                      },
                    ]}
                  >
                    <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? theme.colors.primary + '25' : theme.colors.border + '40' }]}>
                      <Feather name={item.def.icon as any} size={20} color={item.unlocked ? theme.colors.primary : theme.colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeTitle, { color: theme.colors.text }]}>
                        {ct(`content.achievements.${item.def.id}.title`, item.def.titleTR, item.def.titleEN)}
                      </Text>
                      <Text style={[styles.badgeDesc, { color: theme.colors.textSecondary }]}>
                        {ct(`content.achievements.${item.def.id}.desc`, item.def.descTR, item.def.descEN)}
                      </Text>
                      {!item.unlocked && item.progress && (
                        <Text style={[styles.badgeProgress, { color: theme.colors.primary }]}>
                          {item.progress}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {item.unlocked ? (
                        <Feather name="check-circle" size={20} color={theme.colors.primary} />
                      ) : (
                        <Feather name="lock" size={16} color={theme.colors.textSecondary} />
                      )}
                      <Text style={[styles.badgePoints, { color: theme.colors.textSecondary }]}>+{item.def.points}</Text>
                    </View>
                  </View>
                  </Animated.View>
                ))}
              </View>
              {/* Banner after the first category: a natural break, away from the points card */}
              {catIdx === 0 && (
                <View style={{ marginTop: 20 }}>
                  <BannerAdSlot placement="achievements" isVisible={isFocused} />
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      <StoryCardShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={t('achievements.pointsLabel', 'İbadet Puanı')}
        text={t('achievements.shareText', '{{points}} İbadet Puanına ulaştım, {{unlocked}} rozet açtım!', { points: totalPoints, unlocked: unlockedCount })}
        source="Vera"
        type="achievement"
      />
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  pointsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  unlockedCount: {
    fontSize: 12,
    marginTop: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inviteDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  inviteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeProgress: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  badgePoints: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
