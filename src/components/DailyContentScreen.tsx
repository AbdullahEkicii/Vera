import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../utils/theme';
import { getDailyContent, getInstantDailyContent, DailyItem } from '../utils/daily';
import { BannerAdSlot } from './BannerAdSlot';
import { StoryCardShareModal } from './StoryCardShareModal';
import { logScreenView } from '../services/analyticsService';

// Gradient palettes for each card type
const CARD_GRADIENTS = {
  verse:  ['#1a2a6c', '#b21f1f'] as [string, string],
  hadith: ['#134e5e', '#2F7D5B'] as [string, string],
  quote:  ['#373b44', '#2F6FD6'] as [string, string],
};

const CARD_ICONS = {
  verse:  'book-open',
  hadith: 'message-circle',
  quote:  'feather',
} as const;

interface ContentCardProps {
  type: 'verse' | 'hadith' | 'quote';
  title: string;
  text: string;
  source: string;
  delay: number;
  onStoryShare?: () => void;
}

function ContentCard({ type, title, text, source, delay, onStoryShare }: ContentCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const onPressOut = () => { scale.value = withSpring(1,    { damping: 15 }); };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onStoryShare}
        accessibilityRole={onStoryShare ? 'button' : undefined}
        accessibilityLabel={`${title}. ${text}. ${source}`}
        accessibilityHint={onStoryShare ? t('share.actionBtn', 'Share Card Image') : undefined}
      >
        <Animated.View style={animStyle}>
          <LinearGradient
            colors={CARD_GRADIENTS[type]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Subtle inner border overlay */}
            <View style={styles.cardInnerBorder} />

            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.typePill}>
                <Feather name={CARD_ICONS[type]} size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.typeLabel}>{title}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {onStoryShare && (
                  <Pressable onPress={onStoryShare} hitSlop={10} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel={t('share.actionBtn', 'Share Card Image')}>
                    <Feather name="share-2" size={18} color="rgba(255,255,255,0.9)" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Opening quote mark */}
            <Text style={styles.quoteDecor}>&quot;</Text>

            {/* Main text */}
            <Text style={styles.cardText}>{text}</Text>

            {/* Source */}
            <View style={styles.sourceRow}>
              <View style={styles.sourceLine} />
              <Text style={styles.sourceText}>{source}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function DailyContentScreen({ isActive = true }: { isActive?: boolean }) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  // Instant synchronous base content - Zero ms delay, no white screen, no spinner flash!
  const [dailyContent, setDailyContent] = useState<DailyItem>(() => getInstantDailyContent(i18n.language));

  // Story Share Modal State
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareData, setShareData] = useState<{
    type: 'verse' | 'hadith' | 'quote';
    title: string;
    text: string;
    source: string;
  }>({
    type: 'verse',
    title: '',
    text: '',
    source: '',
  });

  const openShareModal = (type: 'verse' | 'hadith' | 'quote', title: string, text: string, source: string) => {
    setShareData({ type, title, text, source });
    setShareModalVisible(true);
  };

  useEffect(() => {
    logScreenView('DailyContentScreen');
    let active = true;
    // 1. Immediately switch to instant base when language changes
    setDailyContent(getInstantDailyContent(i18n.language));

    // 2. Seamlessly revalidate in background from cache / translator
    getDailyContent(i18n.language).then((content) => {
      if (active && content) {
        setDailyContent(content);
      }
    });
    return () => { active = false; };
  }, [i18n.language]);

  // Today's date for header
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [i18n.language]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero header */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.heroHeader}>
        <LinearGradient
          colors={isDark ? ['#1c1008', '#0d1117'] : ['#fef3c7', '#fff8ec']}
          style={styles.heroGradient}
        >
          <Text style={[styles.heroDay, { color: theme.colors.textSecondary }]}>{today}</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            {t('daily.title', 'Günün İçerikleri')}
          </Text>
          <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
            {t('daily.subtitle', 'Bugün için seçilmiş ayet, hadis ve söz')}
          </Text>
          {dailyContent.machineTranslated ? (
            <Text style={[styles.heroSub, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, opacity: 0.8 }]}>
              {t('daily.autoTranslated', 'Otomatik çeviri')}
            </Text>
          ) : null}
        </LinearGradient>
      </Animated.View>

      {/* Cards */}
      <View style={styles.cards}>
        <ContentCard
          type="verse"
          title={t('daily.verse', 'Günün Ayeti')}
          text={dailyContent.verse}
          source={dailyContent.verseSource}
          delay={120}
          onStoryShare={() =>
            openShareModal('verse', t('daily.verse', 'Günün Ayeti'), dailyContent.verse, dailyContent.verseSource)
          }
        />

        {/* Live AdMob Native Ad */}
        <BannerAdSlot placement="daily_content" isVisible={isActive} lazy={true} />

        <ContentCard
          type="hadith"
          title={t('daily.hadith', 'Günün Hadisi')}
          text={dailyContent.hadith}
          source={dailyContent.hadithSource}
          delay={240}
          onStoryShare={() =>
            openShareModal('hadith', t('daily.hadith', 'Günün Hadisi'), dailyContent.hadith, dailyContent.hadithSource)
          }
        />
        <ContentCard
          type="quote"
          title={t('daily.quote', 'Günün Sözü')}
          text={dailyContent.quote}
          source={dailyContent.quoteSource}
          delay={360}
          onStoryShare={() =>
            openShareModal('quote', t('daily.quote', 'Günün Sözü'), dailyContent.quote, dailyContent.quoteSource)
          }
        />
      </View>

      {/* Story Share Modal */}
      <StoryCardShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={shareData.title}
        text={shareData.text}
        source={shareData.source}
        type={shareData.type}
      />

      {/* Hint */}
      <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.hint}>
        <Feather name="image" size={13} color={theme.colors.textSecondary} />
        <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
          {t('daily.shareHint', 'Görsel kart olarak paylaşmak için karta tıklayın')}
        </Text>
      </Animated.View>

      <View style={{ height: spacing.xxl }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero header */
  heroHeader: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroDay: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    marginTop: 4,
  },

  /* Cards container */
  cards: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  /* Individual card */
  card: {
    borderRadius: 24,
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  typeLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  shareBtn: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteDecor: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 64,
    color: 'rgba(255,255,255,0.15)',
    lineHeight: 52,
    marginBottom: -4,
    marginStart: -4,
  },
  cardText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sourceText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },

  /* Hint */
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  hintText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
});
