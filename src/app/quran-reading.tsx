import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, Easing, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useQuranSettings } from '../context/QuranSettingsContext';
import { saveLastRead } from '../services/quranStorage';
import { getVersesByPage, getJuzStartPage } from '../services/quranRepository';
import { Verse } from '../services/quranDatabase';
import { SURAHS } from '../data/quranMeta';
import { QuranStyleSelector } from '../components/QuranStyleSelector';

// ── Tema Sabitleri ────────────────────────────────────────────────────────────
const THEME = {
  dark: {
    bg: '#110D06',
    pageBg: '#1A1208',
    border: '#3A2E1A',
    text: '#E2CFA0',
    textSecondary: '#A08060',
    primary: '#C9A84C',
    header: 'rgba(17,13,6,0.97)',
    footer: 'rgba(17,13,6,0.97)',
    surahDivider: '#2A2010',
  },
  light: {
    bg: '#EDE8DC',
    pageBg: '#FDF8ED',
    border: '#D4C9AE',
    text: '#2C1A0A',
    textSecondary: '#8C7055',
    primary: '#7B4F1A',
    header: 'rgba(253,248,237,0.97)',
    footer: 'rgba(253,248,237,0.97)',
    surahDivider: '#EDE3CC',
  },
};

const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ';

// ── Sure Başlığı Komponenti ────────────────────────────────────────────────
const SurahHeader = ({
  surahNo,
  colors,
  fontFamily,
}: {
  surahNo: number;
  colors: typeof THEME.dark;
  fontFamily: string;
}) => {
  const surah = SURAHS.find((s) => s.number === surahNo);
  if (!surah) return null;

  // Fatiha (1) ve Tevbe (9) için Besmele yok
  const showBismillah = surahNo !== 9;

  return (
    <View style={[surahHeaderStyles.container, { borderColor: colors.border, backgroundColor: colors.surahDivider }]}>
      {/* Dekoratif çizgiler */}
      <View style={[surahHeaderStyles.decorLine, { backgroundColor: colors.primary }]} />
      <View style={[surahHeaderStyles.inner]}>
        <Text style={[surahHeaderStyles.arabicName, { color: colors.primary }]}>{surah.nameArabic}</Text>
        <Text style={[surahHeaderStyles.turkishName, { color: colors.textSecondary }]}>{surah.nameTurkish}</Text>
        <Text style={[surahHeaderStyles.verseCount, { color: colors.textSecondary }]}>{surah.verseCount} Ayet</Text>
      </View>
      <View style={[surahHeaderStyles.decorLine, { backgroundColor: colors.primary }]} />

      {showBismillah && (
        <Text style={[surahHeaderStyles.bismillah, { color: colors.text, fontFamily }]}>{BISMILLAH}</Text>
      )}
    </View>
  );
};

