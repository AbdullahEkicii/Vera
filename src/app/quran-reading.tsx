import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, Easing, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTheme } from '../context/ThemeContext';
import { useQuranSettings } from '../context/QuranSettingsContext';
import { typography } from '../utils/theme';
import { saveLastRead } from '../services/quranStorage';
import { SURAHS, getJuzForPage } from '../data/quranMeta';
import {
  checkJuzStatus,
  downloadJuz,
  getVersesByPage,
  getJuzStartPage,
} from '../services/quranRepository';
import { Verse } from '../services/quranDatabase';
import { QuranStyleSelector } from '../components/QuranStyleSelector';
import { PageMealModal } from '../components/PageMealModal';
import { QuranPrayersModal } from '../components/QuranPrayersModal';
import { updateHatimPage } from '../services/hatimService';
import { logScreenView, logQuranSurahRead } from '../services/analyticsService';

// ── Tema Sabitleri ve Tipleri ──────────────────────────────────────────────────
const QURAN_THEME_STORAGE_KEY = 'QURAN_READING_THEME_KEY';

export type QuranThemeKey = 'sepia' | 'dark' | 'white' | 'green' | 'navy';

export interface QuranTheme {
  key: QuranThemeKey;
  nameTR: string;
  nameEN: string;
  previewBg: string;
  previewBorder: string;
  previewText: string;
  bg: string;
  pageBg: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  header: string;
  footer: string;
  surahDivider: string;
  isDarkContent: boolean;
}

export const QURAN_THEMES: Record<QuranThemeKey, QuranTheme> = {
  sepia: {
    key: 'sepia',
    nameTR: 'Krem / Sepia',
    nameEN: 'Cream / Sepia',
    previewBg: '#FDF8ED',
    previewBorder: '#D4C9AE',
    previewText: '#2C1A0A',
    bg: '#EDE8DC',
    pageBg: '#FDF8ED',
    border: '#D4C9AE',
    text: '#2C1A0A',
    textSecondary: '#8C7055',
    primary: '#7B4F1A',
    header: 'rgba(253,248,237,0.97)',
    footer: 'rgba(253,248,237,0.97)',
    surahDivider: '#EDE3CC',
    isDarkContent: false,
  },
  dark: {
    key: 'dark',
    nameTR: 'Gece / Siyah',
    nameEN: 'Dark Night',
    previewBg: '#1A1208',
    previewBorder: '#3A2E1A',
    previewText: '#E2CFA0',
    bg: '#110D06',
    pageBg: '#1A1208',
    border: '#3A2E1A',
    text: '#E2CFA0',
    textSecondary: '#A08060',
    primary: '#C9A84C',
    header: 'rgba(17,13,6,0.97)',
    footer: 'rgba(17,13,6,0.97)',
    surahDivider: '#2A2010',
    isDarkContent: true,
  },
  white: {
    key: 'white',
    nameTR: 'Saf Beyaz',
    nameEN: 'Classic White',
    previewBg: '#FFFFFF',
    previewBorder: '#CBD5E1',
    previewText: '#0F172A',
    bg: '#F1F5F9',
    pageBg: '#FFFFFF',
    border: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#0284C7',
    header: 'rgba(255,255,255,0.97)',
    footer: 'rgba(255,255,255,0.97)',
    surahDivider: '#E2E8F0',
    isDarkContent: false,
  },
  green: {
    key: 'green',
    nameTR: 'Safir Yeşil',
    nameEN: 'Emerald Sage',
    previewBg: '#EAF3EE',
    previewBorder: '#A3D0B9',
    previewText: '#0D3B2E',
    bg: '#D5E5DB',
    pageBg: '#EAF3EE',
    border: '#A3D0B9',
    text: '#0D3B2E',
    textSecondary: '#3B7A68',
    primary: '#059669',
    header: 'rgba(234,243,238,0.97)',
    footer: 'rgba(234,243,238,0.97)',
    surahDivider: '#CCE3D6',
    isDarkContent: false,
  },
  navy: {
    key: 'navy',
    nameTR: 'Gece Mavisi',
    nameEN: 'Midnight Navy',
    previewBg: '#1E293B',
    previewBorder: '#334155',
    previewText: '#F1F5F9',
    bg: '#0F172A',
    pageBg: '#1E293B',
    border: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    primary: '#38BDF8',
    header: 'rgba(15,23,42,0.97)',
    footer: 'rgba(15,23,42,0.97)',
    surahDivider: '#1E293B',
    isDarkContent: true,
  },
};

