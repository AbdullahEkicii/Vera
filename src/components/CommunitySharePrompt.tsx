import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { Easing, FadeIn, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import i18n from '../localization/i18n';
import {
  CommunityPostError,
  CommunityPostFailure,
  createPost,
  loadCommunitySettings,
  resolveCountry,
} from '../services/communityService';
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

// How long the user waits on "Paylaş" before the sheet says the connection is the problem.
const SUBMIT_WAIT_MS = 15000;
const SHEET_ENTER_MS = 280;

interface Props {
  visible: boolean;
  templateKey: CommunityTemplateKey;
  params: CommunityPostParams;
  // Set for automatic offers: answering hides that event's offer for good.
  // Left out for a button the user taps, which can always be used again.
  promptKey?: string;
  onDone: () => void;
}

const FAILURE_FALLBACK: CommunityPostFailure = 'unknown';

function waitFor<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CommunityPostError('offline')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
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
  const [failure, setFailure] = useState<CommunityPostFailure | null>(null);
  const [sent, setSent] = useState(false);
  // The write in flight. A timed-out wait keeps it, so "Tekrar dene" waits for the same write
  // instead of sending a second copy of the post.
  const inFlight = useRef<Promise<string> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const text = templateText(t, templateKey, params, lang);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setFailure(null);
      setSent(false);
      logCommunitySharePromptShown(templateKey);
    }
  }, [visible, templateKey]);

  const close = async (answer: 'accept' | 'decline' | 'later') => {
    if (promptKey) await markPromptAnswered(promptKey);
    logCommunitySharePromptAnswer(templateKey, answer);
    onDone();
  };

  const startWrite = (): Promise<string> => {
    if (!inFlight.current) {
      const write = (async () => {
        const settings = await loadCommunitySettings();
        const country = resolveCountry(settings);
        const id = await createPost(templateKey, country ? { ...params, country } : params);
        return { id, countryVisible: Boolean(country) };
      })();
      const promise = write.then((result) => {
        logCommunityShareSubmitted(templateKey, result.countryVisible);
        return result.id;
      });
      inFlight.current = promise;
      // A definite failure (not a timeout) clears the slot, so the next tap starts a fresh write.
      promise.catch(() => {
        if (inFlight.current === promise) inFlight.current = null;
      });
    }
    return inFlight.current;
  };

  const onSubmit = async () => {
    if (busy || sent) return;
    setBusy(true);
    setFailure(null);
    try {
      await waitFor(startWrite(), SUBMIT_WAIT_MS);
      if (!mounted.current) return;
      setSent(true);
      // One short confirmation, then the sheet closes on its own.
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        close('accept');
      }, 900);
    } catch (error) {
      const reason = error instanceof CommunityPostError ? error.reason : FAILURE_FALLBACK;
      logCommunityShareFailed(templateKey, reason);
      if (mounted.current) setFailure(reason);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const failureText = (reason: CommunityPostFailure): string => {
    switch (reason) {
      case 'offline':
        return t(
          'community.share.errorOffline',
          'Bağlantı yavaş ya da yok. İnternetini kontrol edip tekrar dene. Gönderi aynı kalır, iki kez paylaşılmaz.'
        );
      case 'auth':
        return t('community.share.errorAuth', 'Topluluk oturumu açılamadı. Uygulamayı kapatıp tekrar aç.');
      case 'denied':
        return t('community.share.errorDenied', 'Bu paylaşım şu an kabul edilmiyor. Daha sonra tekrar dene.');
      case 'invalid':
        return t('community.share.errorInvalid', 'Bu paylaşım türü şu an desteklenmiyor.');
      default:
        return t('community.share.errorUnknown', 'Beklenmeyen bir hata oldu. Tekrar dene.');
    }
  };

  const onSystemShare = () => {
    Share.share({ message: text }).catch(() => {});
  };

  const submitLabel = sent
    ? t('community.share.sentLabel', 'Paylaşıldı')
    : busy
      ? t('community.share.sending', 'Paylaşılıyor…')
      : failure
        ? t('community.share.retry', 'Tekrar dene')
        : t('community.share.submit', 'Paylaş');

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close('decline')}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close('later')} accessibilityLabel={t('community.share.later', 'Şimdi değil')}>
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(SHEET_ENTER_MS)} style={StyleSheet.absoluteFill}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.scrim} />
          </Animated.View>
        </Pressable>

        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.duration(SHEET_ENTER_MS).easing(Easing.out(Easing.cubic))}
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

          {failure && (
            <View
              accessibilityRole="alert"
              style={[styles.errorBox, { borderColor: c.danger, backgroundColor: c.surface }]}
            >
              <Feather name="alert-circle" size={16} color={c.danger} />
              <Text style={[styles.error, { color: c.text }]}>{failureText(failure)}</Text>
            </View>
          )}

          {/* The single gold element: the primary action. */}
          <Pressable
            onPress={onSubmit}
            disabled={busy || sent}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy || sent }}
            style={({ pressed }) => [styles.primaryWrap, { opacity: pressed && !busy ? 0.85 : 1 }]}
          >
            <LinearGradient colors={[GOLD, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primary}>
              {busy ? (
                <ActivityIndicator color={INK} />
              ) : (
                <Feather name={sent ? 'check' : failure ? 'refresh-cw' : 'send'} size={16} color={INK} />
              )}
              <Text style={styles.primaryText}>{submitLabel}</Text>
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
      </View>
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  error: { flex: 1, fontSize: 13.5, lineHeight: 19, fontFamily: 'Outfit_400Regular' },
  primaryWrap: { borderRadius: 16, overflow: 'hidden' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
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
