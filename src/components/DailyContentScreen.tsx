import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
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
import { spacing, typography, borderRadius } from '../utils/theme';
import { getDailyContent, getInstantDailyContent, DailyItem } from '../utils/daily';
import { AdBanner } from './AdBanner';
import { addContentToQueue } from '../services/contentQueue';
import { StoryCardShareModal } from './StoryCardShareModal';
import { logScreenView } from '../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gradient palettes for each card type
const CARD_GRADIENTS = {
  verse:  ['#1a2a6c', '#b21f1f'] as [string, string],
  hadith: ['#134e5e', '#71b280'] as [string, string],
  quote:  ['#373b44', '#4286f4'] as [string, string],
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
  isEditor?: boolean;
  onAddClick?: (type: 'verse' | 'hadith' | 'quote') => void;
  onStoryShare?: () => void;
}

function ContentCard({ type, title, text, source, delay, isEditor, onAddClick, onStoryShare }: ContentCardProps) {
  const scale = useSharedValue(1);
  const { theme } = useTheme();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const onPressOut = () => { scale.value = withSpring(1,    { damping: 15 }); };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onStoryShare}>
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
                {isEditor && onAddClick && (
                  <Pressable onPress={() => onAddClick(type)} hitSlop={10} style={styles.shareBtn}>
                    <Feather name="plus-circle" size={20} color="#FFF" />
                  </Pressable>
                )}
                {onStoryShare && (
                  <Pressable onPress={onStoryShare} hitSlop={10} style={styles.shareBtn}>
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

export function DailyContentScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  // Instant synchronous base content - Zero ms delay, no white screen, no spinner flash!
  const [dailyContent, setDailyContent] = useState<DailyItem>(() => getInstantDailyContent(i18n.language));
  const [isEditor, setIsEditor] = useState(false);

  // Add Content State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addType, setAddType] = useState<'verse' | 'hadith' | 'quote'>('verse');
  const [addText, setAddText] = useState('');
  const [addSource, setAddSource] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    const subscriber = onAuthStateChanged(getAuth(), (user) => {
      setIsEditor(!!user);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    logScreenView('DailyContentScreen');
    let active = true;
    // 1. Immediately switch to instant base when language changes
    setDailyContent(getInstantDailyContent(i18n.language));

    // 2. Seamlessly revalidate in background from cache / queue / translator
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
    return d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [i18n.language]);

  const handleAddClick = (type: 'verse' | 'hadith' | 'quote') => {
    setAddType(type);
    setAddText('');
    setAddSource('');
    setAddModalVisible(true);
  };

  const handleSaveContent = async () => {
    if (!addText.trim() || !addSource.trim()) {
      Alert.alert(t('common.error', 'Hata'), t('common.fillAllFields', 'Lütfen tüm alanları doldurun.'));
      return;
    }
    setIsSaving(true);
    const success = await addContentToQueue(addType, addText.trim(), addSource.trim());
    setIsSaving(false);
    if (success) {
      Alert.alert(t('common.success', 'Başarılı'), t('dailyContent.queueSuccess', 'İçerik onay bekleyen kuyruğa eklendi.'));
      setAddModalVisible(false);
    } else {
      Alert.alert(t('common.error', 'Hata'), t('dailyContent.queueError', 'İçerik eklenirken bir hata oluştu.'));
    }
  };

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
            {i18n.language.startsWith('tr')
              ? 'Bugün için seçilmiş ayet, hadis ve söz'
              : 'Curated verse, hadith and quote for today'}
          </Text>
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
          isEditor={isEditor}
          onAddClick={handleAddClick}
          onStoryShare={() =>
            openShareModal('verse', t('daily.verse', 'Günün Ayeti'), dailyContent.verse, dailyContent.verseSource)
          }
        />

        {/* Live AdMob Native Ad */}
        <AdBanner />

        <ContentCard
          type="hadith"
          title={t('daily.hadith', 'Günün Hadisi')}
          text={dailyContent.hadith}
          source={dailyContent.hadithSource}
          delay={240}
          isEditor={isEditor}
          onAddClick={handleAddClick}
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
          isEditor={isEditor}
          onAddClick={handleAddClick}
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
          {i18n.language.startsWith('tr')
            ? 'Görsel kart olarak paylaşmak için karta tıklayın'
            : 'Tap a card to share as a story image'}
        </Text>
      </Animated.View>

      <View style={{ height: spacing.xxl }} />

      {/* Add Content Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Yeni İçerik Ekle ({addType})</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, minHeight: 100 }]}
                placeholder="İçerik Metni (Arapça/Türkçe)"
                placeholderTextColor={theme.colors.textSecondary}
                value={addText}
                onChangeText={setAddText}
                multiline
                textAlignVertical="top"
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Kaynak (Örn: Buhari, İman 1)"
                placeholderTextColor={theme.colors.textSecondary}
                value={addSource}
                onChangeText={setAddSource}
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveContent}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet ve Sıraya Al'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  quoteDecor: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 64,
    color: 'rgba(255,255,255,0.15)',
    lineHeight: 52,
    marginBottom: -4,
    marginLeft: -4,
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
    color: 'rgba(255,255,255,0.65)',
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
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    textTransform: 'capitalize',
  },
  modalClose: {
    padding: 8,
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 20,
  },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
  },
  saveBtn: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: {
    color: '#FFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
});