const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ';

const SurahEndDivider = ({ surahNo, colors }: { surahNo: number; colors: QuranTheme }) => {
  const { t } = useTranslation();
  const surah = SURAHS.find((s) => s.number === surahNo);
  const nextSurah = SURAHS.find((s) => s.number === surahNo + 1);

  if (!surah) return null;

  return (
    <View style={[surahEndStyles.container, { borderColor: colors.primary + '40', backgroundColor: colors.surahDivider }]}>
      <View style={[surahEndStyles.iconBadge, { backgroundColor: colors.primary + '25' }]}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
      </View>

      <Text style={[surahEndStyles.title, { color: colors.text }]}>
        ✨ {surah.nameTurkish} {t('quran.surahEnd', 'End of Surah')}
      </Text>

      <Text style={[surahEndStyles.subtitle, { color: colors.textSecondary }]}>
        {t('quran.totalVersesRead', 'All {{count}} Verses Read', { count: surah.verseCount })}
      </Text>

      {nextSurah && (
        <View style={[surahEndStyles.nextSurahPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
          <Text style={[surahEndStyles.nextSurahText, { color: colors.primary }]}>
            {t('quran.nextSurah', 'Next Surah')}: {nextSurah.nameTurkish} ({nextSurah.nameArabic}) ➔
          </Text>
        </View>
      )}
    </View>
  );
};

const surahEndStyles = StyleSheet.create({
  container: {
    marginVertical: 24,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    opacity: 0.85,
  },
  nextSurahPill: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  nextSurahText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
});

// ── Sure Başlığı Komponenti ────────────────────────────────────────────────
const SurahHeader = ({
  surahNo,
  colors,
  fontFamily,
}: {
  surahNo: number;
  colors: QuranTheme;
  fontFamily: string;
}) => {
  const surah = SURAHS.find((s) => s.number === surahNo);
  if (!surah) return null;

  const showBismillah = surahNo !== 9;

  return (
    <View style={[surahHeaderStyles.container, { borderColor: colors.border, backgroundColor: colors.surahDivider }]}>
      <View style={[surahHeaderStyles.decorLine, { backgroundColor: colors.primary }]} />
      <View style={surahHeaderStyles.inner}>
        <Text style={[surahHeaderStyles.arabicName, { color: colors.primary, fontFamily }]}>{surah.nameArabic}</Text>
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
  isLandscape = false,
}: {
  verses: Verse[];
  colors: QuranTheme;
  fontFamily: string;
  baseFontSize: number;
  isLandscape?: boolean;
}) => {
  const surahGroups: { surahNo: number; verses: Verse[] }[] = [];
  for (const verse of verses) {
    const last = surahGroups[surahGroups.length - 1];
    if (!last || last.surahNo !== verse.surahNo) {
      surahGroups.push({ surahNo: verse.surahNo, verses: [verse] });
    } else {
      last.verses.push(verse);
    }
  }

  const lineHeightCalc = baseFontSize * (isLandscape ? 1.85 : 2);

  return (
    <>
      {surahGroups.map((group) => {
        const surahInfo = SURAHS.find((s) => s.number === group.surahNo);
        const lastAyahOnPage = group.verses[group.verses.length - 1];
        const isSurahCompletedOnPage = surahInfo && lastAyahOnPage && lastAyahOnPage.ayahNo === surahInfo.verseCount;

        return (
          <View key={group.surahNo}>
            {group.verses[0].ayahNo === 1 && (
              <SurahHeader surahNo={group.surahNo} colors={colors} fontFamily={fontFamily} />
            )}
            <Text style={[styles.arabicText, { color: colors.text, fontFamily, fontSize: baseFontSize, lineHeight: lineHeightCalc }]}>
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

            {isSurahCompletedOnPage && (
              <SurahEndDivider surahNo={group.surahNo} colors={colors} />
            )}
          </View>
        );
      })}
    </>
  );
});

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function QuranReadingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark: appIsDark, isFullscreen } = useTheme();
  const { t, i18n } = useTranslation();
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

  const [themeKey, setThemeKey] = useState<QuranThemeKey>(appIsDark ? 'dark' : 'sepia');
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [styleSelectorVisible, setStyleSelectorVisible] = useState(false);
  const [pageMealVisible, setPageMealVisible] = useState(false);
  const [prayersModalVisible, setPrayersModalVisible] = useState(false);

  useEffect(() => {
    logScreenView('QuranReadingScreen');
    if (params.surah) {
      logQuranSurahRead(Number(params.surah), surahNameParam);
    }
    AsyncStorage.getItem(QURAN_THEME_STORAGE_KEY)
      .then((saved: string | null) => {
        if (saved && saved in QURAN_THEMES) {
          setThemeKey(saved as QuranThemeKey);
        }
      })
      .catch(() => {});
  }, []);

  const changeTheme = (key: QuranThemeKey) => {
    setThemeKey(key);
    AsyncStorage.setItem(QURAN_THEME_STORAGE_KEY, key).catch(() => {});
  };

  const { scriptType, isFontLoaded, fontSizeMultiplier, setFontSizeMultiplier, isStyleSelected } = useQuranSettings();

  const increaseFontSize = () => {
    if (setFontSizeMultiplier) {
      const next = Math.min(2.2, Math.round((fontSizeMultiplier + 0.15) * 100) / 100);
      setFontSizeMultiplier(next);
    }
  };

  const decreaseFontSize = () => {
    if (setFontSizeMultiplier) {
      const next = Math.max(0.75, Math.round((fontSizeMultiplier - 0.15) * 100) / 100);
      setFontSizeMultiplier(next);
    }
  };

  const customFontFamily = isFontLoaded ? scriptType : 'serif';
  const defaultFontSize = scriptType === 'quran-indopak' ? 32 : (scriptType === 'quran-husrev' ? 36 : 26);
  const currentFontSize = defaultFontSize * fontSizeMultiplier;

  const colors = QURAN_THEMES[themeKey] || QURAN_THEMES.sepia;

  // UI Görünürlüğü (dokunuşta tam ekran)
  const [footerVisible, setFooterVisible] = useState(true);
  const uiVisible = useSharedValue(true);

  const animatedHeader = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(uiVisible.value ? 0 : -120, { duration: 300, easing: Easing.out(Easing.ease) }) }],
    opacity: withTiming(uiVisible.value ? 1 : 0, { duration: 200 }),
  }));

  const animatedFooter = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(uiVisible.value ? 0 : 120, { duration: 300, easing: Easing.out(Easing.ease) }) }],
    opacity: withTiming(uiVisible.value ? 1 : 0, { duration: 200 }),
  }));

  const toggleFooter = useCallback(() => {
    const next = !uiVisible.value;
    uiVisible.value = next;
    setFooterVisible(next);
  }, []);

  useEffect(() => {
    if (!initialPage) {
      getJuzStartPage(juz).then((p) => setPage(p));
    }
  }, [initialPage, juz]);

  useEffect(() => {
    if (!isStyleSelected && isFontLoaded) {
      setStyleSelectorVisible(true);
    }
  }, [isStyleSelected, isFontLoaded]);

  const pageCacheRef = useRef<Map<number, Verse[]>>(new Map());

  const prevScriptTypeRef = useRef(scriptType);
  useEffect(() => {
    if (prevScriptTypeRef.current !== scriptType) {
      prevScriptTypeRef.current = scriptType;
      pageCacheRef.current.clear();
      setVerses([]);
      setLoading(true);
    }
  }, [scriptType]);

  const fetchPageVerses = useCallback(async (pNo: number): Promise<Verse[]> => {
    if (pageCacheRef.current.has(pNo)) {
      return pageCacheRef.current.get(pNo)!;
    }
    const targetJuz = getJuzForPage(pNo);
    const statusResult = await checkJuzStatus(targetJuz, scriptType);

    let data = await getVersesByPage(pNo);
    if (data.length === 0 || statusResult.status !== 'Downloaded') {
      await downloadJuz(targetJuz, 'ar', scriptType);
      data = await getVersesByPage(pNo);
    }
    if (data.length > 0) {
      pageCacheRef.current.set(pNo, data);
    }
    return data;
  }, [scriptType]);

  const loadVerses = useCallback(async (pageNo: number) => {
    if (pageCacheRef.current.has(pageNo)) {
      setVerses(pageCacheRef.current.get(pageNo)!);
      setLoading(false);
    } else {
      setLoading(true);
      try {
        const data = await fetchPageVerses(pageNo);
        setVerses(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (pageNo < 604 && !pageCacheRef.current.has(pageNo + 1)) {
      fetchPageVerses(pageNo + 1).catch(() => {});
    }
    if (pageNo > 1 && !pageCacheRef.current.has(pageNo - 1)) {
      fetchPageVerses(pageNo - 1).catch(() => {});
    }
  }, [fetchPageVerses]);

  // ── Pinch to Zoom & Gesture Handling ──
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    loadVerses(page);
    updateHatimPage(page).catch(() => {});
  }, [page, loadVerses]);

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

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.85), 2.5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.95) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
    })
    .runOnJS(true);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1);
      savedScale.value = 1;
    })
    .runOnJS(true);

  const tapGesture = Gesture.Tap()
    .onEnd(() => toggleFooter())
    .runOnJS(true);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-35, 35])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -35) handleNextPage();
      else if (e.translationX > 35) handlePrevPage();
    })
    .runOnJS(true);

  const composed = Gesture.Simultaneous(pinchGesture, doubleTapGesture, swipeGesture, tapGesture);

  const animatedPageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentPaddingH = isLandscape ? Math.max(insets.left, insets.right, 24) : 24;
  const contentPaddingHNarrow = isLandscape ? Math.max(insets.left, insets.right, 16) : 20;

  const headerPaddingTop = isLandscape
    ? (Platform.OS === 'ios' ? Math.max(insets.top, 10) : Math.max(StatusBar.currentHeight ?? 10, 10))
    : (Platform.OS === 'ios' ? Math.max(insets.top, 44) : (StatusBar.currentHeight ?? 24) + 10);

  const currentSurahNo = verses.length > 0 ? verses[0].surahNo : 1;
  const currentSurahObj = SURAHS.find((s) => s.number === currentSurahNo);
  const displaySurahName = currentSurahObj
    ? currentSurahObj.nameTurkish
    : surahName;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={colors.isDarkContent ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" hidden={isFullscreen || !footerVisible} />

        {/* ── Header ── */}
        <Animated.View
          pointerEvents={footerVisible ? 'auto' : 'none'}
          style={[
            styles.header,
            {
              backgroundColor: colors.header,
              borderBottomColor: colors.border,
              paddingTop: headerPaddingTop,
              paddingBottom: isLandscape ? 6 : 12,
              paddingHorizontal: contentPaddingH,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            },
            animatedHeader,
          ]}
        >
          <Pressable style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]} onPress={() => {
            saveLastRead(juz, verses.length > 0 ? verses[0].surahNo : 1, displaySurahName, page);
            router.back();
          }}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerSurah, { color: colors.text, fontSize: isLandscape ? 15 : 17 }]}>{displaySurahName}</Text>
            <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
              {t('quran.juzNum', { num: juz })}  •  {t('quran.pageNum', { num: page })}
            </Text>
          </View>

          <View style={styles.headerRightControls}>
            {/* Sayfa Meali Butonu */}
            <Pressable
              style={[styles.mealBtn, { backgroundColor: colors.surahDivider }]}
              onPress={() => setPageMealVisible(true)}
              hitSlop={6}
            >
              <Feather name="book-open" size={13} color={colors.text} />
              <Text style={[styles.mealBtnText, { color: colors.text }]} numberOfLines={1}>
                {t('quran.mealBtn', 'Meal')}
              </Text>
            </Pressable>

            {/* Yazı Boyutu Küçült (A-) */}
            <Pressable
              style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]}
              onPress={decreaseFontSize}
              hitSlop={6}
            >
              <Text style={[styles.fontSizeBtnText, { color: colors.text }]}>A-</Text>
            </Pressable>

            {/* Yazı Boyutu Büyült (A+) */}
            <Pressable
              style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]}
              onPress={increaseFontSize}
              hitSlop={6}
            >
              <Text style={[styles.fontSizeBtnText, { color: colors.text, fontSize: 16 }]}>A+</Text>
            </Pressable>

            {/* Tema Seçici Buton */}
            <Pressable
              style={[styles.headerBtn, { backgroundColor: colors.surahDivider }]}
              onPress={() => setThemeModalVisible(true)}
              hitSlop={6}
            >
              <Feather name="droplet" size={18} color={colors.text} />
            </Pressable>
          </View>
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
                    paddingBottom: isLandscape ? 70 : 120, // Alt kısımda boşluk, scroll sonuna kadar gitsin
                    paddingTop: headerPaddingTop + (isLandscape ? 30 : 50), // Üstte header'ın arkasında kalmasın
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* Sayfa çerçevesi ve Pinch Zoom */}
                <Animated.View style={[styles.pageFrame, { backgroundColor: colors.pageBg, borderColor: colors.border, padding: isLandscape ? 14 : 20 }, animatedPageStyle]}>
                  <PageContent 
                    verses={verses} 
                    colors={colors} 
                    fontFamily={customFontFamily} 
                    baseFontSize={currentFontSize} 
                    isLandscape={isLandscape}
                  />
                </Animated.View>
              </Animated.ScrollView>
            )}
          </View>
        </GestureDetector>

        {/* ── Footer ── */}
        <Animated.View
          pointerEvents={footerVisible ? 'auto' : 'none'}
          style={[
            styles.footer,
            {
              backgroundColor: colors.footer,
              borderTopColor: colors.border,
              paddingHorizontal: contentPaddingH,
              paddingBottom: isLandscape ? Math.max(insets.bottom + 8, 8) : Math.max(insets.bottom + 16, 16),
              paddingTop: isLandscape ? 8 : 12,
              zIndex: 10,
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

        {/* Renk Seçici Modal */}
        <Modal
          visible={themeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setThemeModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setThemeModalVisible(false)}>
            <View style={[styles.themeModalCard, { backgroundColor: colors.pageBg, borderColor: colors.border }]}>
              <View style={styles.themeModalHeader}>
                <Text style={[styles.themeModalTitle, { color: colors.text }]}>
                  {t('quran.readingTheme', 'Okuma Teması')}
                </Text>
                <Pressable onPress={() => setThemeModalVisible(false)} hitSlop={12}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.themeOptionsGrid}>
                {(Object.keys(QURAN_THEMES) as QuranThemeKey[]).map((key) => {
                  const item = QURAN_THEMES[key];
                  const isSelected = key === themeKey;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.themeOptionRow,
                        { backgroundColor: item.bg, borderColor: isSelected ? item.primary : item.border },
                      ]}
                      onPress={() => {
                        changeTheme(key);
                        setThemeModalVisible(false);
                      }}
                    >
                      <View style={[styles.themeColorBadge, { backgroundColor: item.pageBg, borderColor: item.border }]}>
                        <Text style={[styles.themeBadgeSample, { color: item.text }]}>بِسْمِ</Text>
                      </View>

                      <View style={styles.themeNameContainer}>
                        <Text style={[styles.themeNameText, { color: item.text }]}>
                          {t(`quran.theme${key.charAt(0).toUpperCase() + key.slice(1)}`, i18n.language.startsWith('tr') ? item.nameTR : item.nameEN)}
                        </Text>
                      </View>

                      {isSelected && (
                        <Feather name="check-circle" size={20} color={item.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Hat / Stil Seçici Modal */}
        {styleSelectorVisible && (
          <QuranStyleSelector 
            visible={styleSelectorVisible} 
            onClose={() => setStyleSelectorVisible(false)} 
            isInitialSetup={!isStyleSelected} 
          />
        )}

        {/* Sayfa Meali Modal */}
        {pageMealVisible && (
          <PageMealModal
            visible={pageMealVisible}
            pageNo={page}
            onClose={() => setPageMealVisible(false)}
          />
        )}

        {/* Kuran Duaları Modal */}
        {prayersModalVisible && (
          <QuranPrayersModal
            visible={prayersModalVisible}
            onClose={() => setPrayersModalVisible(false)}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  mealBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  fontSizeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  themeModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  themeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  themeOptionsGrid: {
    gap: 10,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  themeColorBadge: {
    width: 48,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBadgeSample: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  themeNameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  themeNameText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
