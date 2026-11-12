import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar, Share, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { readableTextOn } from '../utils/theme';
import { AppBackground } from '../components/ProgressRing';
import { logScreenView } from '../services/analyticsService';
import {
  getAchievementsWithStatus,
  AchievementResult,
  AchievementCategory,
} from '../services/achievementService';
import { getOrCreateReferralCode, getReferralShareMessage } from '../services/referralService';
import { StoryCardShareModal } from '../components/StoryCardShareModal';
import { CommunitySharePrompt } from '../components/CommunitySharePrompt';
import { BannerAdSlot } from '../components/BannerAdSlot';
import { useCt } from '../localization/content';
import { directionalIconStyle } from '../utils/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_LABELS: Record<AchievementCategory, { tr: string; en: string }> = {
  prayer: { tr: 'Namaz', en: 'Prayer' },
  dhikr: { tr: 'Zikir', en: 'Dhikr' },
  quran: { tr: 'Kur\'an', en: 'Quran' },
  kaza: { tr: 'Kaza', en: 'Makeup' },
};

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  // Edge-to-edge / cut-out safe: StatusBar.currentHeight alone can be 0 or stale.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const { t } = useTranslation();
  const ct = useCt();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();

  const [results, setResults] = useState<AchievementResult[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [communityBadgeTitle, setCommunityBadgeTitle] = useState<string | null>(null);

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

      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.text} style={directionalIconStyle} />
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
          style={[styles.pointsCard,{ backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
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
              accessibilityRole="button"
              style={[styles.shareBtn, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary }]}
              onPress={() => setShareModalVisible(true)}
            >
              <Feather name="share-2" size={14} color={theme.colors.primary} />
              <Text style={[styles.shareBtnText, { color: theme.colors.primaryText }]}>
                {t('achievements.share', 'Puanımı Paylaş')}
              </Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          style={[styles.inviteCard,{ backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.inviteTitle, { color: theme.colors.text }]}>
              {t('achievements.inviteTitle', 'Arkadaşını Davet Et')}
            </Text>
            <Text style={[styles.inviteDesc, { color: theme.colors.textSecondary }]}>
              {t('achievements.inviteDesc', 'Birlikte hatim takibi yapın, birbirinizi motive edin.')}
            </Text>
          </View>
          <Pressable style={[styles.inviteBtn, { backgroundColor: theme.colors.primary }]} onPress={handleInviteFriend} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('achievements.inviteTitle', 'Invite a Friend')}>
            <Feather name="user-plus" size={16} color={readableTextOn(theme.colors.primary)} />
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
                  <Animated.View key={item.def.id} entering={reduceMotion ? undefined : FadeInDown.delay(idx * 40).duration(350)}>
                  <View
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
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
                        <Text style={[styles.badgeProgress, { color: theme.colors.primaryText }]}>
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
                      {item.unlocked && (
                        <Pressable
                          onPress={() =>
                            setCommunityBadgeTitle(ct(`content.achievements.${item.def.id}.title`, item.def.titleTR, item.def.titleEN))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={t('community.share.open', 'Topluluğa paylaş')}
                          hitSlop={10}
                          style={[styles.badgeShare, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        >
                          <Feather name="users" size={14} color={theme.colors.primary} />
                        </Pressable>
                      )}
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

      <CommunitySharePrompt
        visible={communityBadgeTitle !== null}
        templateKey="achievement"
        params={{ title: communityBadgeTitle ?? '' }}
        onDone={() => setCommunityBadgeTitle(null)}
      />

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
  // Small glass circle.
  badgeShare: {
    marginTop: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  // Outer radius 22; the icon tile is an inner rounded square.
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  badgeDesc: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
    fontFamily: 'Outfit_400Regular',
  },
  badgeProgress: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 4,
  },
  badgePoints: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit_600SemiBold',
  },
});