const surahHeaderStyles = StyleSheet.create({
  container: {
    marginVertical: 24,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  decorLine: {
    height: 1,
    width: 60,
    borderRadius: 1,
    opacity: 0.5,
  },
  inner: { alignItems: 'center', paddingVertical: 8 },
  arabicName: {
    fontSize: 28,
    lineHeight: 42,
    fontFamily: 'serif',
  },
  turkishName: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  verseCount: {
    fontSize: 11,
    marginTop: 2,
  },
  bismillah: {
    fontSize: 20,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'serif',
  },
});

// ── Sayfa İçeriği (memoized) ───────────────────────────────────────────────
const PageContent = React.memo(({
  verses,
  colors,
  fontFamily,
  baseFontSize,
}: {
  verses: Verse[];
  colors: typeof THEME.dark;
  fontFamily: string;
  baseFontSize: number;
}) => {
  // Sayfadaki sureleri grupla
  const surahGroups: { surahNo: number; verses: Verse[] }[] = [];
  for (const verse of verses) {
    const last = surahGroups[surahGroups.length - 1];
    if (!last || last.surahNo !== verse.surahNo) {
      surahGroups.push({ surahNo: verse.surahNo, verses: [verse] });
    } else {
      last.verses.push(verse);
    }
  }

  return (
    <>
      {surahGroups.map((group) => (
        <View key={group.surahNo}>
          {/* Sayfada yeni bir sure başlıyorsa ve surenin ilk ayeti 1 ise başlık göster */}
          {group.verses[0].ayahNo === 1 && (
            <SurahHeader surahNo={group.surahNo} colors={colors} fontFamily={fontFamily} />
          )}
          <Text style={[styles.arabicText, { color: colors.text, fontFamily, fontSize: baseFontSize, lineHeight: baseFontSize * 2 }]}>
            {group.verses.map((verse) => (
              <Text key={verse.id}>
                {verse.arabicText}
                <Text style={[styles.verseNumber, { color: colors.primary, fontFamily }]}>
                  {' '}
                  ﴿{verse.ayahNo}﴾{' '}
                </Text>
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </>
  );
});
PageContent.displayName = 'PageContent';

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function QuranReadingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark: appIsDark, isFullscreen } = useTheme();
  const { t } = useTranslation();
  const isLandscape = width > height;

  const params = useLocalSearchParams();
  const initialJuz = params.juz ? Number(params.juz) : 1;
  const initialPage = params.page ? Number(params.page) : null;
  const surahNameParam = params.surahName ? String(params.surahName) : t('quran.juzNum', { num: initialJuz });

  const [juz] = useState(initialJuz);
  const [surahName] = useState(surahNameParam);
  const [page, setPage] = useState<number>(initialPage || 1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(appIsDark);
  const [styleSelectorVisible, setStyleSelectorVisible] = useState(false);

  const { scriptType, isFontLoaded, fontSizeMultiplier, isStyleSelected } = useQuranSettings();
  
  const customFontFamily = (scriptType !== 'quran-imlaei' && isFontLoaded) ? scriptType : 'serif';
  // IndoPak generally needs a larger base font size to be readable
  const defaultFontSize = scriptType === 'quran-indopak' ? 32 : 26;
  const currentFontSize = defaultFontSize * fontSizeMultiplier;

  const colors = isDarkMode ? THEME.dark : THEME.light;

  // Footer görünürlüğü (dokunuşta toggle)
  const footerOpacity = useSharedValue(1);
  const [footerVisible, setFooterVisible] = useState(true);
  const animatedFooter = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  const toggleFooter = useCallback(() => {
    const next = !footerVisible;
    setFooterVisible(next);
    footerOpacity.value = withTiming(next ? 1 : 0, { duration: 250 });
  }, [footerVisible]);

  useEffect(() => {
    if (!initialPage) {
      getJuzStartPage(juz).then((p) => setPage(p));
    }
  }, [initialPage, juz]);

  useEffect(() => {
    // İlk açılışta veya font yüklenmemişse font/stili kontrol et
    if (!isStyleSelected && isFontLoaded) {
      setStyleSelectorVisible(true);
    }
  }, [isStyleSelected, isFontLoaded]);

  const loadVerses = useCallback(async (pageNo: number) => {
    setLoading(true);
    try {
      const data = await getVersesByPage(pageNo);
      setVerses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVerses(page); }, [page, loadVerses]);

  useEffect(() => {
    return () => {
      saveLastRead(juz, verses.length > 0 ? verses[0].surahNo : 1, surahName, page);
    };
  }, [juz, verses, surahName, page]);

  const handleNextPage = useCallback(() => {
    if (page < 604) setPage((p) => p + 1);
  }, [page]);

  const handlePrevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-35, 35])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -35) handleNextPage();
      else if (e.translationX > 35) handlePrevPage();
    })
    .runOnJS(true);

  const tapGesture = Gesture.Tap()
    .onEnd(() => toggleFooter())
    .runOnJS(true);

  const composed = Gesture.Simultaneous(swipeGesture, tapGesture);

  const contentPaddingH = isLandscape ? Math.max(insets.left, insets.right, 48) : 24;
  const contentPaddingHNarrow = isLandscape ? Math.max(insets.left, insets.right, 48) : 20;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen} />

        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: colors.header,
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 44) : (StatusBar.currentHeight ?? 24) + 10,
              paddingHorizontal: contentPaddingH,
            },
            animatedFooter,
          ]}
        >
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]} onPress={() => {
            saveLastRead(juz, verses.length > 0 ? verses[0].surahNo : 1, surahName, page);
            router.back();
          }}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerSurah, { color: colors.text }]}>{surahName}</Text>
            <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
              {t('quran.juzNum', { num: juz })}  •  {t('quran.pageNum', { num: page })}
            </Text>
          </View>

          {/* Gece/Gündüz Modu */}
          <Pressable
            style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]}
            onPress={() => setIsDarkMode((v) => !v)}
          >
            <Feather name={isDarkMode ? 'sun' : 'moon'} size={18} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* ── İçerik ── */}
        <GestureDetector gesture={composed}>
          <View style={[styles.pageWrapper, { backgroundColor: colors.bg }]}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : verses.length === 0 ? (
              <View style={styles.center}>
                <Feather name="book-open" size={60} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('quran.noData')}
                </Text>
              </View>
            ) : (
              <Animated.ScrollView
                key={page}
                entering={FadeIn.duration(350).easing(Easing.out(Easing.ease))}
                contentContainerStyle={[
                  styles.scrollContent,
                  {
                    paddingHorizontal: contentPaddingHNarrow,
                    paddingBottom: 110,
                    paddingTop: 24,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* Sayfa çerçevesi */}
                <View style={[styles.pageFrame, { backgroundColor: colors.pageBg, borderColor: colors.border }]}>
                  <PageContent 
                    verses={verses} 
                    colors={colors} 
                    fontFamily={customFontFamily} 
                    baseFontSize={currentFontSize} 
                  />
                </View>
              </Animated.ScrollView>
            )}
          </View>
        </GestureDetector>

        {/* ── Footer ── */}
        <Animated.View
          style={[
            styles.footer,
            {
              backgroundColor: colors.footer,
              borderTopColor: colors.border,
              paddingHorizontal: contentPaddingH,
              paddingBottom: Math.max(insets.bottom + 16, 16),
            },
            animatedFooter,
          ]}
        >
          <Pressable
            style={[styles.navBtn, { backgroundColor: colors.surahDivider, opacity: page <= 1 ? 0.35 : 1 }]}
            onPress={handlePrevPage}
            disabled={page <= 1}
          >
            <Feather name="chevron-left" size={22} color={colors.text} />
            <Text style={[styles.navBtnText, { color: colors.text }]}>{t('quran.previous')}</Text>
          </Pressable>

          <View style={[styles.pageChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.pageChipText, { color: colors.primary }]}>{page} / 604</Text>
          </View>

          <Pressable
            style={[styles.navBtn, { backgroundColor: colors.surahDivider, opacity: page >= 604 ? 0.35 : 1 }]}
            onPress={handleNextPage}
            disabled={page >= 604}
          >
            <Text style={[styles.navBtnText, { color: colors.text }]}>{t('quran.next')}</Text>
            <Feather name="chevron-right" size={22} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* Hat / Stil Seçici Modal */}
        {styleSelectorVisible && (
          <QuranStyleSelector 
            visible={styleSelectorVisible} 
            onClose={() => setStyleSelectorVisible(false)} 
            isInitialSetup={!isStyleSelected} 
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSurah: {
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '600',
  },
  headerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  pageWrapper: { flex: 1 },
  scrollContent: {},
  pageFrame: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  arabicText: {
    fontSize: 26,
    lineHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'serif',
  },
  verseNumber: {
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pageChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
