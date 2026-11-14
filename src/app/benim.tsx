import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Pressable, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { AppBackground } from '../components/ProgressRing';
import { IntentionCard } from '../components/IntentionCard';
import { StoryCardShareModal } from '../components/StoryCardShareModal';
import { loadHatimState, HatimState } from '../services/hatimService';
import { loadIntention } from '../services/intentionService';
import { isIntentionCurrent } from '../utils/intention';
import { directionalIconStyle } from '../utils/rtl';

/**
 * "Benim": a personal summary that lives on this device. Nothing here is sent anywhere; the share card
 * is an image the user chooses to send.
 */
export default function BenimScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  // Edge-to-edge / cut-out safe, the same way the other full screens do it.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const [hatim, setHatim] = useState<HatimState | null>(null);
  const [intentionText, setIntentionText] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadHatimState(), loadIntention()]).then(([state, intention]) => {
      if (!active) return;
      setHatim(state);
      setIntentionText(isIntentionCurrent(intention, new Date()) ? intention?.text ?? null : null);
    });
    return () => {
      active = false;
    };
  }, []);

  const shareText = intentionText
    ? t('benim.shareIntention', 'Bu haftaki niyetim: {{text}}', { text: intentionText })
    : t('benim.shareHatim', '{{n}}. hatmimi takip ediyorum, elhamdülillah!', { n: hatim?.completedHatims ?? 0 });

  return (
    <AppBackground isDark={isDark}>
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: c.surfaceStrong, borderColor: c.border }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
          >
            <Feather name="arrow-left" size={20} color={c.text} style={directionalIconStyle} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t('benim.title', 'Benim özetim')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.note, { color: c.textSecondary }]}>
            {t('benim.localNote', 'Bu sayfadaki her şey yalnızca bu cihazda tutulur.')}
          </Text>

          <IntentionCard />

          <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t('benim.hatimTitle', 'Kur’an hatmi')}</Text>
            {hatim ? (
              <>
                <Text style={[styles.stat, { color: c.text }]}>
                  {t('benim.hatimPage', '{{page}} / 604. sayfa · {{juz}}. cüz', { page: hatim.currentPage, juz: hatim.currentJuz })}
                </Text>
                <Text style={[styles.sub, { color: c.textSecondary }]}>
                  {t('benim.hatimCompleted', 'Tamamlanan hatim: {{count}}', { count: hatim.completedHatims })}
                </Text>
              </>
            ) : (
              <Text style={[styles.sub, { color: c.textSecondary }]}>{t('benim.loading', 'Yükleniyor…')}</Text>
            )}
          </View>

          <Pressable
            onPress={() => setShareOpen(true)}
            accessibilityRole="button"
            style={[styles.shareBtn, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Feather name="share-2" size={16} color={c.primaryText} />
            <Text style={[styles.shareText, { color: c.primaryText }]}>{t('benim.share', 'Paylaşılabilir kart oluştur')}</Text>
          </Pressable>
        </ScrollView>
      </View>

      {shareOpen ? (
        <StoryCardShareModal
          visible
          onClose={() => setShareOpen(false)}
          title={t('benim.title', 'Benim özetim')}
          text={shareText}
          source="Vera"
          type="quote"
        />
      ) : null}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 40 },
  note: { fontSize: 12.5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, gap: 6 },
  cardTitle: { fontSize: 15.5, fontFamily: 'Outfit_700Bold' },
  stat: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  sub: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  shareText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
