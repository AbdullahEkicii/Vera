import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import i18n from '../localization/i18n';
import { createPost, loadCommunitySettings, resolveCountry } from '../services/communityService';
import { markPromptAnswered } from '../services/communityPrompts';
import {
  logCommunityShareFailed,
  logCommunityShareSubmitted,
  logCommunitySharePromptAnswer,
  logCommunitySharePromptShown,
} from '../services/analyticsService';
import { CommunityPostParams, CommunityTemplateKey } from '../utils/community';
import { templateText } from '../utils/communityText';

// Fixed brand colours for the share card (DESIGN.md: share cards keep the gold identity).
const CARD_BG = ['#1A1207', '#2B1E0C'] as const;
const GOLD = '#D4AF37';
const GOLD_DEEP = '#B8860B';
const INK = '#1A1207';
const CARD_TEXT = '#F5EFE0';
const CARD_MUTED = '#A89880';

interface Props {
  visible: boolean;
  templateKey: CommunityTemplateKey;
  params: CommunityPostParams;
  // Set for automatic offers: answering hides that event's offer for good.
  // Left out for a button the user taps, which can always be used again.
  promptKey?: string;
  onDone: () => void;
}

/**
 * The share sheet for one achievement. The text is the fixed template in the viewer's language and
 * cannot be edited. Nothing leaves the device until "Paylaş" is pressed.
 */
export function CommunitySharePrompt({ visible, templateKey, params, promptKey, onDone }: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const reduceMotion = useReducedMotion();
  const lang = (i18n.language || 'en').split('-')[0];
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);

  const text = templateText(t, templateKey, params, lang);

  useEffect(() => {
    if (visible) {
      setFailed(false);
      setSent(false);
      logCommunitySharePromptShown(templateKey);
    }
  }, [visible, templateKey]);

  const close = async (answer: 'accept' | 'decline' | 'later') => {
    if (promptKey) await markPromptAnswered(promptKey);
    logCommunitySharePromptAnswer(templateKey, answer);
    onDone();
  };

  const onSubmit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const settings = await loadCommunitySettings();
      const country = resolveCountry(settings);
      await createPost(templateKey, country ? { ...params, country } : params);
      logCommunityShareSubmitted(templateKey, Boolean(country));
      setSent(true);
      // One short confirmation, then the sheet closes on its own.
      setTimeout(() => close('accept'), 900);
    } catch {
      logCommunityShareFailed(templateKey, 'write_failed');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const onSystemShare = () => {
    Share.share({ message: text }).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => close('decline')}>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close('later')} accessibilityLabel={t('community.share.later', 'Şimdi değil')}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.scrim} />
        </Pressable>

        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.springify().damping(18).stiffness(180)}
          style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border }]}
        >
          <View style={[styles.grabber, { backgroundColor: c.textSecondary }]} />

          <View style={styles.head}>
            <Text style={[styles.title, { color: c.text }]}>
              {t('community.share.heading', 'Topluluğa paylaş')}
            </Text>
            <Text style={[styles.intro, { color: c.textSecondary }]}>
              {t('community.share.intro', 'Dünyanın dört bir yanındaki kardeşlerin de görebilir. Adın gizli kalır.')}
            </Text>
          </View>

          {/* Hero preview: the exact text that will be shared, set large. */}
          <View style={[styles.cardShadow, { shadowColor: INK }]}>
            <LinearGradient colors={CARD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.mark}>
                  <Feather name={sent ? 'check' : 'star'} size={16} color={INK} />
                </View>
                <Text style={styles.cardMeta}>{t('community.anonymous', 'Anonim kardeş')}</Text>
              </View>

              <Text style={styles.cardText}>{text}</Text>

              <View style={styles.cardRule} />
              <Text style={styles.cardFoot}>
                {sent
                  ? t('community.share.sent', 'Paylaşıldı')
                  : t('community.share.note', 'Yalnızca bu cümle paylaşılır. Adın ve kişisel bilgilerin görünmez.')}
              </Text>
            </LinearGradient>
          </View>

          {failed && (
            <Text style={[styles.error, { color: c.danger }]}>
              {t('community.share.failed', 'Paylaşılamadı, daha sonra tekrar dene.')}
            </Text>
          )}

          {/* The single gold element: the primary action. */}
          <Pressable
            onPress={onSubmit}
            disabled={busy || sent}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryWrap, { opacity: pressed || busy ? 0.85 : 1 }]}
          >
            <LinearGradient colors={[GOLD, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primary}>
              <Feather name="send" size={16} color={INK} />
              <Text style={styles.primaryText}>{t('community.share.submit', 'Paylaş')}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onSystemShare}
            accessibilityRole="button"
            style={[styles.secondary, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <Feather name="share-2" size={15} color={c.text} />
            <Text style={[styles.secondaryText, { color: c.text }]}>
              {t('community.share.external', 'Başka uygulamada paylaş')}
            </Text>
          </Pressable>

          <Pressable onPress={() => close('later')} accessibilityRole="button" style={styles.later}>
            <Text style={[styles.laterText, { color: c.textSecondary }]}>{t('community.share.later', 'Şimdi değil')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 17, 23, 0.35)' },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    gap: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, opacity: 0.35, marginBottom: 4 },
  head: { gap: 6 },
  title: { fontSize: 30, lineHeight: 36, fontFamily: 'Outfit_700Bold' },
  intro: { fontSize: 15, lineHeight: 21, fontFamily: 'Outfit_400Regular' },
  cardShadow: {
    borderRadius: 24,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { color: CARD_MUTED, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  cardText: { color: CARD_TEXT, fontSize: 26, lineHeight: 34, fontFamily: 'Outfit_600SemiBold', minHeight: 96 },
  cardRule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(212, 175, 55, 0.25)' },
  cardFoot: { color: CARD_MUTED, fontSize: 12.5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  error: { fontSize: 13, fontFamily: 'Outfit_400Regular' },
  primaryWrap: { borderRadius: 16, overflow: 'hidden' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
  },
  primaryText: { color: INK, fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  secondaryText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  later: { alignItems: 'center', paddingVertical: 4 },
  laterText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
